# Feature Update: Telegram-based Announcement Review

**Date**: 2026-04-30
**Status**: Completed
**Description**: Removed legacy Discord-based verification/review logic in favor of the fully implemented Telegram review pipeline.

## Changes

### 1. Database & Schema
- Removed `reviewChannelId` from `BotChannelConfig` model in `schema.prisma`.
- Applied SQL migration to drop the column from the `bot_channel_configs` table.

### 2. Admin UI
- Updated `DiscordConfigClient.tsx` to remove the "Review Channel ID" field from the channel configuration form.
- Removed the "Review" ID display from the monitored channels list.

### 3. Backend & API
- Updated `upsertDiscordConfig` server action to remove `reviewChannelId` handling.
- Updated internal API route (`/api/v1/internal/bot-config`) to stop serving the `reviewChannelId` field to the bot.

### 4. Discord Listener Service
- Updated `config.ts` in the `discord-listener` service to remove `reviewChannelId` from the Zod configuration schema.
- The bot now exclusively uses the Telegram-based preview and approval system for all channels in `REVIEW_GATE` mode.

## How it Works
When a message is received in a Discord channel set to `REVIEW_GATE`:
1. The bot classifies the message and uploads any attachments to Google Drive.
2. A preview is generated and sent to the **Telegram Bot** (via Redis).
3. The CR reviews the announcement on Telegram and reacts with ✅ to approve.
4. The approved announcement is published to the website and other platforms automatically.

## Rollback Plan
To rollback:
1. Revert the `schema.prisma` change using `prisma/schema.prisma.bak`.
2. Re-add the `reviewChannelId` column to the database.
3. Re-enable the UI field in `DiscordConfigClient.tsx`.
