
import { PrismaClient } from '@prisma/client';

async function checkDb(url: string | undefined, label: string) {
  if (!url) {
    console.log(`${label}: URL missing`);
    return;
  }
  const prisma = new PrismaClient({
    datasources: { db: { url } },
  });
  try {
    const counts = {
      users: await prisma.user.count(),
      announcements: await prisma.announcement.count(),
      notifications: await prisma.notification.count(),
      courses: await prisma.course.count(),
      exams: await prisma.exam.count(),
      auditLogs: await prisma.auditLog.count(),
    };
    console.log(`${label} COUNTS:`, JSON.stringify(counts, null, 2));

    const lastNotifs = await prisma.notification.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, userId: true, title: true, createdAt: true }
    });
    console.log(`${label} LATEST NOTIFICATIONS:`, JSON.stringify(lastNotifs, null, 2));

    const superAdmins = await prisma.user.findMany({
      where: { role: 'super_admin' },
      select: { id: true, email: true, name: true }
    });
    console.log(`${label} SUPER ADMINS:`, JSON.stringify(superAdmins, null, 2));

  } catch (e: any) {
    console.error(`${label} CHECK_ERROR:`, e.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await checkDb(process.env.DATABASE_URL, 'MAIN_DB');
}

main().catch(console.error);
