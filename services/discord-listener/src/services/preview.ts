import { EmbedBuilder, Colors } from 'discord.js'
import { ClassificationResult } from './classifier'
import { DriveUploadResult } from './drive'

const TYPE_COLORS: Record<string, number> = {
  general:        Colors.Blue,
  exam:           Colors.Red,
  file_update:    Colors.Green,
  routine_update: Colors.Yellow,
  urgent:         0xdc2626, // deep red
  event:          Colors.Purple,
}

const TYPE_LABELS: Record<string, string> = {
  general:        'General',
  exam:           'Exam',
  file_update:    'File Update',
  routine_update: 'Routine Update',
  urgent:         'URGENT',
  event:          'Event',
}

export function buildPreviewEmbed(
  classification: ClassificationResult,
  files: DriveUploadResult[],
  sourceChannelName: string
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

  embed.addFields({
    name: 'Review',
    value: 'React ✅ to **publish** to website + Telegram\nReact ❌ to **discard**',
  })

  return embed
}

export function buildPublishedEmbed(
  classification: ClassificationResult,
  result: { website: boolean; telegram: boolean }
): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`✅ Published — ${classification.title}`)
    .setColor(Colors.Green)
    .addFields(
      { name: 'Website', value: result.website ? '✅ Posted' : '❌ Failed', inline: true },
      { name: 'Telegram', value: result.telegram ? '✅ Sent' : '⚠️ Failed', inline: true },
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
