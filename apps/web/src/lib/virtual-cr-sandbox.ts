import { PrismaClient } from '@prisma/client'

type SandboxKnowledgeRecord = {
  sourceType: string
  sourceId: string
  title: string
  content: string
  sourceChannel?: string | null
  courseCode?: string | null
  payload?: unknown
}

let sandboxClient: PrismaClient | null = null
let sandboxDisabled = false

function getSandboxDatabaseUrl(): string | null {
  const url = process.env.VIRTUAL_CR_SANDBOX_DATABASE_URL || process.env.SANDBOX_DATABASE_URL
  if (!url || !url.trim()) return null
  return url
}

function getSandboxClient(): PrismaClient | null {
  if (sandboxDisabled) return null
  if (sandboxClient) return sandboxClient

  const url = getSandboxDatabaseUrl()
  if (!url) {
    sandboxDisabled = true
    return null
  }

  sandboxClient = new PrismaClient({
    datasources: {
      db: { url },
    },
    log: ['error'],
  })

  return sandboxClient
}

let schemaEnsured = false

async function ensureSandboxSchema(client: PrismaClient): Promise<void> {
  if (schemaEnsured) return

  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS virtual_cr_knowledge_items (
      id BIGSERIAL PRIMARY KEY,
      source_type VARCHAR(100) NOT NULL,
      source_id VARCHAR(191) NOT NULL,
      title VARCHAR(300) NOT NULL,
      content TEXT NOT NULL,
      source_channel VARCHAR(100),
      course_code VARCHAR(50),
      payload JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (source_type, source_id)
    )
  `)

  await client.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_virtual_cr_knowledge_source_type
      ON virtual_cr_knowledge_items(source_type)
  `)

  await client.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_virtual_cr_knowledge_course_code
      ON virtual_cr_knowledge_items(course_code)
  `)

  schemaEnsured = true
}

export async function upsertVirtualCrKnowledge(record: SandboxKnowledgeRecord): Promise<boolean> {
  const client = getSandboxClient()
  if (!client) return false

  try {
    await ensureSandboxSchema(client)
    await client.$executeRawUnsafe(
      `
      INSERT INTO virtual_cr_knowledge_items
        (source_type, source_id, title, content, source_channel, course_code, payload, created_at, updated_at)
      VALUES
        ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW(), NOW())
      ON CONFLICT (source_type, source_id)
      DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        source_channel = EXCLUDED.source_channel,
        course_code = EXCLUDED.course_code,
        payload = EXCLUDED.payload,
        updated_at = NOW()
      `,
      record.sourceType,
      record.sourceId,
      record.title,
      record.content,
      record.sourceChannel ?? null,
      record.courseCode ?? null,
      JSON.stringify(record.payload ?? {})
    )

    return true
  } catch (error) {
    console.error('[Virtual CR Sandbox] Upsert failed:', error)
    return false
  }
}
