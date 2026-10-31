# Project Status

Last updated: 2026-10-31T21:51:00+05:30
Last completed: Phase 3 — Data Pipeline & Ingestion Architecture
In progress: none

## What exists right now
- `SYSTEM_DESIGN.md` — Technical architecture, component responsibilities, file size limits (150-250 lines), and production checklist. (done)
- `PLAN.md` — 11-phase development and evaluation plan with mandatory reporting protocol and resumption guidelines. (done)
- `DESIGN.md` — Operations dashboard visual and UX specification (anti-AI slop, 1 accent color, dense queue). (done)
- `docs/system_notes.md` — Frame sampling rules (1 fps default), image normalization specifications (max 800px, JPEG 85%), manifest schema, storage layouts. (done)
- `Backend/.env` & `.env` — Environment configuration containing `META_MODEL_API_KEY` (gitignored). (done)
- `.env.example` — Template environment variables for local dev and deploy. (done)
- `docs/STATUS.md` — Living tracking document for agent resumption. (done)
- `docs/dataset_licenses.md` — Licensing and provenance record. (done)
- `docs/feasibility_results.md` — Honest ground-truth IoU audit and failure mode analysis for Phase 0 (Outcome 2). (done)
- `docs/product_framing.md` — Locked target user profile, non-negotiable vocabulary rules, confidence labels. (done)
- `docs/latency_analysis.md` — Root cause analysis, live benchmark results, and optimization roadmap. (done)
- `data/raw/` — 38 curated evaluation units (14 light, 16 heavy, 8 negatives). (done)
- `data/cost_log.json` — Live API cost and latency tracking log. (done)
- `backend/` — Node/TypeScript project with `better-sqlite3`, `express`, `sharp`, `tsx`, and client wrappers:
  - `src/lib/costLogger.ts` — Persistent cost and latency logger. (done)
  - `src/lib/metaClient.ts` — Authenticated HTTP client with retries and abort controller. (done)
  - `src/perception/sam31Client.ts` — SAM 3.1 client: parallel prompt execution + image resize (Tier 1 optimizations). (done)
  - `src/prioritization/museSparkClient.ts` — Muse Spark 1.3 client: zero-detect early-exit + merged ranking. (done)
  - `src/ingestion/fileValidator.ts` — File extension and size validation for images/videos. (done)
  - `src/ingestion/storage.ts` — Directory manager for `data/ingested/<jobId>/{raw,normalized}/` and metadata persistence. (done)
  - `src/ingestion/frameSampler.ts` — Sharp image resizer & FFmpeg 1 fps video frame extractor. (done)
  - `src/ingestion/manifestGenerator.ts` — Standardized batch manifest creator and serializer. (done)
  - `src/ingestion/ingestionPipeline.ts` — Unified pipeline orchestrating validation, storage, sampling, and manifest generation. (done)
  - `src/scripts/testSam.ts` & `src/scripts/testMuse.ts` — Connectivity test suite. (done)
  - `src/scripts/benchmarkLatency.ts` — Sequential vs parallel latency benchmark. (done)
  - `src/scripts/testIngestion.ts` — End-to-end ingestion pipeline test with real and synthetic media. (done)
- `frontend/` — Scaffolded Vite + React + TypeScript application with `lucide-react`. (done)

## Decisions locked in
- **Phase 0 Outcome 2 Locked:** Assistive backlog triage only, never autonomous detection.
- **Phase 1 Framing Locked:** Strict vocabulary lock (`possible-high`, `possible-medium`, `possible-low`), zero-dismissal rule.
- **Phase 2 Stack Locked:** TypeScript + tsx, SQLite via better-sqlite3, async job queue required.
- **Phase 2.5 Latency Architecture Locked (Tier 1 — implemented):**
  - Parallel SAM prompts via `Promise.all` → 74% wall-time reduction confirmed (6722ms → 1722ms)
  - Image resize to 800px max via `sharp` before base64 encode → 71% payload reduction (336KB → 96KB)
  - Zero-detect early-exit in Muse Spark → saves ~11s for empty frames
- **Phase 3 Ingestion Rules Locked:**
  - 1 fps sampling rule for video clips via FFmpeg.
  - 800px max dimension, JPEG 85% for all units.
  - Manifest JSON (`data/ingested/<jobId>/manifest.json`) serves as immutable contract for perception and queue layers.

## Next action
- Phase 4: Core Perception Layer: SAM 3.1 Candidate Detection (`backend/src/perception/`) with prompt set definition, batch execution against manifest, structured candidate records, and false-positive dampener.
