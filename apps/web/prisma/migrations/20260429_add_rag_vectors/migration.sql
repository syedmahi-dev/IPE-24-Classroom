-- Enable pgvector extension (Supabase supports this natively)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to knowledge_chunks (768 dimensions for Gemini text-embedding-004)
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Create HNSW index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding
  ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);

-- Add dedup/tracking columns to knowledge_documents
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS source_id TEXT;
ALTER TABLE knowledge_documents ADD COLUMN IF NOT EXISTS source_channel TEXT;

-- Unique constraint for deduplication (only where source_id is not null)
CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_docs_source
  ON knowledge_documents (source_type, source_id) WHERE source_id IS NOT NULL;
