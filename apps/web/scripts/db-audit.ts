const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  // Check users
  const users = await p.user.findMany({ select: { id: true, email: true, name: true, role: true, createdAt: true } })
  console.log('=== USERS ===')
  console.log(JSON.stringify(users, null, 2))

  // Check courses
  const courses = await p.course.findMany({ select: { id: true, code: true, name: true } })
  console.log('\n=== COURSES ===')
  console.log(JSON.stringify(courses, null, 2))

  // Check announcements
  const announcements = await p.announcement.findMany({ select: { id: true, title: true, type: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 10 })
  console.log('\n=== ANNOUNCEMENTS (last 10) ===')
  console.log(JSON.stringify(announcements, null, 2))

  // Check if there are any tables that might have been wiped
  // Look at audit log for clues
  const audits = await p.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10 })
  console.log('\n=== AUDIT LOGS (last 10) ===')
  console.log(JSON.stringify(audits, null, 2))

  await p['$disconnect']()
}

main().catch(e => { console.error(e); process.exit(1) })
