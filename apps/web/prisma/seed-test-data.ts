// Script to create a test user and session for local testing
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Creating test user and session...\n')

  // Create a test student user
  const student = await prisma.user.upsert({
    where: { email: 'student@iut-dhaka.edu' },
    update: {},
    create: {
      email: 'student@iut-dhaka.edu',
      name: 'Test Student',
      role: 'student',
      studentId: 'IPE-24-001',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=student',
      phone: '+88017XXXXXXXX',
      bio: 'A test student for IPE-24 class',
    },
  })

  console.log(`✅ Student created: ${student.email}`)

  // Create a test admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@iut-dhaka.edu' },
    update: {},
    create: {
      email: 'admin@iut-dhaka.edu',
      name: 'Class Representative',
      role: 'super_admin',
      studentId: 'IPE-24-CR',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
      phone: '+88018XXXXXXXX',
      bio: 'CR for IPE-24 batch',
    },
  })

  console.log(`✅ Admin created: ${admin.email}`)

  // Create test announcements
  const announcement1 = await prisma.announcement.create({
    data: {
      title: 'Welcome to IPE-24 Class Portal',
      body: 'This is a modern class management platform for the IPE-24 batch. You can access announcements, class routine, resources, exams, and more from here.',
      type: 'general',
      isPublished: true,
      publishedAt: new Date(),
      authorId: admin.id,
    },
  })

  const announcement2 = await prisma.announcement.create({
    data: {
      title: 'Midterm Exam Schedule Released',
      body: 'Check the Exams section for the detailed midterm exam schedule. Exams start next week. Make sure to review your notes!',
      type: 'exam',
      isPublished: true,
      publishedAt: new Date(),
      authorId: admin.id,
    },
  })

  console.log(`✅ Announcements created (2 samples)`)

  // Create test exams
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  const courses = await prisma.course.findMany({ take: 3 })

  for (let i = 0; i < courses.length; i++) {
    const examDate = new Date(nextWeek)
    examDate.setDate(examDate.getDate() + i)

    await prisma.exam.create({
      data: {
        title: `${courses[i].code} - Midterm Exam`,
        description: `Midterm examination for ${courses[i].name}`,
        courseId: courses[i].id,
        examDate,
        duration: 120,
        room: `Room ${300 + i}`,
        syllabus: `Topics covered: All chapters from 1-5`,
        isActive: true,
      },
    })
  }

  console.log(`✅ Exams created (${courses.length} samples)`)

  // Create test polls
  const poll = await prisma.poll.create({
    data: {
      question: 'What is your preferred lab session time?',
      options: JSON.stringify(['9:00 AM - 11:00 AM', '11:00 AM - 1:00 PM', '1:00 PM - 3:00 PM', '3:00 PM - 5:00 PM']),
      isAnonymous: true,
      isClosed: false,
      createdById: admin.id,
    },
  })

  console.log(`✅ Poll created`)

  // Create test study group
  const studyGroup = await prisma.studyGroup.create({
    data: {
      title: 'Operations Research Study Group',
      courseCode: 'IPE-4103',
      description: 'Collaborative study group for Operations Research. We meet every Tuesday and Thursday.',
      maxMembers: 6,
      meetTime: 'Tuesday & Thursday, 7 PM',
      location: 'Central Library, Study Room 3',
      isOpen: true,
    },
  })

  console.log(`✅ Study group created`)

  console.log('\n✨ Test data created successfully!\n')
  console.log('📧 Login with: student@iut-dhaka.edu (or admin@iut-dhaka.edu)')
  console.log('🌐 Visit: http://localhost:3000\n')
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
