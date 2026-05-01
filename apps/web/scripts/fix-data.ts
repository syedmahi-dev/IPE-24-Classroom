const { PrismaClient, Role, FileCategory } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  console.log('--- RESTORING USERS ---')
  const passwordHash = await bcrypt.hash('password123', 10)
  
  const testUsers = [
    { email: 'student@test.com', name: 'Test Student', role: Role.student, studentId: '123456789' },
    { email: 'admin@test.com', name: 'Test Admin (CR)', role: Role.admin, studentId: '987654321' },
    { email: 'superadmin@test.com', name: 'Test Super Admin', role: Role.super_admin, studentId: '000000000' },
    { email: 'student@iut-dhaka.edu', name: 'IUT Student', role: Role.student, studentId: '111111111' },
    { email: 'admin@iut-dhaka.edu', name: 'IUT Admin', role: Role.super_admin, studentId: '222222222' }
  ]

  for (const user of testUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { passwordHash, role: user.role },
      create: { ...user, passwordHash },
    })
    console.log(`✅ Restored User: ${user.email}`)
  }

  console.log('\n--- RESTORING 12 COURSES FROM ROUTINE ---')
  const courses = [
    { code: 'Chem 4215', name: 'Chemistry of Engineering Materials', creditHours: 3, semester: 2 },
    { code: 'Math 4211', name: 'PDE, Special Functions, Laplace and Fourier', creditHours: 3, semester: 2 },
    { code: 'EEE 4281', name: 'Electrical Circuits and Machines', creditHours: 3, semester: 2 },
    { code: 'ME 4225', name: 'Material Engineering', creditHours: 3, semester: 2 },
    { code: 'Hum 4212', name: 'Arabic II', creditHours: 2, semester: 2 },
    { code: 'Phy 4213', name: 'Waves and Oscillation, Geometrical Optics', creditHours: 3, semester: 2 },
    { code: 'ME 4210', name: '3D Solid Modeling and Assembling', creditHours: 1.5, semester: 2 },
    { code: 'Chem 4216', name: 'Chemistry Lab', creditHours: 1.5, semester: 2 },
    { code: 'ME 4226', name: 'Material Engineering Lab', creditHours: 1.5, semester: 2 },
    { code: 'IPE 4208', name: 'Workshop Practice II', creditHours: 1.5, semester: 2 },
    { code: 'Phy 4214', name: 'Physics Lab', creditHours: 1.5, semester: 2 },
    { code: 'EEE 4282', name: 'Electrical Circuits and Machines Lab', creditHours: 1.5, semester: 2 }
  ]

  for (const course of courses) {
    await prisma.course.upsert({
      where: { code: course.code },
      update: { name: course.name, creditHours: course.creditHours, semester: course.semester },
      create: course,
    })
    console.log(`✅ Restored Course: ${course.code} - ${course.name}`)
  }

  console.log('\n--- RESTORING BASE ROUTINES ---')
  console.log('Please run `npx tsx prisma/seed-routine.ts` next to ensure routines are intact.')

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
