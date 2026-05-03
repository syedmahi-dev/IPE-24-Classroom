-- Virtual CR Sandbox DB bootstrap
-- ⚠️  Run this ONLY in the SEPARATE Virtual CR Supabase project.
-- ⚠️  NEVER run this against the main IPE-24 production database.
-- Safe to run multiple times (all statements are IF NOT EXISTS).

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- If you use a dedicated schema instead of a dedicated database, keep this schema.
CREATE SCHEMA IF NOT EXISTS virtual_cr;

CREATE TABLE IF NOT EXISTS virtual_cr.virtual_cr_knowledge_items (
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
);

CREATE INDEX IF NOT EXISTS idx_virtual_cr_knowledge_source_type
  ON virtual_cr.virtual_cr_knowledge_items(source_type);

CREATE INDEX IF NOT EXISTS idx_virtual_cr_knowledge_course_code
  ON virtual_cr.virtual_cr_knowledge_items(course_code);

-- Optional: updated_at auto-maintainer
CREATE OR REPLACE FUNCTION virtual_cr.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_virtual_cr_knowledge_updated_at
  ON virtual_cr.virtual_cr_knowledge_items;

CREATE TRIGGER trg_virtual_cr_knowledge_updated_at
BEFORE UPDATE ON virtual_cr.virtual_cr_knowledge_items
FOR EACH ROW EXECUTE FUNCTION virtual_cr.set_updated_at();
