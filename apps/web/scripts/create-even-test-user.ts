import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const plainPassword = 'evenpassword';
  const passwordHash = await bcrypt.hash(plainPassword, 10);
  
  const evenStudent = await prisma.user.upsert({
    where: { email: 'even@iut-dhaka.edu' },
    update: {
      passwordHash,
      studentId: 'IPE-24-002', // ensures even ID
    },
    create: {
      email: 'even@iut-dhaka.edu',
      name: 'Even Test Student',
      role: Role.student,
      studentId: 'IPE-24-002',
      passwordHash,
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=even',
      phone: '+8801700000000',
      bio: 'A test student with an EVEN ID for position A routine testing.',
    },
  });

  console.log('✅ Created Even ID Test Student');
  console.log('Email:', evenStudent.email);
  console.log('Password:', plainPassword);
  console.log('Student ID:', evenStudent.studentId);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
