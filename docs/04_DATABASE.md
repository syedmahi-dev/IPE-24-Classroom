# Database — IPE-24 Class Portal

## Setup

### Docker Image
Use `pgvector/pgvector:pg16` instead of plain `postgres:16` — it includes the pgvector extension pre-installed.

```yaml
# docker-compose.yml
postgres:
  image: pgvector/pgvector:pg16
  environment:
    POSTGRES_DB: ipe24_db
    POSTGRES_USER: ipe24
    POSTGRES_PASSWORD: ${DB_PASSWORD}
  volumes:
    - postgres_data:/var/lib/postgresql/data
    - ./infrastructure/postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
  restart: always
```

### Init SQL (runs once on first start)
```sql
-- infrastructure/postgres/init.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
```

---

## Prisma Schema

File: `apps/web/prisma/schema.prisma`

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [uuidOssp(map: "uuid-ossp"), vector]
}

// ─── ENUMS ───────────────────────────────────────────────────────────────────

enum Role {
  student
  admin
  super_admin
}

enum AnnouncementType {
  general
  exam
  file_update
  routine_update
  urgent
  event
}

enum FileCategory {
  lecture_notes
  assignment
  past_paper
  syllabus
  other
}

// ─── USERS ───────────────────────────────────────────────────────────────────

model User {
  id            String    @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  email         String    @unique
  name          String
  avatarUrl     String?
  role          Role      @default(student)
  studentId     String?   @unique  // e.g. 200021XXX
  phone         String?
  bio           String?
  lastLogin     DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  sessions       Session[]
  announcements  Announcement[]
  fileUploads    FileUpload[]
  votes          PollVote[]
  chatLogs       ChatLog[]
  auditLogs      AuditLog[]
  studyGroups    StudyGroupMember[]
  notifications  Notification[]
  pushTokens     PushToken[]

  @@map("users")
}

// ─── AUTH ────────────────────────────────────────────────────────────────────

