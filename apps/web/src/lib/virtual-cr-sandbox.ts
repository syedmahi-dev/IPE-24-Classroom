import { PrismaClient } from '@prisma/client'

type SandboxKnowledgeRecord = {
  sourceType: string
  sourceId: string
  title: string
  content: string
  sourceChannel?: string | null
  courseCode?: string | null
  payload?: unknown
}

export type SandboxDriveFile = {
  driveId: string
  name: string
  mimeType: string
  sizeBytes: number
  driveUrl: string
  downloadUrl?: string | null
  courseCode?: string | null
  folderId: string
  folderName?: string | null
}

let sandboxClient: PrismaClient | null = null
let sandboxDisabled = false

function getSandboxDatabaseUrl(): string | null {
  const url = process.env.VIRTUAL_CR_SANDBOX_DATABASE_URL || process.env.SANDBOX_DATABASE_URL
  if (!url || !url.trim()) return null

  // SAFETY: Never allow sandbox to point at main database
  const mainUrl = process.env.DATABASE_URL || ''
  if (mainUrl && url.trim() === mainUrl.trim()) {
    console.error('[Virtual CR Sandbox] BLOCKED: VIRTUAL_CR_SANDBOX_DATABASE_URL is same as DATABASE_URL. Refusing to use main DB as sandbox.')
    return null
  }

  return url
}

function getSandboxClient(): PrismaClient | null {
  if (sandboxDisabled) return null
  if (sandboxClient) return sandboxClient

  const url = getSandboxDatabaseUrl()
  if (!url) {
    sandboxDisabled = true
    return null
  }

  sandboxClient = new PrismaClient({
    datasources: {
      db: { url },
    },
    log: ['error'],
  })

  return sandboxClient
}

let schemaEnsured = false

async function ensureSandboxSchema(client: PrismaClient): Promise<void> {
  if (schemaEnsured) return

  await client.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS virtual_cr`)

  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS virtual_cr.virtual_cr_knowledge_items (
      id BIGSERIAL PRIMARY KEY,
      source_type VARCHAR(100) NOT NULL,
      source_id VARCHAR(191) NOT NULL,
      title VARCHAR(300) NOT NULL,
      content TEXT NOT NULL,
      source_channel VARCHAR(100),
      course_code VARCHAR(50),
      payload JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (source_type, source_id)
    )
  `)

  await client.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_virtual_cr_knowledge_source_type
      ON virtual_cr.virtual_cr_knowledge_items(source_type)
  `)

  await client.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_virtual_cr_knowledge_course_code
      ON virtual_cr.virtual_cr_knowledge_items(course_code)
  `)

  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS virtual_cr.drive_files (
      id BIGSERIAL PRIMARY KEY,
      drive_id VARCHAR(200) NOT NULL UNIQUE,
      name VARCHAR(500) NOT NULL,
      mime_type VARCHAR(200) NOT NULL,
      size_bytes BIGINT NOT NULL DEFAULT 0,
      drive_url TEXT NOT NULL,
      download_url TEXT,
      course_code VARCHAR(50),
      folder_id VARCHAR(200) NOT NULL,
      folder_name VARCHAR(300),
      first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)

  await client.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_drive_files_folder_id
      ON virtual_cr.drive_files(folder_id)
  `)

  await client.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_drive_files_course_code
      ON virtual_cr.drive_files(course_code)
  `)

  schemaEnsured = true
}

export async function upsertVirtualCrKnowledge(record: SandboxKnowledgeRecord): Promise<boolean> {
  const client = getSandboxClient()
  if (!client) return false

  try {
    await ensureSandboxSchema(client)
    await client.$executeRawUnsafe(
      `
      INSERT INTO virtual_cr.virtual_cr_knowledge_items
        (source_type, source_id, title, content, source_channel, course_code, payload, created_at, updated_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW(), NOW())
      ON CONFLICT (source_type, source_id)
      DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        source_channel = EXCLUDED.source_channel,
        course_code = EXCLUDED.course_code,
        payload = EXCLUDED.payload,
        updated_at = NOW()
      `,
      record.sourceType,
      record.sourceId,
      record.title,
      record.content,
      record.sourceChannel ?? null,
      record.courseCode ?? null,
      JSON.stringify(record.payload ?? {})
    )

    return true
  } catch (error) {
    console.error('[Virtual CR Sandbox] Upsert failed:', error)
    return false
  }
}

// ── Drive file tracking ──

export async function upsertSandboxDriveFile(file: SandboxDriveFile): Promise<boolean> {
  const client = getSandboxClient()
  if (!client) return false

  try {
    await ensureSandboxSchema(client)
    await client.$executeRawUnsafe(
      `
      INSERT INTO virtual_cr.drive_files
        (drive_id, name, mime_type, size_bytes, drive_url, download_url, course_code, folder_id, folder_name, first_seen_at, updated_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      ON CONFLICT (drive_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        mime_type = EXCLUDED.mime_type,
        size_bytes = EXCLUDED.size_bytes,
        drive_url = EXCLUDED.drive_url,
        download_url = EXCLUDED.download_url,
        course_code = EXCLUDED.course_code,
        folder_id = EXCLUDED.folder_id,
        folder_name = EXCLUDED.folder_name,
        updated_at = NOW()
      `,
      file.driveId,
      file.name,
      file.mimeType,
      file.sizeBytes,
      file.driveUrl,
      file.downloadUrl ?? null,
      file.courseCode ?? null,
      file.folderId,
      file.folderName ?? null,
    )
    return true
  } catch (error) {
    console.error('[Virtual CR Sandbox] Drive file upsert failed:', error)
    return false
  }
}

export async function getKnownDriveIds(folderId: string): Promise<Set<string>> {
  const client = getSandboxClient()
  if (!client) return new Set()

  try {
    await ensureSandboxSchema(client)
    const rows = await client.$queryRawUnsafe<{ drive_id: string }[]>(
      `SELECT drive_id FROM virtual_cr.drive_files WHERE folder_id = $1`,
      folderId,
    )
    return new Set(rows.map((r) => r.drive_id))
  } catch (error) {
    console.error('[Virtual CR Sandbox] getKnownDriveIds failed:', error)
    return new Set()
  }
}

export async function getDriveFileStats(): Promise<{
  totalFiles: number
  folders: { folderId: string; folderName: string | null; fileCount: number }[]
} | null> {
  const client = getSandboxClient()
  if (!client) return null

  try {
    await ensureSandboxSchema(client)
    const stats = await client.$queryRawUnsafe<
      { folder_id: string; folder_name: string | null; file_count: bigint }[]
    >(
      `SELECT folder_id, folder_name, COUNT(*) as file_count
       FROM virtual_cr.drive_files
       GROUP BY folder_id, folder_name
       ORDER BY file_count DESC`,
    )
    const totalFiles = stats.reduce((sum, r) => sum + Number(r.file_count), 0)
    return {
      totalFiles,
      folders: stats.map((r) => ({
        folderId: r.folder_id,
        folderName: r.folder_name,
        fileCount: Number(r.file_count),
      })),
    }
  } catch (error) {
    console.error('[Virtual CR Sandbox] getDriveFileStats failed:', error)
    return null
  }
}
