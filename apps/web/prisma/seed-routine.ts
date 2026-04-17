import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SEMESTER = 'Summer 2026'

const routineData = [
  // ===== MONDAY =====
  {
    courseCode: 'Chem 4215',
    courseName: 'Chemistry of Engineering Materials',
    dayOfWeek: 'Monday',
    startTime: '08:00',
    endTime: '09:15',
    room: '604(2)',
    teacher: 'SA',
    targetGroup: 'ALL',
    weekParity: 'ALL',
    isLab: false,
  },
  {
    courseCode: 'Math 4211',
    courseName: 'PDE, Special Functions, Laplace and Fourier',
    dayOfWeek: 'Monday',
    startTime: '09:15',
    endTime: '10:30',
    room: '604(2)',
    teacher: 'MTM',
    targetGroup: 'ALL',
    weekParity: 'ALL',
    isLab: false,
  },
  {
    courseCode: 'EEE 4281',
    courseName: 'Electrical Circuits and Machines',
    dayOfWeek: 'Monday',
    startTime: '10:30',
    endTime: '11:45',
    room: '604(2)',
    teacher: 'AN',
    targetGroup: 'ALL',
    weekParity: 'ALL',
    isLab: false,
  },
  {
    courseCode: 'ME 4225',
    courseName: 'Material Engineering',
    dayOfWeek: 'Monday',
    startTime: '11:45',
    endTime: '13:00',
    room: '604(2)',
    teacher: 'MAS',
    targetGroup: 'ALL',
    weekParity: 'ALL',
    isLab: false,
  },
  {
    courseCode: 'ME 4210',
    courseName: '3D Solid Modeling and Assembling',
    dayOfWeek: 'Monday',
    startTime: '14:30',
    endTime: '17:00',
    room: 'CC-2',
    teacher: 'HRH/SRC',
    targetGroup: 'ALL',
    weekParity: 'ALL',
    isLab: true,
  },

  // ===== TUESDAY =====
  {
    courseCode: 'Phy 4214',
    courseName: 'Physics Lab',
    dayOfWeek: 'Tuesday',
    startTime: '08:00',
    endTime: '10:30',
    room: 'PL',
    teacher: 'ATM/AH',
    targetGroup: 'ALL',
    weekParity: 'ALL',
    isLab: true,
  },
  {
    courseCode: 'IPE 4208',
    courseName: 'Workshop Practice II',
    dayOfWeek: 'Tuesday',
    startTime: '10:30',
    endTime: '13:00',
    room: 'MS',
    teacher: 'IK/TH',
    targetGroup: 'ALL',
    weekParity: 'ALL',
    isLab: true,
  },
  {
    courseCode: 'Chem 4216',
    courseName: 'Chemistry Lab',
    dayOfWeek: 'Tuesday',
    startTime: '14:30',
    endTime: '17:00',
    room: 'CL',
    teacher: 'JM/SH',
    targetGroup: 'ALL',
    weekParity: 'ALL',
    isLab: true,
  },

  // ===== WEDNESDAY =====
  {
    courseCode: 'Math 4211',
    courseName: 'PDE, Special Functions, Laplace and Fourier',
    dayOfWeek: 'Wednesday',
    startTime: '08:00',
    endTime: '10:30',
    room: 'Annex',
    teacher: 'MTM',
    targetGroup: 'ALL',
    weekParity: 'ALL',
    isLab: false,
  },
  {
    courseCode: 'Hum 4212',
    courseName: 'Arabic II',
    dayOfWeek: 'Wednesday',
    startTime: '10:30',
    endTime: '11:45',
    room: 'Annex',
    teacher: 'ShA',
    targetGroup: 'ALL',
    weekParity: 'ALL',
    isLab: false,
  },
  {
    courseCode: 'ME 4225',
    courseName: 'Material Engineering',
    dayOfWeek: 'Wednesday',
    startTime: '11:45',
    endTime: '13:00',
    room: 'Annex',
    teacher: 'MAS',
    targetGroup: 'ALL',
    weekParity: 'ALL',
    isLab: false,
  },
  {
    courseCode: 'Chem 4216',
    courseName: 'Chemistry Lab',
    dayOfWeek: 'Wednesday',
    startTime: '15:45',
    endTime: '17:00',
    room: 'CL',
    teacher: 'JM/SH',
    targetGroup: 'ALL',
    weekParity: 'ALL',
    isLab: true,
  },

  // ===== THURSDAY =====
  // Lab rotation: ODD group gets ME 4226 first, then EEE 4282
  {
    courseCode: 'ME 4226',
    courseName: 'Material Engineering Lab',
    dayOfWeek: 'Thursday',
    startTime: '08:00',
    endTime: '09:15',
    room: 'AL',
    teacher: 'MSI/MAS',
    targetGroup: 'ODD',
    weekParity: 'ALL',
    isLab: true,
  },
  {
    courseCode: 'EEE 4282',
    courseName: 'Electrical Circuits and Machines Lab',
    dayOfWeek: 'Thursday',
    startTime: '09:15',
    endTime: '10:30',
    room: 'EL',
    teacher: 'JTR/TRA',
    targetGroup: 'ODD',
    weekParity: 'ALL',
    isLab: true,
  },
  // Lab rotation: EVEN group gets EEE 4282 first, then ME 4226
  {
    courseCode: 'EEE 4282',
    courseName: 'Electrical Circuits and Machines Lab',
    dayOfWeek: 'Thursday',
    startTime: '08:00',
    endTime: '09:15',
    room: 'EL',
    teacher: 'JTR/TRA',
    targetGroup: 'EVEN',
    weekParity: 'ALL',
    isLab: true,
  },
  {
    courseCode: 'ME 4226',
    courseName: 'Material Engineering Lab',
    dayOfWeek: 'Thursday',
    startTime: '09:15',
    endTime: '10:30',
    room: 'AL',
    teacher: 'MSI/MAS',
    targetGroup: 'EVEN',
    weekParity: 'ALL',
    isLab: true,
  },
  {
    courseCode: 'Phy 4213',
    courseName: 'Waves and Oscillation, Geometrical Optics',
    dayOfWeek: 'Thursday',
    startTime: '10:30',
    endTime: '11:45',
    room: '604(2)',
    teacher: 'MDR',
    targetGroup: 'ALL',
    weekParity: 'ALL',
    isLab: false,
  },
  {
    courseCode: 'IPE 4208',
    courseName: 'Workshop Practice II',
    dayOfWeek: 'Thursday',
    startTime: '14:30',
    endTime: '17:00',
    room: 'MS',
    teacher: 'TH/IK',
    targetGroup: 'ALL',
    weekParity: 'ALL',
    isLab: true,
  },

  // ===== FRIDAY =====
  {
    courseCode: 'Chem 4215',
    courseName: 'Chemistry of Engineering Materials',
    dayOfWeek: 'Friday',
    startTime: '08:00',
    endTime: '09:15',
    room: '101(3)',
    teacher: 'MSU',
    targetGroup: 'ALL',
    weekParity: 'ALL',
    isLab: false,
  },
  {
    courseCode: 'Phy 4213',
    courseName: 'Waves and Oscillation, Geometrical Optics',
    dayOfWeek: 'Friday',
    startTime: '09:15',
    endTime: '10:30',
    room: '101(3)',
    teacher: 'AIT',
    targetGroup: 'ALL',
    weekParity: 'ALL',
    isLab: false,
  },
  {
    courseCode: 'EEE 4281',
    courseName: 'Electrical Circuits and Machines',
    dayOfWeek: 'Friday',
    startTime: '10:30',
    endTime: '11:45',
    room: '101(3)',
    teacher: 'AN',
    targetGroup: 'ALL',
    weekParity: 'ALL',
    isLab: false,
  },
]

async function main() {
  console.log('📅 Seeding Summer 2026 routine...')

  // Clear existing routine data for this semester
  const deleted = await prisma.baseRoutine.deleteMany({
    where: { semester: SEMESTER },
  })
  console.log(`  🗑️  Cleared ${deleted.count} existing entries for ${SEMESTER}`)

  // Insert all routine entries
  let count = 0
  for (const entry of routineData) {
    await prisma.baseRoutine.create({
      data: {
        ...entry,
        semester: SEMESTER,
      },
    })
    count++
  }

  console.log(`  ✅ Inserted ${count} routine entries for ${SEMESTER}`)
  console.log('')
  console.log('  Summary by day:')

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  for (const day of days) {
    const dayCount = routineData.filter((r) => r.dayOfWeek === day).length
    console.log(`    ${day}: ${dayCount} classes`)
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
