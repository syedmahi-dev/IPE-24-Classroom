import { EmbedBuilder, Colors } from 'discord.js'
import { ClassificationResult, RoutineOverrideExtract } from './classifier'
import { DriveUploadResult } from './drive'

const TYPE_COLORS: Record<string, number> = {
  general:        Colors.Blue,
  exam:           Colors.Red,
  file_update:    Colors.Green,
  routine_update: Colors.Yellow,
  urgent:         0xdc2626, // deep red
  event:          Colors.Purple,
  course_update:  Colors.DarkGold,
}

const TYPE_LABELS: Record<string, string> = {
  general:        'General',
  exam:           'Exam',
  file_update:    'File Update',
  routine_update: 'Routine Update',
  urgent:         'URGENT',
  event:          'Event',
  course_update:  'Course Update',
}

export function buildPreviewEmbed(
  classification: ClassificationResult,
  files: DriveUploadResult[],
  sourceChannelName: string,
  timeoutMs?: number
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`[${TYPE_LABELS[classification.type] ?? 'General'}] ${classification.title}`)
    .setDescription(classification.body.slice(0, 4096))
    .setColor(TYPE_COLORS[classification.type] ?? Colors.Blue)
    .setTimestamp()
    .setFooter({ text: `From #${sourceChannelName} · Urgency: ${classification.urgency}` })

  if (files.length > 0) {
    embed.addFields({
      name: 'Attached Files',
      value: files.map((f) => `[${f.name}](${f.driveUrl})`).join('\n').slice(0, 1024),
    })
  }

  if (classification.overrides.length > 0) {
    embed.addFields({
      name: '📅 Detected Routine Overrides',
      value: classification.overrides
        .map((ov) => {
          let line = `**${ov.type}** ${ov.courseCode} (${ov.date})`
          const meta = []
          if (ov.targetGroup && ov.targetGroup !== 'ALL') meta.push(`G: ${ov.targetGroup}`)
          if (ov.weekParity && ov.weekParity !== 'ALL') meta.push(ov.weekParity.replace('WEEK_', 'W: '))
          if (meta.length > 0) line += ` [${meta.join(', ')}]`
          return line
        })
        .join('\n')
        .slice(0, 1024),
    })
  }

  embed.addFields({
    name: 'Review',
    value: timeoutMs
      ? `React ✅ to **publish** to website\nReact ❌ to **discard**\nAuto-publishes in ${Math.max(1, Math.floor(timeoutMs / (60 * 60 * 1000)))}h if no response`
      : 'React ✅ to **publish** to website\nReact ❌ to **discard**\nSchedule updates require explicit approval — no auto-publish',
  })

  return embed
}

export function buildPublishedEmbed(
  classification: ClassificationResult,
  result: { website: boolean; filesCreated: number }
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`✅ Published — ${classification.title}`)
    .setColor(Colors.Green)
    .addFields(
      { name: 'Website', value: result.website ? '✅ Posted' : '❌ Failed', inline: true },
      { name: 'Files', value: result.filesCreated > 0 ? `📁 ${result.filesCreated} saved` : '—', inline: true },
    )
    .setTimestamp()
    .setFooter({ text: 'discord-listener' })
}

export function buildDiscardedEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('❌ Discarded')
    .setDescription('This announcement was rejected by the CR.')
    .setColor(Colors.Red)
    .setTimestamp()
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function buildTelegramPreviewHtml(
  classification: ClassificationResult,
  files: DriveUploadResult[],
  sourceUrl: string
): string {
  const typeLabel = TYPE_LABELS[classification.type] ?? 'General'
  
  let msg = `🚨 <b>Review Required</b> 🚨\n\n`
  msg += `<b>Type:</b> ${escapeHtml(typeLabel)}\n`
  msg += `<b>Title:</b> ${escapeHtml(classification.title)}\n`
  msg += `<b>Urgency:</b> ${escapeHtml(classification.urgency)}\n\n`
  msg += `${escapeHtml(classification.body)}\n`
  
  if (files.length > 0) {
    msg += `\n<b>Files:</b>\n`
    for (const f of files) {
      msg += `• <a href="${escapeHtml(f.driveUrl)}">${escapeHtml(f.name)}</a>\n`
    }
  }

  // Render routine overrides if present
  if (classification.overrides && classification.overrides.length > 0) {
    msg += `\n📅 <b>Routine Changes (auto-created on approval):</b>\n`
    for (const ov of classification.overrides) {
      msg += formatOverrideLine(ov)
    }
  }

  msg += `\n<a href="${escapeHtml(sourceUrl)}">View Original Discord Message</a>`
  
  return msg.slice(0, 4096)
}

const OVERRIDE_EMOJIS: Record<string, string> = {
  CANCELLED: '❌',
  MAKEUP: '➕',
  ROOM_CHANGE: '🏠',
  TIME_CHANGE: '⏰',
}

function formatOverrideLine(ov: RoutineOverrideExtract): string {
  const emoji = OVERRIDE_EMOJIS[ov.type] || '📌'
  const dateObj = new Date(ov.date + 'T00:00:00')
  const dateStr = dateObj.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  
  let line = `${emoji} <b>[${ov.type}]</b> ${escapeHtml(ov.courseCode)} on ${escapeHtml(dateStr)}`

  if (ov.type === 'ROOM_CHANGE' && ov.room) {
    line += ` → Room ${escapeHtml(ov.room)}`
  }
  if (ov.type === 'TIME_CHANGE' && ov.startTime) {
    line += ` → ${escapeHtml(ov.startTime)}${ov.endTime ? '-' + escapeHtml(ov.endTime) : ''}`
  }
  if (ov.type === 'MAKEUP') {
    if (ov.startTime) line += ` at ${escapeHtml(ov.startTime)}${ov.endTime ? '-' + escapeHtml(ov.endTime) : ''}`
    if (ov.room) line += ` in ${escapeHtml(ov.room)}`
  }

  // Group & Week Parity indicators
  const indicators: string[] = []
  if (ov.targetGroup && ov.targetGroup !== 'ALL') {
    indicators.push(`Group ${ov.targetGroup}`)
  }
  if (ov.weekParity && ov.weekParity !== 'ALL') {
    indicators.push(ov.weekParity.replace('_', ' '))
  }
  
  if (indicators.length > 0) {
    line += ` [${indicators.join(' | ')}]`
  }

  if (ov.reason) {
    line += ` — <i>${escapeHtml(ov.reason)}</i>`
  }
  line += '\n'
  return line
}
