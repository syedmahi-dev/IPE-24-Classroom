import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // 1. Seed CR (Super Admin)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'cr@iut-dhaka.edu' },
    update: {},
    create: {
      email: 'cr@iut-dhaka.edu',
      name: 'Class Representative',
      role: 'super_admin',
      studentId: '210041001',
    },
  })
  console.log(`  ✓ CR Created: ${superAdmin.email}`)

  // 2. Seed Courses
  const courses = [
    { code: 'IPE-4701', name: 'Manufacturing Processes I', creditHours: 3, semester: 7 },
    { code: 'IPE-4703', name: 'Operations Research', creditHours: 3, semester: 7 },
    { code: 'IPE-4705', name: 'Industrial Management', creditHours: 3, semester: 7 },
    { code: 'IPE-4707', name: 'Quality Engineering', creditHours: 3, semester: 7 },
    { code: 'IPE-4709', name: 'Ergonomics & Work Design', creditHours: 3, semester: 7 },
  ]

  const courseRecords = []
  for (const course of courses) {
    const record = await prisma.course.upsert({
      where: { code: course.code },
      update: course,
      create: course,
    })
    courseRecords.push(record)
    console.log(`  ✓ Course: ${course.code}`)
  }

  // 3. Seed Exams
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const nextWeek = new Date()
  nextWeek.setDate(nextWeek.getDate() + 7)

  const exams = [
    {
      title: 'Mid Semester Exam',
      courseId: courseRecords[0].id,
      examDate: tomorrow,
      room: 'Room 301, IPE Building',
      syllabus: 'Chapters 1-4',
    },
    {
      title: 'Quiz 2',
      courseId: courseRecords[1].id,
      examDate: nextWeek,
      room: 'Room 302, Library Building',
      syllabus: 'Linear Programming & Simplex',
    },
  ]

  for (const exam of exams) {
    await prisma.exam.create({ data: exam })
  }
  console.log(`  ✓ Seeded ${exams.length} exams`)

  // 4. Seed Polls
  const polls = [
    {
      question: 'When should we have the extra class for Operations Research?',
      options: JSON.stringify(['Monday 2:00 PM', 'Tuesday 4:30 PM', 'Wednesday 8:00 AM']),
      createdById: superAdmin.id,
      closesAt: nextWeek,
    },
    {
      question: 'Preferred location for the Industrial Visit?',
      options: JSON.stringify(['Gazipur Industrial Area', 'Narayanganj BSCIC', 'Savar EPZ']),
      createdById: superAdmin.id,
    }
  ]

  for (const poll of polls) {
    await prisma.poll.create({ data: poll })
  }
  console.log(`  ✓ Seeded ${polls.length} polls`)

  // 5. Seed Files
  const files = [
    {
      name: 'Manufacturing Processes Lecture 1.pdf',
      driveId: 'mock-id-1',
      driveUrl: 'https://drive.google.com/file/d/mock-id-1',
      mimeType: 'application/pdf',
      sizeBytes: 2048576,
      category: 'lecture_notes',
      courseId: courseRecords[0].id,
      uploadedById: superAdmin.id,
    },
    {
      name: 'Operations Research Formula Sheet.pdf',
      driveId: 'mock-id-2',
      driveUrl: 'https://drive.google.com/file/d/mock-id-2',
      mimeType: 'application/pdf',
      sizeBytes: 1024000,
      category: 'resource',
      courseId: courseRecords[1].id,
      uploadedById: superAdmin.id,
    }
  ]

  for (const file of files) {
    await prisma.fileUpload.create({ data: file })
  }
  console.log(`  ✓ Seeded ${files.length} resource files`)

  console.log('\n✅ Database Seeding Complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
