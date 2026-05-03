# Virtual CR Progress Log

Last updated: 2026-05-02

## Completed

1. Added separate sandbox knowledge mirror support in web app.
2. Added sandbox helper module for upsert/create-table logic.
3. Wired Discord knowledge ingestion route to mirror data into sandbox.
4. Wired routine sync route to mirror routine knowledge into sandbox.
5. Added sandbox DB environment variable in web env template.
6. Updated discord-listener to support dedicated Virtual CR VPS API URL + fallbacks.
7. Updated internal API request helper to allow explicit base URL override.
8. Updated knowledge ingestor to target Virtual CR VPS endpoint path.
9. Updated AI chatbot docs to clarify VPS-hosted deployment model.

## Key Files Updated

- apps/web/src/lib/virtual-cr-sandbox.ts
- apps/web/src/app/api/v1/internal/knowledge/route.ts
- apps/web/src/app/api/v1/internal/knowledge/sync-routine/route.ts
- apps/web/.env.example
- services/discord-listener/src/config.ts
- services/discord-listener/src/lib/internal-api.ts
- services/discord-listener/src/services/knowledge-ingestor.ts
- services/discord-listener/.env.example
- docs/08_AI_CHATBOT.md

## Validation Done

1. discord-listener build passed.
2. web app type-check passed.

## Pending (VPS Go-Live)

1. Create/provision sandbox database on VPS.
2. Set VIRTUAL_CR_SANDBOX_DATABASE_URL in apps/web/.env (VPS runtime).
3. Set VIRTUAL_CR_API_URL and optional VIRTUAL_CR_API_FALLBACK_URLS in services/discord-listener/.env.
4. Deploy updated containers.
5. Trigger routine sync and verify sandbox rows are created.
6. Send one Discord test message and verify ingestion path.
7. Configure public ingress (recommended: Cloudflare Tunnel) if VPS has no public IP.

## Smoke Checks To Run On VPS

1. Health: GET /api/v1/health should return 200.
2. Internal routine sync call should return success with data counts.
3. Sandbox table should contain records in virtual_cr_knowledge_items.
4. Discord listener logs should show knowledge-ingestor success.

## Notes

- VPS with no public IP is compatible with this architecture.
- Public access requires tunnel/proxy/API gateway.
- Recommended free path: Vercel frontend + Cloudflare Tunnel for private VPS APIs.
