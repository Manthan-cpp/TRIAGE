# Project Status

Last updated: 2026-11-01T19:50:00+05:30
Last completed: Full Codebase Audit & System Design Verification
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
- `docs/test_results.md` — Phase 9 full-scale evaluation results across all 38 ground-truth cases: 100% Precision@10, 3 documented failure modes, before/after re-tuning metrics. (done)
- `docs/product_framing.md` — Locked target user profile, non-negotiable vocabulary rules, confidence labels. (done)
- `docs/latency_analysis.md` — Root cause analysis, live benchmark results, and optimization roadmap. (done)
- `data/raw/` — 38 curated evaluation units (14 light, 16 heavy, 8 negatives). (done)
- `data/cost_log.json` — Live API cost and latency tracking log. (done)
- `data/triage.db` — Canonical SQLite database file initialized with WAL mode, foreign key constraints, `audit_logs`, and `reviewer_decisions`. (done)
- `backend/` — Node/TypeScript production backend service:
  - `src/lib/costLogger.ts` — Persistent cost and latency logger. (done)
  - `src/lib/metaClient.ts` — Authenticated HTTP client with retries (429/5xx) and abort controller. (done)
  - `src/perception/prompts.ts` — Validated prompt set (`person`, `clothing`) with documented rationale. (done)
  - `src/perception/candidateTypes.ts` — Structured `CandidateSignalRecord` and `PerceptionBatchResult` types. (done)
  - `src/perception/falsePositiveDampener.ts` — Evaluates detections in normalized 0..1000 coordinate space, penalizes sub-threshold isolated boxes, protects corroborated signals, respects zero-dismissal rule. (done)
  - `src/perception/sam31Client.ts` — SAM 3.1 client: parallel prompt execution + image resize + EXIF rotation. (done)
  - `src/perception/perceptionRunner.ts` — Bounded concurrency runner consuming `JobManifest`, isolated per-unit try/catch. (done)
  - `src/prioritization/contextAggregator.ts` — Transforms candidate records into comparative ranking summaries with spatial box area fractions. (done)
  - `src/prioritization/prioritizer.ts` — Multi-batch coordinator enforcing vocabulary locks, regex sanitization, contiguous 1..N ranks, and outputting `thumbnailUrl`. (done)
  - `src/prioritization/museSparkClient.ts` — Muse Spark 1.3 client: zero-detect early-exit + markdown fence stripper. (done)
  - `src/ingestion/fileValidator.ts` — File extension and size validation for images/videos. (done)
  - `src/ingestion/storage.ts` — Directory manager for `data/ingested/<jobId>/{raw,normalized}/` and metadata persistence. (done)
  - `src/ingestion/frameSampler.ts` — Sharp image resizer & FFmpeg 1 fps video frame extractor. (done)
  - `src/ingestion/manifestGenerator.ts` — Standardized batch manifest creator and serializer. (done)
  - `src/ingestion/ingestionPipeline.ts` — Unified pipeline orchestrating validation, storage, sampling, and manifest generation. (done)
  - `src/storage/database.ts` — `better-sqlite3` instance manager with WAL mode, robust project-root path resolution, and schema auto-migration. (done)
  - `src/storage/jobRepository.ts` — SQLite repository with atomic transactions for jobs, units, candidates, and queue items. (done)
  - `src/storage/auditRepository.ts` — Append-only audit logger and reviewer decision store for chain of custody. (done)
  - `src/jobs/jobQueue.ts` — In-process async background queue orchestrating pipeline across state machine stages with audit log recording. (done)
  - `src/routes/jobs.ts` — Express router for `POST /api/jobs` (supporting multipart, demoDataset, and SYSTEM_DESIGN Section 4 `units` contract), `GET /api/jobs/:id`, `GET /api/jobs/:id/queue`. (done)
  - `src/routes/candidates.ts` — Express router for `GET /api/candidates/:candidateId` adhering to SYSTEM_DESIGN contract. (done)
  - `src/routes/media.ts` — Express router for safe streaming of `/api/media/*` assets with directory traversal protection. (done)
  - `src/routes/audit.ts` — Express router for `GET /api/jobs/:id/audit`, `GET /api/audit`, and `POST /api/candidates/:id/decision`. (done)
  - `src/server.ts` — Express application factory with CORS, JSON body parser, `/health` endpoint, and static SPA serving from `frontend/dist`. (done)
  - `src/index.ts` — Standalone service entry point with graceful shutdown handling. (done)
  - `src/scripts/testService.ts` — End-to-end HTTP service integration test. (done)
  - `src/scripts/testAudit.ts` — Audit log and reviewer decision persistence test. (done)
