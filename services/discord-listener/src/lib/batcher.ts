import { Message, Collection, Attachment } from 'discord.js'
import { logger } from './logger'

/**
 * Message Batcher — debounces rapid-fire messages from the same user
 * in the same channel so they get processed as ONE announcement.
 *
 * Logic:
 *   1. On each incoming message, compute a batch key = `channelId:authorId`
 *   2. If no batch exists for this key, create one and start a debounce timer.
 *   3. If a batch already exists, add the message to it and RESET the timer.
 *   4. When the timer fires (no new messages for DEBOUNCE_MS), invoke the
 *      callback with a "merged" virtual message that combines all buffered text
 *      and attachments.
 *
 * The debounce window caps out at MAX_BATCH_WINDOW_MS from the FIRST message
 * to prevent infinitely growing batches.
 */

/** How long to wait after the last message before flushing the batch */
const DEBOUNCE_MS = 30_000 // 30 seconds

/** Absolute maximum time from first message to flush (prevents infinite batching) */
const MAX_BATCH_WINDOW_MS = 120_000 // 2 minutes

interface PendingBatch {
  /** All messages accumulated in this batch */
  messages: Message[]
  /** The debounce timer handle — reset on each new message */
  debounceTimer: ReturnType<typeof setTimeout>
  /** Absolute deadline timer — fires even if messages keep coming */
  deadlineTimer: ReturnType<typeof setTimeout>
  /** Timestamp of the first message in the batch */
  firstMessageAt: number
}

type BatchCallback = (messages: Message[]) => void | Promise<void>

const batches = new Map<string, PendingBatch>()

function batchKey(message: Message): string {
  return `${message.channel.id}:${message.author.id}`
}

/**
 * Enqueue a message into the batcher. The callback will be invoked with all
 * accumulated messages once the debounce window expires.
 */
export function enqueueMessage(message: Message, onFlush: BatchCallback): void {
  const key = batchKey(message)
  const existing = batches.get(key)

  if (existing) {
    // Add to existing batch & reset debounce timer
    existing.messages.push(message)
    clearTimeout(existing.debounceTimer)

    logger.info('batcher', 'message added to existing batch', {
      key,
      batchSize: existing.messages.length,
      messageId: message.id,
    })

    existing.debounceTimer = setTimeout(() => {
      flush(key, onFlush)
    }, DEBOUNCE_MS)
  } else {
    // Start a new batch
    logger.info('batcher', 'new batch started', {
      key,
      messageId: message.id,
    })

    const batch: PendingBatch = {
      messages: [message],
      firstMessageAt: Date.now(),
      debounceTimer: setTimeout(() => {
        flush(key, onFlush)
      }, DEBOUNCE_MS),
      deadlineTimer: setTimeout(() => {
        logger.info('batcher', 'batch deadline reached, forcing flush', { key })
        flush(key, onFlush)
      }, MAX_BATCH_WINDOW_MS),
    }

    batches.set(key, batch)
  }
}

/**
 * Flush a batch: remove it from the map, clear timers, and invoke the callback.
 */
function flush(key: string, onFlush: BatchCallback): void {
  const batch = batches.get(key)
  if (!batch) return

  batches.delete(key)
  clearTimeout(batch.debounceTimer)
  clearTimeout(batch.deadlineTimer)

  logger.info('batcher', 'flushing batch', {
    key,
    messageCount: batch.messages.length,
    elapsedMs: Date.now() - batch.firstMessageAt,
  })

  // Fire-and-forget — errors are caught by the caller
  Promise.resolve(onFlush(batch.messages)).catch((err) => {
    logger.error('batcher', 'flush callback error', { key, error: String(err) })
  })
}

/**
 * Merge multiple messages into combined text + a unified attachment collection.
 * Returns the FIRST message as the "anchor" (for replying, reacting, etc.)
 * along with the merged content.
 */
export interface MergedBatch {
  /** The first message in the batch — use this for reactions/replies */
  anchor: Message
  /** All messages in chronological order */
  messages: Message[]
  /** Combined text content, joined with newlines */
  mergedContent: string
  /** All attachments from all messages, flattened */
  allAttachments: Collection<string, Attachment>
}

export function mergeBatch(messages: Message[]): MergedBatch {
  const sorted = [...messages].sort(
    (a, b) => a.createdTimestamp - b.createdTimestamp
  )

  const mergedContent = sorted
    .map((m) => m.content ?? '')
    .filter((t) => t.trim().length > 0)
    .join('\n')

  // Merge all attachments into one Collection keyed by attachment snowflake
  const allAttachments = new Collection<string, Attachment>()
  for (const msg of sorted) {
    for (const [id, att] of msg.attachments) {
      allAttachments.set(id, att)
    }
  }

  return {
    anchor: sorted[0],
    messages: sorted,
    mergedContent,
    allAttachments,
  }
}

/**
 * Get the current batch size for a key (for testing / monitoring).
 */
export function getBatchSize(channelId: string, authorId: string): number {
  const key = `${channelId}:${authorId}`
  return batches.get(key)?.messages.length ?? 0
}

/**
 * Clear all pending batches (for graceful shutdown).
 */
export function clearAllBatches(): void {
  for (const [key, batch] of batches) {
    clearTimeout(batch.debounceTimer)
    clearTimeout(batch.deadlineTimer)
  }
  batches.clear()
}
