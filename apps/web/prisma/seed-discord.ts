import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const configs = [
  {
    channelId: "1427172111482622063",
    mode: "REVIEW_GATE",
    authorizedUserIds: JSON.stringify(["1398712871885733940", "434343988804321290", "752723739619229705", "755438715492630648"]),
    reviewChannelId: "1497242280598306889",
    label: "announcements"
  },
  {
    channelId: "1495095972433236081",
    mode: "REVIEW_GATE",
    authorizedUserIds: JSON.stringify(["1398712871885733940", "434343988804321290", "752723739619229705", "755438715492630648"]),
    reviewChannelId: "1497242280598306889",
    label: "informations"
  },
  {
    channelId: "1495116749996294294",
    mode: "REVIEW_GATE",
    authorizedUserIds: JSON.stringify(["1398712871885733940", "434343988804321290", "752723739619229705", "755438715492630648"]),
    reviewChannelId: "1497242280598306889",
    label: "schedule-updates"
  },
  {
    channelId: "1450539338311008318",
    mode: "REVIEW_GATE",
    authorizedUserIds: JSON.stringify(["1398712871885733940", "434343988804321290", "752723739619229705", "755438715492630648"]),
    reviewChannelId: "1497242280598306889",
    label: "resources"
  },
  {
    channelId: "1495879542018015503",
    mode: "REVIEW_GATE",
    authorizedUserIds: JSON.stringify(["1398712871885733940", "434343988804321290", "752723739619229705", "755438715492630648"]),
    reviewChannelId: "1497242280598306889",
    label: "ipe4208-info",
    courseCode: "IPE4208"
  },
  {
    channelId: "1495877858617458748",
    mode: "REVIEW_GATE",
    authorizedUserIds: JSON.stringify(["1398712871885733940", "434343988804321290", "752723739619229705", "755438715492630648"]),
    reviewChannelId: "1497242280598306889",
    label: "phy4214-info",
    courseCode: "PHY4214"
  },
  {
    channelId: "1495879439580397771",
    mode: "REVIEW_GATE",
    authorizedUserIds: JSON.stringify(["1398712871885733940", "434343988804321290", "752723739619229705", "755438715492630648"]),
    reviewChannelId: "1497242280598306889",
    label: "me4226-info",
    courseCode: "ME4226"
  },
  {
    channelId: "1495879236198727721",
    mode: "REVIEW_GATE",
    authorizedUserIds: JSON.stringify(["1398712871885733940", "434343988804321290", "752723739619229705", "755438715492630648"]),
    reviewChannelId: "1497242280598306889",
    label: "eee4282-info",
    courseCode: "EEE4282"
  },
  {
    channelId: "1495093950644752424",
    mode: "REVIEW_GATE",
    authorizedUserIds: JSON.stringify(["1398712871885733940", "434343988804321290", "752723739619229705", "755438715492630648"]),
    reviewChannelId: "1497242280598306889",
    label: "course-info"
  },
  {
    channelId: "1497554535487377409",
    mode: "AUTO_PUBLISH",
    authorizedUserIds: JSON.stringify(["1398712871885733940", "434343988804321290", "752723739619229705", "755438715492630648"]),
    label: "listener-testing"
  }
]

async function main() {
  console.log('🤖 Seeding Discord Bot Channel Configurations...')

  for (const config of configs) {
    await prisma.botChannelConfig.upsert({
      where: { channelId: config.channelId },
      update: config,
      create: config,
    })
  }

  console.log(`  ✅ Restored ${configs.length} channel configurations.`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
