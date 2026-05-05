import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('📅 Fixing Routine Weeks for Summer 2026...')

  // Delete all existing weeks to start fresh
  await prisma.routineWeek.deleteMany({})
  console.log('🗑️  Cleared existing routine weeks.')

  const weeks = [
    {
      calendarWeekStart: new Date('2026-04-20T00:00:00Z'),
      workingWeekNumber: 1,
      weekType: 'A',
    },
    {
      calendarWeekStart: new Date('2026-04-27T00:00:00Z'),
      workingWeekNumber: 2,
      weekType: 'B',
    },
    {
      calendarWeekStart: new Date('2026-05-04T00:00:00Z'),
      workingWeekNumber: 3,
      weekType: 'A',
    },
    {
      calendarWeekStart: new Date('2026-05-11T00:00:00Z'),
      workingWeekNumber: 4,
      weekType: 'B',
    },
    {
      calendarWeekStart: new Date('2026-05-18T00:00:00Z'),
      workingWeekNumber: 5,
      weekType: 'A',
    },
    {
      calendarWeekStart: new Date('2026-05-25T00:00:00Z'),
      workingWeekNumber: 6,
      weekType: 'B',
    },
  ]

  for (const week of weeks) {
    await prisma.routineWeek.create({
      data: {
        calendarWeekStart: week.calendarWeekStart,
        workingWeekNumber: week.workingWeekNumber,
        weekType: week.weekType,
        isSkipped: false,
      },
    })
    console.log(`✅ Seeded Week ${week.workingWeekNumber}: ${week.calendarWeekStart.toISOString().split('T')[0]} (Type ${week.weekType})`)
  }

  console.log('\n✨ Routine weeks updated. Today (May 4) is Week 3 (Type A).')
  console.log('Parity Logic Reminder:')
  console.log('- Type A: Even students (G1) -> Heavy labs (Pos A), Odd students (G2) -> Light labs (Pos B)')
  console.log('- Type B: Even students (G1) -> Light labs (Pos B), Odd students (G2) -> Heavy labs (Pos A)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