model Session {
  id           String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  sessionToken String   @unique
  userId       String   @db.Uuid
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model Account {
  id                String  @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  userId            String  @db.Uuid
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@map("accounts")
}

// ─── COURSES ─────────────────────────────────────────────────────────────────

model Course {
  id          String  @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  code        String  @unique  // e.g. IPE-4101
  name        String           // e.g. Operations Research
  creditHours Float
  teacherName String?
  semester    Int              // e.g. 7 (for 4th year 1st semester)
  isActive    Boolean @default(true)
  createdAt   DateTime @default(now())

  fileUploads   FileUpload[]
  exams         Exam[]
  announcements AnnouncementCourse[]

  @@map("courses")
}

// ─── ANNOUNCEMENTS ───────────────────────────────────────────────────────────

model Announcement {
  id            String           @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  title         String
  body          String           @db.Text
  type          AnnouncementType @default(general)
  isPublished   Boolean          @default(false)
  publishedAt   DateTime?
  publishedToWa Boolean          @default(false)
  publishedToDiscord Boolean     @default(false)
  authorId      String           @db.Uuid
  author        User             @relation(fields: [authorId], references: [id])
  courses       AnnouncementCourse[]
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  @@map("announcements")
}

model AnnouncementCourse {
  announcementId String       @db.Uuid
  courseId       String       @db.Uuid
  announcement   Announcement @relation(fields: [announcementId], references: [id], onDelete: Cascade)
  course         Course       @relation(fields: [courseId], references: [id])

  @@id([announcementId, courseId])
  @@map("announcement_courses")
}

// ─── FILES ───────────────────────────────────────────────────────────────────

model FileUpload {
  id          String       @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  name        String
  driveId     String       @unique   // Google Drive file ID
  driveUrl    String                 // View URL
  downloadUrl String?                // Direct download URL
  mimeType    String
  sizeBytes   Int
  category    FileCategory @default(other)
  courseId    String?      @db.Uuid
  course      Course?      @relation(fields: [courseId], references: [id])
  uploadedById String      @db.Uuid
  uploadedBy   User        @relation(fields: [uploadedById], references: [id])
  createdAt   DateTime     @default(now())

  @@map("file_uploads")
}

// ─── EXAMS ───────────────────────────────────────────────────────────────────

model Exam {
  id          String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  title       String
  description String?
  courseId    String   @db.Uuid
  course      Course   @relation(fields: [courseId], references: [id])
  examDate    DateTime
  duration    Int?             // minutes
  room        String?
  syllabus    String?  @db.Text  // what topics are covered
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("exams")
}

// ─── POLLS ───────────────────────────────────────────────────────────────────

model Poll {
  id          String     @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  question    String
  options     Json                  // string[]
  isAnonymous Boolean    @default(true)
  isClosed    Boolean    @default(false)
  closesAt    DateTime?
  createdById String     @db.Uuid
  createdAt   DateTime   @default(now())

  votes PollVote[]

  @@map("polls")
}

model PollVote {
  id        String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  pollId    String   @db.Uuid
  poll      Poll     @relation(fields: [pollId], references: [id], onDelete: Cascade)
  userId    String   @db.Uuid
  user      User     @relation(fields: [userId], references: [id])
  optionIndex Int    // index into poll.options array
  createdAt DateTime @default(now())

  @@unique([pollId, userId])   // one vote per user per poll
  @@map("poll_votes")
}

// ─── AI KNOWLEDGE BASE ───────────────────────────────────────────────────────

model KnowledgeDocument {
  id          String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  title       String
  sourceType  String   // 'syllabus' | 'past_paper' | 'faq' | 'calendar' | 'rule'
  courseCode  String?
  content     String   @db.Text   // full raw text
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  chunks KnowledgeChunk[]

  @@map("knowledge_documents")
}

model KnowledgeChunk {
  id          String                     @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  documentId  String                     @db.Uuid
  document    KnowledgeDocument          @relation(fields: [documentId], references: [id], onDelete: Cascade)
  chunkIndex  Int
  content     String                     @db.Text
  embedding   Unsupported("vector(384)")? // 384-dim for all-MiniLM-L6-v2
  createdAt   DateTime                   @default(now())

  @@map("knowledge_chunks")
}

// ─── CHAT LOGS ───────────────────────────────────────────────────────────────

model ChatLog {
  id          String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  userId      String   @db.Uuid
  user        User     @relation(fields: [userId], references: [id])
  question    String   @db.Text
  answer      String   @db.Text
  thumbsUp    Boolean?          // null = no feedback, true = good, false = bad
  createdAt   DateTime @default(now())

  @@map("chat_logs")
}

// ─── STUDY GROUPS ────────────────────────────────────────────────────────────

model StudyGroup {
  id          String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  title       String
  courseCode  String?
  description String?
  maxMembers  Int      @default(5)
  meetTime    String?
  location    String?
  isOpen      Boolean  @default(true)
  createdAt   DateTime @default(now())

  members StudyGroupMember[]

  @@map("study_groups")
}

model StudyGroupMember {
  groupId   String     @db.Uuid
  userId    String     @db.Uuid
  group     StudyGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user      User       @relation(fields: [userId], references: [id])
  isLeader  Boolean    @default(false)
  joinedAt  DateTime   @default(now())

  @@id([groupId, userId])
  @@map("study_group_members")
}

// ─── NOTIFICATIONS ───────────────────────────────────────────────────────────

model Notification {
  id          String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  userId      String   @db.Uuid
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title       String
  body        String
  link        String?
  isRead      Boolean  @default(false)
  createdAt   DateTime @default(now())

  @@map("notifications")
}

model PushToken {
  id        String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  userId    String   @db.Uuid
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String   @unique
  createdAt DateTime @default(now())

  @@map("push_tokens")
}

// ─── AUDIT LOG ───────────────────────────────────────────────────────────────

model AuditLog {
  id         String   @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  actorId    String   @db.Uuid
  actor      User     @relation(fields: [actorId], references: [id])
  action     String
  targetType String
  targetId   String
  metadata   Json?
  createdAt  DateTime @default(now())

  @@map("audit_logs")
}
```

---

## Indexes

Add these to the schema after your initial migration for performance:

```sql
-- Fast announcement feed (newest first)
CREATE INDEX idx_announcements_published ON announcements(published_at DESC) WHERE is_published = true;

-- Fast file browser by course
CREATE INDEX idx_files_course ON file_uploads(course_id, created_at DESC);

-- Fast upcoming exams
CREATE INDEX idx_exams_date ON exams(exam_date ASC) WHERE is_active = true;

-- Fast unread notifications per user
CREATE INDEX idx_notifications_unread ON notifications(user_id, created_at DESC) WHERE is_read = false;

-- pgvector HNSW index for fast cosine similarity search
CREATE INDEX idx_chunks_embedding ON knowledge_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Audit log by actor and time
CREATE INDEX idx_audit_actor ON audit_logs(actor_id, created_at DESC);
```

---

## Migrations Workflow

```bash
# Create a new migration after editing schema.prisma
npx prisma migrate dev --name descriptive_name

# Apply migrations in production (inside Docker)
docker exec ipe24-web npx prisma migrate deploy

# Generate Prisma client after schema changes
npx prisma generate

# Open Prisma Studio (development only)
npx prisma studio
```

---

## pgvector Similarity Search Query

Used in the RAG pipeline for the AI chatbot:

```typescript
// apps/web/lib/vector-search.ts
import { prisma } from './prisma'

export async function searchKnowledge(queryEmbedding: number[], topK = 5) {
  // Raw SQL needed because Prisma doesn't natively support pgvector operators
  const results = await prisma.$queryRaw<Array<{
    id: string
    content: string
    document_id: string
    similarity: number
  }>>`
    SELECT
      kc.id,
      kc.content,
      kc.document_id,
      1 - (kc.embedding <=> ${queryEmbedding}::vector) AS similarity
    FROM knowledge_chunks kc
    WHERE kc.embedding IS NOT NULL
    ORDER BY kc.embedding <=> ${queryEmbedding}::vector
    LIMIT ${topK}
  `
  return results.filter(r => r.similarity > 0.6) // Relevance threshold
}
```

---

## Backup Strategy

Run this as a daily cron job on the server:

```bash
#!/bin/bash
# infrastructure/scripts/backup-db.sh
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/postgres"
mkdir -p $BACKUP_DIR

docker exec ipe24-postgres pg_dump -U ipe24 ipe24_db | gzip > "$BACKUP_DIR/ipe24_$TIMESTAMP.sql.gz"

# Keep only last 14 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +14 -delete

echo "Backup complete: ipe24_$TIMESTAMP.sql.gz"
```

Add to crontab:
```
0 3 * * * /home/ubuntu/ipe24/infrastructure/scripts/backup-db.sh >> /var/log/ipe24-backup.log 2>&1
```
