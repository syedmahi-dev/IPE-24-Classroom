/**
 * Seed script: Populates BaseRoutine with IPE-24 2nd Semester schedule
 * from IUT_IPE2_Routine_Schema_v2.md
 *
 * Run: npx tsx apps/web/scripts/seed-routine.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

type RoutineEntry = {
  courseCode: string
  courseName: string
  dayOfWeek: string
  startTime: string
  endTime: string
  room: string
  teacher: string
  targetGroup: 'ALL' | 'ODD' | 'EVEN'
  weekParity: 'ALL' | 'ODD' | 'EVEN'
  isLab: boolean
  semester: string
}

const SEMESTER = 'Summer 2026'

// ── Theory classes (every week, both groups) ─────────────

const theoryClasses: RoutineEntry[] = [
  // Monday
  { courseCode: 'Chem 4215', courseName: 'Chemistry of Engineering Materials', dayOfWeek: 'Monday', startTime: '08:00', endTime: '09:15', room: '604(2)', teacher: 'Dr. Md. Sofiul Alom', targetGroup: 'ALL', weekParity: 'ALL', isLab: false, semester: SEMESTER },
  { courseCode: 'Math 4211', courseName: 'PDE, Special Functions, Laplace & Fourier', dayOfWeek: 'Monday', startTime: '09:15', endTime: '10:30', room: '604(2)', teacher: 'Dr. Md. Tusher Mollah', targetGroup: 'ALL', weekParity: 'ALL', isLab: false, semester: SEMESTER },
  { courseCode: 'EEE 4281', courseName: 'Electrical Circuits and Machines', dayOfWeek: 'Monday', startTime: '10:30', endTime: '11:45', room: '604(2)', teacher: 'Mr. Asif Newaz', targetGroup: 'ALL', weekParity: 'ALL', isLab: false, semester: SEMESTER },
  { courseCode: 'ME 4225', courseName: 'Material Engineering', dayOfWeek: 'Monday', startTime: '11:45', endTime: '13:00', room: '604(2)', teacher: 'Dr. Md. Abu Shakid Sujon', targetGroup: 'ALL', weekParity: 'ALL', isLab: false, semester: SEMESTER },

  // Wednesday
  { courseCode: 'Math 4211', courseName: 'PDE, Special Functions, Laplace & Fourier', dayOfWeek: 'Wednesday', startTime: '09:15', endTime: '10:30', room: 'Annex', teacher: 'Dr. Md. Tusher Mollah', targetGroup: 'ALL', weekParity: 'ALL', isLab: false, semester: SEMESTER },
  { courseCode: 'Hum 4212', courseName: 'Humanities (Arabic II)', dayOfWeek: 'Wednesday', startTime: '10:30', endTime: '11:45', room: 'Annex', teacher: 'Mr. Shabbir Ahmed', targetGroup: 'ALL', weekParity: 'ALL', isLab: false, semester: SEMESTER },
  { courseCode: 'ME 4225', courseName: 'Material Engineering', dayOfWeek: 'Wednesday', startTime: '11:45', endTime: '13:00', room: 'Annex', teacher: 'Dr. Md. Abu Shakid Sujon', targetGroup: 'ALL', weekParity: 'ALL', isLab: false, semester: SEMESTER },

  // Thursday — Theory
  { courseCode: 'Phy 4213', courseName: 'Physics (Waves & Oscillation, Geometrical Optics)', dayOfWeek: 'Thursday', startTime: '10:30', endTime: '13:00', room: '604(2)', teacher: 'Dr. Md. Dalitur Rahman', targetGroup: 'ALL', weekParity: 'ALL', isLab: false, semester: SEMESTER },

  // Friday
  { courseCode: 'Chem 4215', courseName: 'Chemistry of Engineering Materials', dayOfWeek: 'Friday', startTime: '08:00', endTime: '09:15', room: '101(3)', teacher: 'Dr. Mohammad Shahid Ullah', targetGroup: 'ALL', weekParity: 'ALL', isLab: false, semester: SEMESTER },
  { courseCode: 'Phy 4213', courseName: 'Physics (Waves & Oscillation, Geometrical Optics)', dayOfWeek: 'Friday', startTime: '09:15', endTime: '10:30', room: '101(3)', teacher: 'Prof. Dr. Aminul I. Talukder', targetGroup: 'ALL', weekParity: 'ALL', isLab: false, semester: SEMESTER },
  { courseCode: 'EEE 4281', courseName: 'Electrical Circuits and Machines', dayOfWeek: 'Friday', startTime: '10:30', endTime: '11:45', room: '101(3)', teacher: 'Mr. Asif Newaz', targetGroup: 'ALL', weekParity: 'ALL', isLab: false, semester: SEMESTER },
]

// ── Lab classes (biweekly, group-specific) ───────────────
// weekParity EVEN = Position A (shown on Type A weeks for EVEN group)
// weekParity ODD  = Position B (shown on Type B weeks for EVEN group)

const labClasses: RoutineEntry[] = [
  // Monday 5–6: ME 4210 — solo lab, alternates G1(A)/G2(B)
  { courseCode: 'ME 4210', courseName: '3D Solid Modeling and Assembling', dayOfWeek: 'Monday', startTime: '14:30', endTime: '17:00', room: 'CC-2', teacher: 'Mr. Hasdibur Rahman Hamim / Mr. Sazidur Rahman Chowdhury', targetGroup: 'EVEN', weekParity: 'EVEN', isLab: true, semester: SEMESTER },
  { courseCode: 'ME 4210', courseName: '3D Solid Modeling and Assembling', dayOfWeek: 'Monday', startTime: '14:30', endTime: '17:00', room: 'CC-2', teacher: 'Mr. Hasdibur Rahman Hamim / Mr. Sazidur Rahman Chowdhury', targetGroup: 'ODD', weekParity: 'ODD', isLab: true, semester: SEMESTER },

  // Tuesday Slot 2: Phy 4214 — Position B (G2 on Type A, G1 on Type B)
  { courseCode: 'Phy 4214', courseName: 'Physics Lab', dayOfWeek: 'Tuesday', startTime: '09:15', endTime: '10:30', room: 'PL', teacher: 'Prof. Dr. A T Md. Kaosar Jamil / Prof. Dr. A. K. M. Akhter Hossain', targetGroup: 'ODD', weekParity: 'ODD', isLab: true, semester: SEMESTER },
  { courseCode: 'Phy 4214', courseName: 'Physics Lab', dayOfWeek: 'Tuesday', startTime: '09:15', endTime: '10:30', room: 'PL', teacher: 'Prof. Dr. A T Md. Kaosar Jamil / Prof. Dr. A. K. M. Akhter Hossain', targetGroup: 'EVEN', weekParity: 'ODD', isLab: true, semester: SEMESTER },

  // Tuesday Slots 3–4: IPE 4208 — fixed position, G2 only (Type B weeks)
  { courseCode: 'IPE 4208', courseName: 'Workshop Practice II (Machine Shop)', dayOfWeek: 'Tuesday', startTime: '10:30', endTime: '13:00', room: 'MS', teacher: 'Mr. Immul Kayas / Mr. Tanvir Hossain', targetGroup: 'ODD', weekParity: 'ODD', isLab: true, semester: SEMESTER },

  // Tuesday Slots 5–6: Chem 4216 — Position A (G1 on Type A, G2 on Type B)
  { courseCode: 'Chem 4216', courseName: 'Chemistry Lab', dayOfWeek: 'Tuesday', startTime: '14:30', endTime: '17:00', room: 'CL', teacher: 'Dr. Md. Jalil Miah / Mr. Md. Shahabuddin', targetGroup: 'EVEN', weekParity: 'EVEN', isLab: true, semester: SEMESTER },
  { courseCode: 'Chem 4216', courseName: 'Chemistry Lab', dayOfWeek: 'Tuesday', startTime: '14:30', endTime: '17:00', room: 'CL', teacher: 'Dr. Md. Jalil Miah / Mr. Md. Shahabuddin', targetGroup: 'ODD', weekParity: 'EVEN', isLab: true, semester: SEMESTER },

  // Thursday Slots 1–2: ME 4226 — Position A (G1 on Type A, G2 on Type B)
  { courseCode: 'ME 4226', courseName: 'Material Engineering Lab', dayOfWeek: 'Thursday', startTime: '08:00', endTime: '10:30', room: 'AL', teacher: 'Dr. Md. Saiful Islam / Dr. Md. Abu Shakid Sujon', targetGroup: 'EVEN', weekParity: 'EVEN', isLab: true, semester: SEMESTER },
  { courseCode: 'ME 4226', courseName: 'Material Engineering Lab', dayOfWeek: 'Thursday', startTime: '08:00', endTime: '10:30', room: 'AL', teacher: 'Dr. Md. Saiful Islam / Dr. Md. Abu Shakid Sujon', targetGroup: 'ODD', weekParity: 'EVEN', isLab: true, semester: SEMESTER },

  // Thursday Slots 1–2: EEE 4282 — Position B (G2 on Type A, G1 on Type B)
  { courseCode: 'EEE 4282', courseName: 'Electrical Circuits & Machines Lab', dayOfWeek: 'Thursday', startTime: '08:00', endTime: '10:30', room: 'EL', teacher: 'Ms. Jasim Tasnim Rahman / Ms. Tabassum Rahman Aishy', targetGroup: 'ODD', weekParity: 'ODD', isLab: true, semester: SEMESTER },
  { courseCode: 'EEE 4282', courseName: 'Electrical Circuits & Machines Lab', dayOfWeek: 'Thursday', startTime: '08:00', endTime: '10:30', room: 'EL', teacher: 'Ms. Jasim Tasnim Rahman / Ms. Tabassum Rahman Aishy', targetGroup: 'EVEN', weekParity: 'ODD', isLab: true, semester: SEMESTER },

  // Thursday Slots 5–6: IPE 4208 — fixed position, G1 only (Type A weeks)
  { courseCode: 'IPE 4208', courseName: 'Workshop Practice II (Machine Shop)', dayOfWeek: 'Thursday', startTime: '14:30', endTime: '17:00', room: 'MS', teacher: 'Mr. Tanvir Hossain / Mr. Immul Kayas', targetGroup: 'EVEN', weekParity: 'EVEN', isLab: true, semester: SEMESTER },
]

async function main() {
  console.log('🗑️  Clearing existing BaseRoutine entries...')
  await prisma.baseRoutine.deleteMany({})

  console.log('📚 Seeding theory classes...')
  for (const entry of theoryClasses) {
    await prisma.baseRoutine.create({ data: entry })
  }
  console.log(`   ✅ ${theoryClasses.length} theory entries created`)

  console.log('🧪 Seeding lab classes...')
  for (const entry of labClasses) {
    await prisma.baseRoutine.create({ data: entry })
  }
  console.log(`   ✅ ${labClasses.length} lab entries created`)

  // Seed initial RoutineWeek for current week
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(monday.getDate() - day + (day === 0 ? -6 : 1))
  monday.setHours(0, 0, 0, 0)

  console.log('📅 Seeding initial RoutineWeek...')
  await prisma.routineWeek.upsert({
    where: { calendarWeekStart: monday },
    update: {},
    create: {
      calendarWeekStart: monday,
      workingWeekNumber: 1,
      weekType: 'A',
      isSkipped: false,
    },
  })
  console.log(`   ✅ Working Week 1 (Type A) set for ${monday.toISOString().split('T')[0]}`)

  console.log('\n🎉 Routine seeding complete!')
  console.log(`   Total entries: ${theoryClasses.length + labClasses.length}`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
