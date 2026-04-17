import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // Simulate what the API does for ?date=2026-04-20, G2 (ODD)
  const groupFilter = ['ALL', 'ODD']
  const days = ['Monday']
  
  const baseRoutines = await prisma.baseRoutine.findMany({
    where: {
      dayOfWeek: { in: days },
      targetGroup: { in: groupFilter },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  })
  
  console.log('Monday routines for ODD (G2):')
  baseRoutines.forEach(r => console.log(r.courseCode, r.startTime+'-'+r.endTime, 'group:'+r.targetGroup, 'parity:'+r.weekParity, 'lab:'+r.isLab))
  
  // effectiveParity for G2 + Type A = ODD
  const effectiveParity = 'ODD'
  const filtered = baseRoutines.filter(r => {
    if (r.weekParity !== 'ALL') return r.weekParity === effectiveParity
    return true
  })
  
  console.log('\nAfter weekParity filter (effective=' + effectiveParity + '):')
  filtered.forEach(r => console.log(r.courseCode, r.startTime+'-'+r.endTime))
  
  await prisma.$disconnect()
}
main()
