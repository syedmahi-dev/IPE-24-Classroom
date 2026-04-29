import { PrismaClient, Role } from '@prisma/client';
const prisma = new PrismaClient();
prisma.user.update({
  where: { email: 'even@iut-dhaka.edu' },
  data: { role: Role.admin }
}).then(() => {
  console.log('Role updated to admin successfully!');
}).catch(e => {
  console.error('Error:', e);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
