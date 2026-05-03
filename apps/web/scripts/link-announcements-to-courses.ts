import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Discord channel ID → course code mapping
const CHANNEL_TO_COURSE: Record<string, string> = {
  '1495796581780160574': 'MATH4211',
  '1495877347558035558': 'HUM4212',
  '1495874001874980925': 'PHY4213',
  '1495874227369279768': 'CHEM4215',
  '1495874340992979035': 'ME4225',
  '1495826110309466303': 'EEE4281',
  '1495879542018015503': 'IPE4208',
  '1495877858617458748': 'ME4210',
  '1495879439580397771': 'PHY4214',
  '1495879322093752510': 'CHEM4216',
  '1495879236198727721': 'ME4226',
  '1495093950644752424': 'EEE4282',
};

async function main() {
  // Get all courses
  const courses = await prisma.course.findMany();
  const courseByCode = new Map(courses.map(c => [c.code, c.id]));

  // Get unlinked course_update announcements
  const unlinked = await prisma.announcement.findMany({
    where: {
      type: 'course_update',
      courses: { none: {} },
    },
    select: { id: true, body: true, title: true },
  });

  console.log(`Found ${unlinked.length} unlinked course_update announcements`);

  let linked = 0;
  for (const ann of unlinked) {
    // Extract channel ID from Discord URL in body
    const match = ann.body?.match(/discord\.com\/channels\/\d+\/(\d+)\/\d+/);
    const channelId = match?.[1];
    const courseCode = channelId ? CHANNEL_TO_COURSE[channelId] : null;
    const courseId = courseCode ? courseByCode.get(courseCode) : null;

    if (courseId) {
      await prisma.announcementCourse.create({
        data: { announcementId: ann.id, courseId },
      });
      linked++;
      console.log(`  ✅ Linked: "${ann.title?.slice(0, 50)}" → ${courseCode}`);
    }
  }

  console.log(`\nDone: ${linked} linked, ${unlinked.length - linked} still unlinked`);
  await prisma.$disconnect();
}

main().catch(console.error);
