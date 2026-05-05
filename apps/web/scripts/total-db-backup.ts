
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const prisma = new PrismaClient();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(process.cwd(), 'backups', 'db', timestamp);

  console.log(`🚀 Starting total database backup to: ${backupDir}`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const tables = [
    'user',
    'session',
    'account',
    'course',
    'announcement',
    'announcementCourse',
    'fileUpload',
    'exam',
    'assignmentSubmission',
    'poll',
    'pollVote',
    'knowledgeDocument',
    'knowledgeChunk',
    'chatLog',
    'studyGroup',
    'studyGroupMember',
    'notification',
    'pushToken',
    'auditLog',
    'systemConfig',
    'baseRoutine',
    'routineOverride',
    'routineWeek',
    'connectedDrive',
    'botChannelConfig'
  ];

  for (const table of tables) {
    try {
      console.log(`📦 Backing up table: ${table}...`);
      // @ts-ignore
      const data = await prisma[table].findMany();
      const filePath = path.join(backupDir, `${table}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`✅ Table ${table} backed up (${data.length} records).`);
    } catch (err) {
      console.error(`❌ Failed to backup table ${table}:`, err);
    }
  }

  console.log('✨ Database backup complete!');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('💥 Fatal error during backup:', e);
  process.exit(1);
});
