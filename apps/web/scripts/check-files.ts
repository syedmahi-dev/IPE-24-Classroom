export {}

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const files = await prisma.fileUpload.findMany({
    include: {
      course: true,
      uploadedBy: true
    }
  })
  console.log(JSON.stringify(files, null, 2))
}
main().finally(() => prisma.$disconnect())
