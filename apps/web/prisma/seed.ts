import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Seed courses (placeholder — update with actual IPE-24 courses)
  const courses = [
    { code: 'IPE-4101', name: 'Manufacturing Processes I', creditHours: 3, semester: 7 },
    { code: 'IPE-4103', name: 'Operations Research', creditHours: 3, semester: 7 },
    { code: 'IPE-4105', name: 'Industrial Management', creditHours: 3, semester: 7 },
    { code: 'IPE-4107', name: 'Quality Engineering', creditHours: 3, semester: 7 },
    { code: 'IPE-4109', name: 'Ergonomics & Work Design', creditHours: 3, semester: 7 },
    { code: 'IPE-4111', name: 'Manufacturing Lab', creditHours: 1.5, semester: 7 },
    { code: 'IPE-4113', name: 'Simulation Lab', creditHours: 1.5, semester: 7 },
  ]

  for (const course of courses) {
    await prisma.course.upsert({
      where: { code: course.code },
      create: course,
      update: course,
    })
    console.log(`  ✓ ${course.code} — ${course.name}`)
  }

  console.log(`\n✅ Seeded ${courses.length} courses`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
