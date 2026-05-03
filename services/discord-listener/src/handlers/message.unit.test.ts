import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../services/classifier', () => ({
  classifyMessage: vi.fn(),
}))

vi.mock('../services/drive', () => ({
  uploadUrlToDrive: vi.fn(),
  extractDriveLinks: vi.fn(() => []),
  getDriveFileMetadata: vi.fn(),
  isFolderUrl: vi.fn(() => false),
  listDriveFolderFiles: vi.fn(),
}))

vi.mock('../services/publisher', () => ({
  publishAnnouncement: vi.fn(),
}))

vi.mock('../services/knowledge-ingestor', () => ({
  ingestToKnowledgeBase: vi.fn(() => Promise.resolve()),
}))

vi.mock('../services/preview', () => ({
  buildPreviewEmbed: vi.fn(() => ({
    toJSON: () => ({}),
  })),
}))

vi.mock('../lib/redis', () => ({
  claimMessage: vi.fn(() => Promise.resolve(true)),
  releaseMessage: vi.fn(() => Promise.resolve()),
}))

vi.mock('../config', () => ({
  getConfig: vi.fn(() => ({
    REACTION_TIMEOUT_MS: 7_200_000,
  })),
  getChannelConfig: vi.fn(() => ({
    channelId: 'channel-1',
    mode: 'REVIEW_GATE',
    authorizedUserIds: ['user-1'],
    authorizedRoleIds: [],
    label: 'CSE-3100',
  })),
}))

import { handleMessage } from './message'
import { classifyMessage } from '../services/classifier'
import { publishAnnouncement } from '../services/publisher'
import { releaseMessage } from '../lib/redis'

type MockMessage = {
  id: string
  url: string
  content: string
  author: { id: string; bot: boolean; username: string }
  guild: { members: { fetch: ReturnType<typeof vi.fn> } }
  member: null
  channel: { id: string; name: string }
  attachments: Map<string, unknown>
  reactions: { cache: Map<string, { users: { remove: ReturnType<typeof vi.fn> } }> }
  react: ReturnType<typeof vi.fn>
  reply: ReturnType<typeof vi.fn>
}

function createMockMessage(previewMessage: {
  react: ReturnType<typeof vi.fn>
  awaitReactions: ReturnType<typeof vi.fn>
  reply: ReturnType<typeof vi.fn>
}): MockMessage {
  return {
    id: 'msg-1',
    url: 'https://discord.com/channels/test/msg-1',
    content: 'Important update',
    author: { id: 'user-1', bot: false, username: 'CR User' },
    guild: { members: { fetch: vi.fn() } },
    member: null,
    channel: { id: 'channel-1', name: 'class-updates' },
    attachments: new Map(),
    reactions: {
      cache: new Map([
        [
          '⏳',
          {
            users: {
              remove: vi.fn(() => Promise.resolve()),
            },
          },
        ],
      ]),
    },
    react: vi.fn(() => Promise.resolve()),
    reply: vi.fn(() => Promise.resolve(previewMessage)),
  }
}

describe('handleMessage review gate timeout behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(publishAnnouncement).mockResolvedValue({
      website: true,
      telegram: true,
      filesCreated: 0,
      overridesCreated: 0,
      errors: [],
    })
  })

  it('auto-publishes non-routine message when review times out', async () => {
    vi.mocked(classifyMessage).mockResolvedValue({
      type: 'general',
      title: 'Non-routine update',
      body: 'Body',
      urgency: 'medium',
      fileCategory: 'other',
      detectedCourseCode: null,
      overrides: [],
    })

    const previewMessage = {
      react: vi.fn(() => Promise.resolve()),
      awaitReactions: vi.fn(() => Promise.reject(new Error('time'))),
      reply: vi.fn(() => Promise.resolve()),
    }

    const message = createMockMessage(previewMessage)

    await handleMessage(message as any)

    expect(previewMessage.reply).toHaveBeenCalledWith(
      expect.stringContaining('Auto-publishing this non-routine post')
    )
    expect(publishAnnouncement).toHaveBeenCalledTimes(1)
    expect(releaseMessage).not.toHaveBeenCalled()
  })

  it('discards routine override when review times out', async () => {
    vi.mocked(classifyMessage).mockResolvedValue({
      type: 'routine_update',
      title: 'Routine change',
      body: 'Body',
      urgency: 'high',
      fileCategory: 'other',
      detectedCourseCode: null,
      overrides: [
        {
          action: 'cancel',
          dayOfWeek: 'Sunday',
        },
      ],
    } as any)

    const previewMessage = {
      react: vi.fn(() => Promise.resolve()),
      awaitReactions: vi.fn(() => Promise.reject(new Error('time'))),
      reply: vi.fn(() => Promise.resolve()),
    }

    const message = createMockMessage(previewMessage)

    await handleMessage(message as any)

    expect(previewMessage.reply).toHaveBeenCalledWith(
      expect.stringContaining('routine override was discarded')
    )
    expect(publishAnnouncement).not.toHaveBeenCalled()
    expect(releaseMessage).toHaveBeenCalledWith('msg-1')
  })
})
