import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const channels = [
  { name: 'listener-testing', id: '1497554535487377409', mode: 'AUTO_PUBLISH', label: 'listener-testing' },
  { name: '📣-𝐀𝐧𝐧𝐨𝐮𝐧𝐜𝐞𝐦𝐞𝐧𝐭𝐬', id: '1427172111482622063', mode: 'AUTO_PUBLISH', label: 'announcements' },
  { name: 'ℹ️-𝐈𝐧𝐟𝐨𝐫𝐦𝐚𝐭𝐢𝐨𝐧𝐬', id: '1495095972433236081', mode: 'AUTO_PUBLISH', label: 'informations' },
  { name: '🗓️-𝐒𝐜𝐡𝐞𝐝𝐮𝐥𝐞-𝐔𝐩𝐝𝐚𝐭𝐞𝐬', id: '1495116749996294294', mode: 'REVIEW_GATE', label: 'schedule-updates', type: 'routine_update' },
  { name: '🗂️-𝐑𝐞𝐬𝐨𝐮𝐫𝐜𝐞𝐬', id: '1450539338311008318', mode: 'AUTO_PUBLISH', label: 'resources' },
  { name: '𝐌𝐀𝐓𝐇-𝟒𝟐𝟏𝟏', id: '1495796581780160574', mode: 'AUTO_PUBLISH', label: 'MATH-4211', courseCode: 'MATH 4211' },
  { name: '𝐇𝐔𝐌-𝟒𝟐𝟏𝟐', id: '1495877347558035558', mode: 'AUTO_PUBLISH', label: 'HUM-4212', courseCode: 'HUM 4212' },
  { name: '𝐏𝐇𝐘-𝟒𝟐𝟏𝟑', id: '1495874001874980925', mode: 'AUTO_PUBLISH', label: 'PHY-4213', courseCode: 'PHY 4213' },
  { name: '𝐂𝐇𝐄𝐌-𝟒𝟐𝟏𝟓', id: '1495874227369279768', mode: 'AUTO_PUBLISH', label: 'CHEM-4215', courseCode: 'CHEM 4215' },
  { name: '𝐌𝐄-𝟒𝟐𝟐𝟓', id: '1495874340992979035', mode: 'AUTO_PUBLISH', label: 'ME-4225', courseCode: 'ME 4225' },
  { name: '𝐄𝐄𝐄-𝟒𝟐𝟖𝟏', id: '1495826110309466303', mode: 'AUTO_PUBLISH', label: 'EEE-4281', courseCode: 'EEE 4281' },
  { name: '𝐈𝐏𝐄 𝟒𝟐𝟎𝟖', id: '1495879542018015503', mode: 'AUTO_PUBLISH', label: 'IPE-4208', courseCode: 'IPE 4208' },
  { name: '𝐌𝐄 𝟒𝟐𝟏𝟎', id: '1495877858617458748', mode: 'AUTO_PUBLISH', label: 'ME-4210', courseCode: 'ME 4210' },
  { name: '𝐏𝐇𝐘 𝟒𝟐𝟏𝟒', id: '1495879439580397771', mode: 'AUTO_PUBLISH', label: 'PHY-4214', courseCode: 'PHY 4214' },
  { name: 'CHEM 4216', id: '1495879322093752510', mode: 'AUTO_PUBLISH', label: 'CHEM-4216', courseCode: 'CHEM 4216' },
  { name: 'ME 4226', id: '1495879236198727721', mode: 'AUTO_PUBLISH', label: 'ME-4226', courseCode: 'ME 4226' },
  { name: 'EEE 4282', id: '1495093950644752424', mode: 'AUTO_PUBLISH', label: 'EEE-4282', courseCode: 'EEE 4282' },
]

async function main() {
  console.log('Seeding bot channels...')
  // We'll set authorizedUserIds to Super Admin / CR IDs, but for now we can just allow everything or get them from existing config
  const existingFirst = await prisma.botChannelConfig.findFirst()
  const authUsers = existingFirst ? existingFirst.authorizedUserIds : '["ALL"]'

  for (const ch of channels) {
    await prisma.botChannelConfig.upsert({
      where: { channelId: ch.id },
      update: {
        mode: ch.mode,
        label: ch.label,
        courseCode: ch.courseCode || null,
        defaultAnnouncementType: ch.type || null,
      },
      create: {
        channelId: ch.id,
        mode: ch.mode,
        authorizedUserIds: authUsers,
        label: ch.label,
        courseCode: ch.courseCode || null,
        defaultAnnouncementType: ch.type || null,
      }
    })
  }
  console.log('Done.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
