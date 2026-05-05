# 22 — Virtual CR Separate DB Setup

This guide creates a separate persistence layer for Virtual CR knowledge.

## Goal

Keep Virtual CR knowledge in an isolated storage target so Discord and routine data mirror into a sandbox datastore.

## Recommended Options

1. Best isolation: separate Supabase project (separate database).
2. Lower cost fallback: separate schema in same Supabase project (`virtual_cr`).

## Prerequisites

1. Existing web app env already supports `VIRTUAL_CR_SANDBOX_DATABASE_URL`.
2. Existing listener env already supports `VIRTUAL_CR_API_URL` and `VIRTUAL_CR_API_FALLBACK_URLS`.
3. Web app and listener code are updated.

## Step 1: Create Target DB/Schema

### Option A (separate database)

1. Create a new Supabase project.
2. Copy the pooled connection string from Project Settings -> Database.
3. Use that URL for `VIRTUAL_CR_SANDBOX_DATABASE_URL`.

### Option B (same database, separate schema)

1. Use current database URL and append schema parameter if needed.
2. Keep isolation by using schema `virtual_cr`.

## Step 2: Initialize Sandbox Objects

Run SQL script:

- [apps/web/scripts/virtual-cr-sandbox-init.sql](apps/web/scripts/virtual-cr-sandbox-init.sql)

Run it in the target sandbox DB (or Supabase SQL Editor for schema mode).

## Step 3: Configure Environment

Set these values:

1. Web runtime (Vercel env):
   - `VIRTUAL_CR_SANDBOX_DATABASE_URL=<sandbox_db_url>`
2. Discord listener runtime (VPS env):
   - `VIRTUAL_CR_API_URL=<your_vercel_base_url_or_virtual_cr_endpoint>`
   - `VIRTUAL_CR_API_FALLBACK_URLS=<optional_comma_separated_urls>`

## Step 4: Deploy

1. Push changes to `main` for web (Vercel auto-deploy).
2. Deploy listener changes to VPS using your Portainer compose flow.

## Step 5: Verify

1. Trigger routine sync endpoint once.
2. Send one Discord message through listener flow.
3. Check records in target sandbox table:
   - `virtual_cr.virtual_cr_knowledge_items`

## Quick Validation Queries

```sql
SELECT COUNT(*) AS total_rows FROM virtual_cr.virtual_cr_knowledge_items;

SELECT source_type, source_id, title, updated_at
FROM virtual_cr.virtual_cr_knowledge_items
ORDER BY updated_at DESC
LIMIT 20;
```

## Notes

1. If using a fully separate DB, table may live in `public` or `virtual_cr`; choose one and stay consistent.
2. Current app code can auto-create `public.virtual_cr_knowledge_items`; SQL bootstrap above gives stronger explicit control with schema isolation.
3. Keep internal API protection enabled (`x-internal-secret`) for ingestion routes.
