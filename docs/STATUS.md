# Project Status

Last updated: 2026-11-01T16:36:00+05:30
Last completed: Phase 6 — Backend Service Architecture (Job Queue, API, Storage)
In progress: none

## What exists right now
- `SYSTEM_DESIGN.md` — Technical architecture, component responsibilities, file size limits (150-250 lines), and production checklist. (done)
- `PLAN.md` — 11-phase development and evaluation plan with mandatory reporting protocol and resumption guidelines. (done)
- `DESIGN.md` — Operations dashboard visual and UX specification (anti-AI slop, 1 accent color, dense queue). (done)
- `docs/system_notes.md` — Frame sampling rules (1 fps default), image normalization specifications (max 800px, JPEG 85%), manifest schema, storage layouts, job state machine. (done)
- `Backend/.env` & `.env` — Environment configuration containing `META_MODEL_API_KEY` (gitignored). (done)
- `.env.example` — Template environment variables for local dev and deploy. (done)
- `docs/STATUS.md` — Living tracking document for agent resumption. (done)
- `docs/dataset_licenses.md` — Licensing and provenance record. (done)
- `docs/feasibility_results.md` — Honest ground-truth IoU audit and failure mode analysis for Phase 0 (Outcome 2). (done)
- `docs/product_framing.md` — Locked target user profile, non-negotiable vocabulary rules, confidence labels. (done)
- `docs/latency_analysis.md` — Root cause analysis, live benchmark results, and optimization roadmap. (done)
- `data/raw/` — 38 curated evaluation units (14 light, 16 heavy, 8 negatives). (done)
- `data/cost_log.json` — Live API cost and latency tracking log. (done)
- `data/triage.db` — SQLite database file initialized with WAL mode and foreign key constraints. (done)
- `backend/` — Node/TypeScript production backend service with `better-sqlite3`, `express`, `sharp`, `tsx`, and client wrappers:
  - `src/lib/costLogger.ts` — Persistent cost and latency logger. (done)
  - `src/lib/metaClient.ts` — Authenticated HTTP client with retries (429/5xx) and abort controller. (done)
  - `src/perception/prompts.ts` — Validated prompt set (`person`, `clothing`) with documented rationale. (done)
  - `src/perception/candidateTypes.ts` — Structured `CandidateSignalRecord` and `PerceptionBatchResult` types. (done)
  - `src/perception/falsePositiveDampener.ts` — Evaluates detections, penalizes sub-threshold isolated boxes, protects corroborated signals, respects zero-dismissal rule. (done)
  - `src/perception/sam31Client.ts` — SAM 3.1 client: parallel prompt execution + image resize + EXIF rotation. (done)
  - `src/perception/perceptionRunner.ts` — Bounded concurrency runner consuming `JobManifest`, isolated per-unit try/catch. (done)
  - `src/prioritization/contextAggregator.ts` — Transforms candidate records into comparative ranking summaries with spatial box area fractions. (done)
  - `src/prioritization/prioritizer.ts` — Multi-batch coordinator enforcing vocabulary locks, contiguous 1..N ranks, guardrail sanitization, and outputting `thumbnailUrl`. (done)
  - `src/prioritization/museSparkClient.ts` — Muse Spark 1.3 client: zero-detect early-exit + markdown fence stripper. (done)
  - `src/ingestion/fileValidator.ts` — File extension and size validation for images/videos. (done)
  - `src/ingestion/storage.ts` — Directory manager for `data/ingested/<jobId>/{raw,normalized}/` and metadata persistence. (done)
  - `src/ingestion/frameSampler.ts` — Sharp image resizer & FFmpeg 1 fps video frame extractor. (done)
  - `src/ingestion/manifestGenerator.ts` — Standardized batch manifest creator and serializer. (done)
  - `src/ingestion/ingestionPipeline.ts` — Unified pipeline orchestrating validation, storage, sampling, and manifest generation. (done)
  - `src/storage/database.ts` — `better-sqlite3` instance manager with WAL mode and schema auto-migration. (done)
  - `src/storage/jobRepository.ts` — SQLite repository with atomic transactions for jobs, units, candidates, and queue items. (done)
  - `src/jobs/jobQueue.ts` — In-process async background queue orchestrating the full pipeline across state machine stages. (done)
  - `src/routes/jobs.ts` — Express router for `POST /api/jobs`, `GET /api/jobs/:id`, `GET /api/jobs/:id/queue`. (done)
  - `src/routes/candidates.ts` — Express router for `GET /api/candidates/:candidateId`. (done)
  - `src/routes/media.ts` — Express router for safe streaming of `/api/media/*` assets with directory traversal protection. (done)
  - `src/server.ts` — Express application factory with CORS, JSON body parser, and `/health` endpoint. (done)
  - `src/index.ts` — Standalone service entry point with graceful shutdown handling. (done)
  - `src/scripts/testService.ts` — End-to-end HTTP service integration test validating all API contracts and state machine transitions. (done)
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
- **Phase 4 Perception Architecture Locked:**
  - Prompts: `person` (weight 1.0) and `clothing` (weight 0.8).
  - Bounded concurrency: 3 concurrent units with intra-frame parallel prompts.
  - False positive dampener flags solitary micro-boxes (<0.3% frame area) while never dismissing units.
  - Candidate records output to `data/ingested/<jobId>/candidates.json`.
- **Phase 5 Prioritization Architecture Locked:**
  - Comparative ranking via Muse Spark 1.3 across aggregated candidate summaries.
  - Guardrail sanitizer actively removes banned certainty vocabulary from reasoning text.
  - Contiguous ascending priority ranks (1, 2, 3...) sorted by confidence tier and comparative strength.
  - Output persisted to `data/ingested/<jobId>/prioritized_queue.json`.
- **Phase 6 Service Architecture Locked:**
  - In-process async `JobQueue` with state machine: `queued -> ingesting -> detecting -> ranking -> complete`.
  - SQLite storage (`data/triage.db`) via `better-sqlite3`.
  - Express API contracts match Section 4 (`POST /api/jobs`, `GET /api/jobs/:id`, `GET /api/jobs/:id/queue`, `GET /api/candidates/:id`, `GET /health`).

## Next action
- Phase 7: Frontend Review Dashboard (Vite + React + TypeScript, tab-based navigation, Priority Queue tab, Clip Review modal, System Stats).