- `frontend/` — Monotonous maximalist review dashboard (Vite + React 19 + TypeScript + Lucide):
  - Strict anti-AI-slop design: 0 glowing borders, 0 glowing buttons, 0 glowing pills/tags, single functional accent (`#2563eb`), 0 emojis.
  - Smooth animations throughout: CSS cross-tab transitions (`tabFadeInSlide`), tactile active button press, smooth table row hovers, smooth progress bar fills.
  - Dynamic media URL resolver (`resolveMediaUrl`) ensuring thumbnail and full-frame assets resolve correctly across separate origins (Vercel/Render) and unified local builds.
  - Dedicated 8-tab operational layout:
    1. **Ingest Batch (`ingest`)** — Upload drone sweeps, 1-click academic benchmarks (`eval_mix`), live 5-stage state tracker.
    2. **Priority Queue (`queue`)** — Dense triage table, instant multi-field search, tier filter buttons, rank #1..N, micro thumbnails, zero-dismissal banner.
    3. **Clip Review (`clip`)** — 2-column forensic cockpit, SVG single-accent `#3b82f6` bounding box overlay, coordinates table, full Muse Spark reasoning, reviewer decision persistence.
    4. **Forensic Audit (`audit`)** — Full chain of custody event log with timestamps, stage chips, latency readouts, JSON download export.
    5. **Mission Overview (`overview`)** — Incident commander SAR cockpit, candidate breakdown KPI cards, review queue progress bar, Phase 9 calibrated metrics (100% Top-10 precision).
    6. **Feasibility Benchmarks (`benchmarks`)** — Phase 0 empirical validation report (85.7% light vs 62.5% heavy occlusion hit rate, Outcome 2 lock).
    7. **API Telemetry (`telemetry`)** — Live Meta API cost tracker ($0.0000 hackathon tier), Phase 2.5 latency optimization benchmark (74% faster), system diagnostics.
    8. **System & Scope (`settings`)** — Model cards (`sam-3.1`, `muse-spark-1.3`), strictly banned terminology cards (with Lucide icons, no emojis), dataset license attributions.
  - Keyboard navigation: `[1]` through `[8]` for tabs, `[J]` / `[K]` for candidate navigation.
  - All files strictly under 250 lines (conforming to Rule 5.1).

## Decisions locked in
- **Phase 0 Outcome 2 Locked:** Assistive backlog triage only, never autonomous detection.
- **Phase 1 Framing Locked:** Strict vocabulary lock (`possible-high`, `possible-medium`, `possible-low`), zero-dismissal rule.
- **Phase 2 Stack Locked:** TypeScript + tsx, SQLite via better-sqlite3, async job queue required.
- **Phase 7 UI Aesthetic Locked:** Monotonous maximalist operations dashboard, single functional accent color, zero AI slop, smooth animations in tab changes and micro-interactions, every concern in its own dedicated tab.
- **Phase 8 Evidence & Audit Locked:** Complete forensic chain of custody logged to `audit_logs` table and accessible via dedicated Forensic Audit tab.
- **Phase 9 Calibration Locked:** 100.0% Precision@10 verified; 7 of 8 negatives pushed to bottom ranks; zero-dismissal rule confirmed necessary to preserve occluded subjects (`sard_human_05`, `sard_human_06`).

## Next action
- Phase 10: Production-Grade Hardening & Deployment Prep.
