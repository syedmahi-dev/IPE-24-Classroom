import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SEMESTER = 'Summer 2026'
const SEMESTER_START = new Date('2026-04-20T00:00:00.000Z') // Monday, April 20

// ─────────────────────────────────────────────────────────────────────────────
// Working-week Type A/B rotation system (from IUT_IPE2_Routine_Schema_v2.md)
//
// weekParity mapping (derived from getEffectiveWeekParity in API route):
//   weekParity="EVEN" → Position A (shown when group is in Position A)
//   weekParity="ODD"  → Position B (shown when group is in Position B)
//   weekParity="ALL"  → every week (theory classes)
//
// Group mapping:
//   G1 = EVEN (student IDs ending in even digit)
//   G2 = ODD  (student IDs ending in odd digit)
//
// Type A weeks (odd working weeks): G1→Position A, G2→Position B
// Type B weeks (even working weeks): G1→Position B, G2→Position A
// ─────────────────────────────────────────────────────────────────────────────

const routineData = [
  // ═══════════════════════════════════════════════════════════════════════════
  // WEEKLY THEORY CLASSES (both groups, every week)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Monday (4 theory classes) ──
  { courseCode: 'Chem 4215', courseName: 'Chemistry of Engineering Materials', dayOfWeek: 'Monday', startTime: '08:00', endTime: '09:15', room: '604(2)', teacher: 'SA', targetGroup: 'ALL', weekParity: 'ALL', isLab: false },
  { courseCode: 'Math 4211', courseName: 'PDE, Special Functions, Laplace and Fourier', dayOfWeek: 'Monday', startTime: '09:15', endTime: '10:30', room: '604(2)', teacher: 'MTM', targetGroup: 'ALL', weekParity: 'ALL', isLab: false },
  { courseCode: 'EEE 4281', courseName: 'Electrical Circuits and Machines', dayOfWeek: 'Monday', startTime: '10:30', endTime: '11:45', room: '604(2)', teacher: 'AN', targetGroup: 'ALL', weekParity: 'ALL', isLab: false },
  { courseCode: 'ME 4225', courseName: 'Material Engineering', dayOfWeek: 'Monday', startTime: '11:45', endTime: '13:00', room: '604(2)', teacher: 'MAS', targetGroup: 'ALL', weekParity: 'ALL', isLab: false },

  // ── Wednesday (3 theory classes) ──
  { courseCode: 'Math 4211', courseName: 'PDE, Special Functions, Laplace and Fourier', dayOfWeek: 'Wednesday', startTime: '09:15', endTime: '10:30', room: 'Annex', teacher: 'MTM', targetGroup: 'ALL', weekParity: 'ALL', isLab: false },
  { courseCode: 'Hum 4212', courseName: 'Arabic II', dayOfWeek: 'Wednesday', startTime: '10:30', endTime: '11:45', room: 'Annex', teacher: 'ShA', targetGroup: 'ALL', weekParity: 'ALL', isLab: false },
  { courseCode: 'ME 4225', courseName: 'Material Engineering', dayOfWeek: 'Wednesday', startTime: '11:45', endTime: '13:00', room: 'Annex', teacher: 'MAS', targetGroup: 'ALL', weekParity: 'ALL', isLab: false },

  // ── Thursday (1 double-period theory) ──
  { courseCode: 'Phy 4213', courseName: 'Waves and Oscillation, Geometrical Optics', dayOfWeek: 'Thursday', startTime: '10:30', endTime: '13:00', room: '604(2)', teacher: 'MDR', targetGroup: 'ALL', weekParity: 'ALL', isLab: false },

  // ── Friday (3 theory classes) ──
  { courseCode: 'Chem 4215', courseName: 'Chemistry of Engineering Materials', dayOfWeek: 'Friday', startTime: '08:00', endTime: '09:15', room: '101(3)', teacher: 'MSU', targetGroup: 'ALL', weekParity: 'ALL', isLab: false },
  { courseCode: 'Phy 4213', courseName: 'Waves and Oscillation, Geometrical Optics', dayOfWeek: 'Friday', startTime: '09:15', endTime: '10:30', room: '101(3)', teacher: 'AIT', targetGroup: 'ALL', weekParity: 'ALL', isLab: false },
  { courseCode: 'EEE 4281', courseName: 'Electrical Circuits and Machines', dayOfWeek: 'Friday', startTime: '10:30', endTime: '11:45', room: '101(3)', teacher: 'AN', targetGroup: 'ALL', weekParity: 'ALL', isLab: false },

  // ═══════════════════════════════════════════════════════════════════════════
  // BIWEEKLY LABS — Position A (weekParity="EVEN")
  //   G1 (EVEN) does these on Type A weeks, G2 (ODD) does these on Type B weeks
  // ═══════════════════════════════════════════════════════════════════════════

  // ME 4210 — Monday 14:30-17:00 — solo alternating (both groups, same slot)
  { courseCode: 'ME 4210', courseName: '3D Solid Modeling and Assembling', dayOfWeek: 'Monday', startTime: '14:30', endTime: '17:00', room: 'CC-2', teacher: 'HRH/SRC', targetGroup: 'ALL', weekParity: 'EVEN', isLab: true },

  // Chem 4216 — Tuesday 14:30-17:00 — paired with Phy 4214
  { courseCode: 'Chem 4216', courseName: 'Chemistry Lab', dayOfWeek: 'Tuesday', startTime: '14:30', endTime: '17:00', room: 'CL', teacher: 'JM/SH', targetGroup: 'ALL', weekParity: 'EVEN', isLab: true },

  // ME 4226 — Thursday 08:00-10:30 — paired with EEE 4282 (simultaneous, different rooms)
  { courseCode: 'ME 4226', courseName: 'Material Engineering Lab', dayOfWeek: 'Thursday', startTime: '08:00', endTime: '10:30', room: 'AL', teacher: 'MSI/MAS', targetGroup: 'ALL', weekParity: 'EVEN', isLab: true },

  // IPE 4208 — Thursday 14:30-17:00 — G1 only, fixed position (never swaps)
  { courseCode: 'IPE 4208', courseName: 'Workshop Practice II', dayOfWeek: 'Thursday', startTime: '14:30', endTime: '17:00', room: 'MS', teacher: 'TH/IK', targetGroup: 'EVEN', weekParity: 'EVEN', isLab: true },

  // IPE 4208 — Tuesday 10:30-13:00 — G2 only, fixed position (never swaps)
  { courseCode: 'IPE 4208', courseName: 'Workshop Practice II', dayOfWeek: 'Tuesday', startTime: '10:30', endTime: '13:00', room: 'MS', teacher: 'IK/TH', targetGroup: 'ODD', weekParity: 'EVEN', isLab: true },

  // ═══════════════════════════════════════════════════════════════════════════
  // BIWEEKLY LABS — Position B (weekParity="ODD")
  //   G2 (ODD) does these on Type A weeks, G1 (EVEN) does these on Type B weeks
  // ═══════════════════════════════════════════════════════════════════════════

  // Phy 4214 — Tuesday 08:00-10:30 — paired with Chem 4216
  { courseCode: 'Phy 4214', courseName: 'Physics Lab', dayOfWeek: 'Tuesday', startTime: '08:00', endTime: '10:30', room: 'PL', teacher: 'ATM/AH', targetGroup: 'ALL', weekParity: 'ODD', isLab: true },

  // EEE 4282 — Thursday 08:00-10:30 — paired with ME 4226 (simultaneous, different rooms)
  { courseCode: 'EEE 4282', courseName: 'Electrical Circuits and Machines Lab', dayOfWeek: 'Thursday', startTime: '08:00', endTime: '10:30', room: 'EL', teacher: 'JTR/TRA', targetGroup: 'ALL', weekParity: 'ODD', isLab: true },
]

