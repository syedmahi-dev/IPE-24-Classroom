/**
 * Seed real semester-2 courses with courseType (THEORY/LAB/SESSIONAL)
 * and re-link existing announcements that have the course code in their source data.
 */
import { PrismaClient, CourseType } from '@prisma/client'

const prisma = new PrismaClient()

const COURSES = [
  { code: 'MATH4211', name: 'PDE, Special Functions, Laplace & Fourier', creditHours: 3, semester: 2, courseType: CourseType.THEORY, teacherName: 'Dr. Md. Tusher Mollah' },
  { code: 'HUM4212', name: 'Humanities (Arabic II)', creditHours: 2, semester: 2, courseType: CourseType.THEORY, teacherName: 'Mr. Shabbir Ahmed' },
  { code: 'PHY4213', name: 'Physics (Waves & Oscillation, Geometrical Optics)', creditHours: 3, semester: 2, courseType: CourseType.THEORY, teacherName: 'Prof. Dr. Aminul I. Talukder' },
  { code: 'CHEM4215', name: 'Chemistry of Engineering Materials', creditHours: 3, semester: 2, courseType: CourseType.THEORY, teacherName: 'Dr. Md. Sofiul Alom' },
  { code: 'ME4225', name: 'Material Engineering', creditHours: 3, semester: 2, courseType: CourseType.THEORY, teacherName: 'Dr. Md. Abu Shakid Sujon' },
  { code: 'EEE4281', name: 'Electrical Circuits and Machines', creditHours: 3, semester: 2, courseType: CourseType.THEORY, teacherName: 'Mr. Asif Newaz' },
  { code: 'IPE4208', name: 'Workshop Practice II (Machine Shop)', creditHours: 1.5, semester: 2, courseType: CourseType.SESSIONAL, teacherName: 'Mr. Immul Kayas' },
  { code: 'ME4210', name: '3D Solid Modeling and Assembling', creditHours: 0.75, semester: 2, courseType: CourseType.LAB, teacherName: 'Mr. Hasdibur Rahman Hamim' },
  { code: 'PHY4214', name: 'Physics Lab', creditHours: 0.75, semester: 2, courseType: CourseType.LAB, teacherName: 'Prof. Dr. A T Md. Kaosar Jamil' },
  { code: 'CHEM4216', name: 'Chemistry Lab', creditHours: 0.75, semester: 2, courseType: CourseType.LAB, teacherName: 'Dr. Md. Jalil Miah' },
  { code: 'ME4226', name: 'Material Engineering Lab', creditHours: 0.75, semester: 2, courseType: CourseType.LAB, teacherName: 'Dr. Md. Saiful Islam' },
  { code: 'EEE4282', name: 'Electrical Circuits & Machines Lab', creditHours: 0.75, semester: 2, courseType: CourseType.LAB, teacherName: 'Ms. Jasim Tasnim Rahman' },
]

async function main() {
  console.log('📚 Seeding real courses with courseType...\n')

  for (const c of COURSES) {
    const record = await prisma.course.upsert({
      where: { code: c.code },
      update: { courseType: c.courseType, name: c.name, teacherName: c.teacherName, creditHours: c.creditHours, semester: c.semester },
      create: c,
    })
    const typeLabel = c.courseType === 'LAB' ? '🧪 LAB' : c.courseType === 'SESSIONAL' ? '🔧 SESSIONAL' : '📖 THEORY'
    console.log(`  ✓ ${c.code.padEnd(10)} ${typeLabel.padEnd(14)} ${c.name}`)
  }

  // Now re-link announcements that are type course_update but have no course linked
  console.log('\n🔗 Linking unlinked course_update announcements...\n')

  const unlinked = await prisma.announcement.findMany({
    where: {
      type: 'course_update',
      courses: { none: {} },
    },
    select: { id: true, title: true, body: true },
  })

  let linked = 0
  for (const ann of unlinked) {
    // Try to match a course code in title or body
    const text = `${ann.title} ${ann.body}`.toUpperCase()
    for (const c of COURSES) {
      // Match patterns like "EEE4281", "EEE 4281", "EEE-4281"
      const dept = c.code.replace(/(\D+)(\d+)/, '$1')
      const num = c.code.replace(/(\D+)(\d+)/, '$2')
      const pattern = new RegExp(`${dept}[\\s\\-]?${num}`, 'i')
      if (pattern.test(text)) {
        const course = await prisma.course.findUnique({ where: { code: c.code }, select: { id: true } })
        if (course) {
          await prisma.announcementCourse.upsert({
            where: { announcementId_courseId: { announcementId: ann.id, courseId: course.id } },
            update: {},
            create: { announcementId: ann.id, courseId: course.id },
          })
          console.log(`  ✓ Linked "${ann.title.slice(0, 50)}" → ${c.code}`)
          linked++
          break // first match wins
        }
      }
    }
  }

  console.log(`\n✅ Done! ${COURSES.length} courses seeded, ${linked} announcements linked.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
