import { PrismaClient } from '@prisma/client'

async function main() {
  const p = new PrismaClient()
  
  // Check all super_admin users
  const admins = await p.user.findMany({
    where: { role: 'super_admin' },
    select: { id: true, name: true, email: true }
  })
  console.log('Super admin users:')
  for (const a of admins) {
    const notifCount = await p.notification.count({ where: { userId: a.id } })
    console.log(`  ID: ${a.id} | ${a.name} (${a.email}) | Notifications: ${notifCount}`)
  }

  // Check all users named Syed
  const syeds = await p.user.findMany({
    where: { name: { contains: 'Syed', mode: 'insensitive' } },
    select: { id: true, name: true, email: true, role: true }
  })
  console.log('\nAll users named Syed:')
  for (const s of syeds) {
    const notifCount = await p.notification.count({ where: { userId: s.id } })
    console.log(`  ID: ${s.id} | ${s.name} (${s.email}) [${s.role}] | Notifications: ${notifCount}`)
  }

  // Check if any user has duplicate entries with same email
  const dupes = await p.$queryRaw`
    SELECT email, COUNT(*)::int as cnt FROM users GROUP BY email HAVING COUNT(*) > 1
  ` as any[]
  if (dupes.length > 0) {
    console.log('\nDuplicate email users found:')
    for (const d of dupes) {
      console.log(`  ${d.email}: ${d.cnt} entries`)
    }
  } else {
    console.log('\nNo duplicate email users found')
  }

  // Check notifications with no matching user
  const orphans = await p.$queryRaw`
    SELECT COUNT(*)::int as cnt FROM notifications n 
    LEFT JOIN users u ON u.id = n."userId" 
    WHERE u.id IS NULL
  ` as any[]
  console.log(`\nOrphan notifications (userId not in users table): ${orphans[0]?.cnt ?? 0}`)

  await p.$disconnect()
}
main()