async function main() {
  console.log('📅 Seeding Summer 2026 routine (Working-Week Type A/B system)...\n')

  // ── 1. Clear existing routine data ──
  const deletedRoutines = await prisma.baseRoutine.deleteMany({ where: { semester: SEMESTER } })
  console.log(`  🗑️  Cleared ${deletedRoutines.count} existing BaseRoutine entries`)

  // ── 2. Insert all BaseRoutine entries ──
  let count = 0
  for (const entry of routineData) {
    await prisma.baseRoutine.create({ data: { ...entry, semester: SEMESTER } })
    count++
  }
  console.log(`  ✅ Inserted ${count} BaseRoutine entries`)

  // ── 3. Seed initial RoutineWeek (April 20 = Working Week 1, Type A) ──
  const existingWeek = await prisma.routineWeek.findUnique({
    where: { calendarWeekStart: SEMESTER_START },
  })
  if (!existingWeek) {
    await prisma.routineWeek.create({
      data: {
        calendarWeekStart: SEMESTER_START,
        workingWeekNumber: 1,
        weekType: 'A',
        isSkipped: false,
      },
    })
    console.log(`  ✅ Seeded RoutineWeek: Apr 20 → Working Week 1 (Type A)`)
  } else {
    console.log(`  ⏭️  RoutineWeek for Apr 20 already exists (Week ${existingWeek.workingWeekNumber}, Type ${existingWeek.weekType})`)
  }

  // ── Summary ──
  console.log('')
  console.log('  ┌─────────────────────────────────────────────────────┐')
  console.log('  │  Summary                                           │')
  console.log('  ├─────────────────────────────────────────────────────┤')

  const theory = routineData.filter((r) => !r.isLab)
  const labs = routineData.filter((r) => r.isLab)
  const posA = labs.filter((r) => r.weekParity === 'EVEN')
  const posB = labs.filter((r) => r.weekParity === 'ODD')

  console.log(`  │  Theory (weekly):    ${theory.length} entries                      │`)
  console.log(`  │  Labs Position A:    ${posA.length} entries (weekParity=EVEN)      │`)
  console.log(`  │  Labs Position B:    ${posB.length} entries (weekParity=ODD)       │`)
  console.log(`  │  Total:              ${count} entries                      │`)
  console.log('  ├─────────────────────────────────────────────────────┤')
  console.log('  │  Semester start:     April 20, 2026 (Monday)       │')
  console.log('  │  Working Week 1:     Type A                        │')
  console.log('  │    G1 (EVEN) labs:   ME4210, Chem4216, ME4226, IPE4208 │')
  console.log('  │    G2 (ODD) labs:    Phy4214, EEE4282              │')
  console.log('  └─────────────────────────────────────────────────────┘')

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  console.log('')
  for (const day of days) {
    const dayEntries = routineData.filter((r) => r.dayOfWeek === day)
    const theoryCount = dayEntries.filter((r) => !r.isLab).length
    const labCount = dayEntries.filter((r) => r.isLab).length
    console.log(`    ${day.padEnd(10)} ${theoryCount} theory + ${labCount} lab = ${dayEntries.length} total`)
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
