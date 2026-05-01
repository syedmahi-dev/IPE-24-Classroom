/**
 * Fix: Wipe all RoutineWeek records and re-seed with correct UTC-midnight timestamps.
 * Resolves timezone-duplicate records (API used local-time, seed used UTC).
 * After this fix, the API also uses setUTCHours so new weeks will match.
 * NOTE: Eid vacation will be marked by CR through the admin UI.
 *
 * Run with: npx tsx scripts/fix-eid-skip.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function recalculateWorkingWeeks() {
  const allWeeks = await prisma.routineWeek.findMany({
    orderBy: { calendarWeekStart: 'asc' },
  })

  let counter = 0
  for (const week of allWeeks) {
    if (week.isSkipped) {
      await prisma.routineWeek.update({
        where: { id: week.id },
        data: { workingWeekNumber: null, weekType: null },
      })
    } else {
      counter++
      const weekType = counter % 2 === 1 ? 'A' : 'B'
      await prisma.routineWeek.update({
        where: { id: week.id },
        data: { workingWeekNumber: counter, weekType },
      })
    }
  }

  return counter
}

async function main() {
  console.log('Fixing routine week rotation...\n')

  // Wipe ALL existing records (resolves timezone-duplicate entries)
  const deleted = await prisma.routineWeek.deleteMany({})
  console.log(`  Cleared ${deleted.count} existing RoutineWeek entries`)

  // Ensure Apr 20 = WW1 (Type A) exists
  const apr20 = new Date('2026-04-20T00:00:00.000Z')
  await prisma.routineWeek.create({ data: { calendarWeekStart: apr20, isSkipped: false, workingWeekNumber: 1, weekType: 'A' } })
  console.log('  OK Apr 20 = WW1 (Type A)')

  // Ensure Apr 27 = WW2 (Type B) exists
  const apr27 = new Date('2026-04-27T00:00:00.000Z')
  await prisma.routineWeek.create({ data: { calendarWeekStart: apr27, isSkipped: false, workingWeekNumber: 2, weekType: 'B' } })
  console.log('  OK Apr 27 = WW2 (Type B)')

  // Ensure May 4 = WW3 (Type A) — NOT skipped, CR will mark Eid when/if needed
  const may4 = new Date('2026-05-04T00:00:00.000Z')
  await prisma.routineWeek.create({ data: { calendarWeekStart: may4, isSkipped: false, workingWeekNumber: 3, weekType: 'A' } })
  console.log('  OK May 4  = WW3 (Type A)')

  // Recalculate all subsequent weeks in case more exist
  const totalWorkingWeeks = await recalculateWorkingWeeks()
  console.log(`  Recalculated: ${totalWorkingWeeks} total working weeks\n`)

  // Show the current state
  const weeks = await prisma.routineWeek.findMany({
    orderBy: { calendarWeekStart: 'asc' },
    take: 8,
  })

  console.log('  Current routine week schedule:')
  console.log('  ┌──────────────┬───────────┬───────────┬──────────────────────────────────┐')
  console.log('  │ Cal Week     │ Working # │ Type      │ Notes                            │')
  console.log('  ├──────────────┼───────────┼───────────┼──────────────────────────────────┤')
  for (const w of weeks) {
    const date = w.calendarWeekStart.toISOString().split('T')[0]
    const wn = w.workingWeekNumber !== null ? `WW${w.workingWeekNumber}` : 'SKIP'
    const type = w.weekType ?? (w.isSkipped ? 'SKIP' : '?')
    const notes = w.isSkipped
      ? (w.skippedReason ?? 'Skipped')
      : w.weekType === 'A'
      ? 'G1(EVEN): Heavy 4 labs | G2(ODD): Light 3 labs'
      : 'G1(EVEN): Light 3 labs | G2(ODD): Heavy 4 labs'
    console.log(`  │ ${date.padEnd(12)} │ ${wn.padEnd(9)} │ ${type.padEnd(9)} │ ${notes.padEnd(32)} │`)
  }
  console.log('  └──────────────┴───────────┴───────────┴──────────────────────────────────┘')
  console.log()
  console.log('  Fix complete!')
  console.log('  May 4 (WW3, Type A):')
  console.log('    G1 EVEN: Heavy lab week (ME4210, Chem4216, ME4226, IPE4208)')
  console.log('    G2 ODD:  Light lab week (Phy4214, EEE4282, IPE4208)')
  console.log()
  console.log('  CR can now mark the Eid vacation week via the admin UI.')
}

main()
  .catch((e) => {
    console.error('❌ Fix failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
