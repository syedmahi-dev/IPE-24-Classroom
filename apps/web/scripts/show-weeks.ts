import { prisma } from '../src/lib/prisma'

const weeks = await prisma.routineWeek.findMany({ orderBy: { calendarWeekStart: 'asc' } })
weeks.forEach(r => console.log(r.calendarWeekStart.toISOString(), 'WW' + r.workingWeekNumber, r.weekType, r.isSkipped))
await prisma.$disconnect()
