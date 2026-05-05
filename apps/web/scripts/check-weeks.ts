import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const w = await p.routineWeek.findMany({ orderBy: { calendarWeekStart: 'asc' } });
  console.table(w.map(r => ({ start: r.calendarWeekStart.toISOString().split('T')[0], wk: r.workingWeekNumber, type: r.weekType, skipped: r.isSkipped })));
  await p.$disconnect();
}
main();
