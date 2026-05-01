const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const where = {};
prisma.fileUpload.findMany({
  where,
  orderBy: { createdAt: 'desc' },
  skip: 0,
  take: 15,
  include: {
    course: { select: { id: true, code: true, name: true } },
    uploadedBy: { select: { id: true, name: true } },
  },
}).then(res => console.log(JSON.stringify(res, null, 2))).finally(() => prisma.$disconnect());
