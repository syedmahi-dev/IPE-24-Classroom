import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🧪 Creating test users for all roles...')

  const passwordHash = await bcrypt.hash('password123', 10)

  const testUsers = [
    {
      email: 'student@test.com',
      name: 'Test Student',
      role: 'student',
      studentId: '123456789',
    },
    {
      email: 'admin@test.com',
      name: 'Test Admin (CR)',
      role: 'admin',
      studentId: '987654321',
    },
    {
      email: 'superadmin@test.com',
      name: 'Test Super Admin',
      role: 'super_admin',
      studentId: '000000000',
    }
  ]

  for (const user of testUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { passwordHash, role: user.role },
      create: {
        ...user,
        passwordHash,
      },
    })
    console.log(`✅ Created ${user.role}: ${user.email} (Password: password123)`)
  }

  console.log('\n🎉 Test users are ready!')
}

main()
  .catch((e) => {
    console.error('❌ Failed to create test users:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
