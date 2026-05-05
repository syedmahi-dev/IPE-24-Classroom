/**
 * Safe script to update BotChannelConfig modes in the database.
 * 
 * This ONLY updates the `mode` field of existing rows. No deletes, no truncates.
 * 
 * Usage: npx tsx apps/web/scripts/fix-bot-channel-modes.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Production DB guard
const dbUrl = process.env.DATABASE_URL || ''
if (!dbUrl) {
  console.error('🚨 DATABASE_URL not set')
  process.exit(1)
}

// These channels should be REVIEW_GATE (sends TG preview for CR approval before publishing)
const REVIEW_GATE_CHANNELS = [
  '1427172111482622063',  // announcements
  '1495095972433236081',  // informations
  '1495116749996294294',  // schedule-updates (already REVIEW_GATE)
  '1450539338311008318',  // resources
  '1495796581780160574',  // MATH-4211
  '1495877347558035558',  // HUM-4212
  '1495874001874980925',  // PHY-4213
  '1495874227369279768',  // CHEM-4215
  '1495874340992979035',  // ME-4225
  '1495826110309466303',  // EEE-4281
  '1495879542018015503',  // IPE-4208
  '1495877858617458748',  // ME-4210
  '1495879439580397771',  // PHY-4214
  '1495879322093752510',  // CHEM-4216
  '1495879236198727721',  // ME-4226
  '1495093950644752424',  // EEE-4282
]

// These channels stay AUTO_PUBLISH (publishes directly, no review needed)
const AUTO_PUBLISH_CHANNELS = [
  '1497554535487377409',  // listener-testing
]

async function main() {
  console.log('📋 Reading current BotChannelConfig rows...')
  
  const configs = await prisma.botChannelConfig.findMany({
    select: { id: true, channelId: true, mode: true, label: true }
  })
  
  console.log(`Found ${configs.length} channel configs:`)
  for (const c of configs) {
    console.log(`  ${c.channelId} (${c.label ?? 'no label'}) → current mode: ${c.mode}`)
  }
  
  console.log('\n🔄 Updating modes...')
  
  let updated = 0
  
  for (const channelId of REVIEW_GATE_CHANNELS) {
    const existing = configs.find(c => c.channelId === channelId)
    if (!existing) {
      console.log(`  ⏭️  ${channelId} — not found in DB, skipping`)
      continue
    }
    if (existing.mode === 'REVIEW_GATE') {
      console.log(`  ✅ ${channelId} (${existing.label ?? '?'}) — already REVIEW_GATE`)
      continue
    }
    
    await prisma.botChannelConfig.update({
      where: { channelId },
      data: { mode: 'REVIEW_GATE' }
    })
    console.log(`  🔄 ${channelId} (${existing.label ?? '?'}) — AUTO_PUBLISH → REVIEW_GATE`)
    updated++
  }
  
  for (const channelId of AUTO_PUBLISH_CHANNELS) {
    const existing = configs.find(c => c.channelId === channelId)
    if (!existing) continue
    if (existing.mode === 'AUTO_PUBLISH') {
      console.log(`  ✅ ${channelId} (${existing.label ?? '?'}) — already AUTO_PUBLISH`)
      continue
    }
    
    await prisma.botChannelConfig.update({
      where: { channelId },
      data: { mode: 'AUTO_PUBLISH' }
    })
    console.log(`  🔄 ${channelId} (${existing.label ?? '?'}) — REVIEW_GATE → AUTO_PUBLISH`)
    updated++
  }
  
  console.log(`\n✅ Done. Updated ${updated} rows.`)
}

main()
  .catch((err) => {
    console.error('❌ Error:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
