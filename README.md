# Project Triage

Project Triage is a decision-support dashboard for search-and-rescue video review. It ingests
drone or body-camera batches, samples them into reviewable units, asks Meta SAM 3.1 for visual
candidate signals, and uses Meta Muse Spark 1.3 to prioritize human attention.

**It does not claim that a person is present.** Every result is a candidate signal
and every source unit remains available to a human reviewer.

## Run locally

1. Copy `.env.example` to `.env` and set `META_MODEL_API_KEY`.
2. Keep `META_MODEL_API_BASE_URL` pointed at the Meta Model API endpoint.
3. Install and build:

```bash
npm run install:all
npm run build
npm start
```

The production server serves the built dashboard and API from the configured `PORT` (4000 by
default). Open `http://127.0.0.1:4000`. For separate Vite development, run the backend with
`npm run dev:backend`, set `VITE_DEV_API_PROXY_TARGET`, and run `npm run dev:frontend`.

## Architecture

```text
input files → ingestion/normalization → SAM 3.1 candidate signals
           → Muse Spark comparative ranking → SQLite/API → human review dashboard
```

- `backend/src/ingestion/` validates files, samples video at 1 fps, normalizes images to 800px
  JPEG, and writes a manifest.
- `backend/src/perception/` runs the validated `person` and `clothing` prompts with bounded
  concurrency and retains failures for review.
- `backend/src/prioritization/` validates Muse Spark JSON, enforces the three confidence labels,
  and falls back to explicit manual-review items when ranking is unavailable.
- `backend/src/jobs/`, `backend/src/routes/`, and `backend/src/storage/` provide the async state
  machine, REST API, SQLite persistence, and audit trail.
- `frontend/src/` provides Ingest, Priority Queue, Clip Review, Audit, Overview, Benchmarks,
  Telemetry, and System & Scope views.

## API

- `POST /api/jobs` accepts multipart uploads or the documented `{ sourceLabel, units }` contract.
- `GET /api/jobs/:jobId` reports state and progress.
- `GET /api/jobs/:jobId/queue` returns the complete ranked queue.
- `GET /api/candidates/:candidateId` returns source media, boxes, reasoning, and evidence IDs.
- `GET /api/jobs/:jobId/audit` and `POST /api/candidates/:candidateId/decision` expose traceability
  and human review actions.
- `GET /health` is the deployment health check.

## Evaluation and limitations

The Phase 0 baseline measured 85.7% strict recall on light occlusion, 62.5% on heavy occlusion,
and a 12.5% negative-control false-alarm rate. After calibration, the Phase 9 evaluation measured
100% Precision@10 on its 38-unit labeled suite, while still documenting misses and a terrain-shadow
false alarm. These are benchmark results, not a field guarantee.

The prototype uses local SQLite and local media storage. Free-tier filesystem persistence is not
assured across restarts. Real deployment would require formal SAR partnerships, data-use
agreements, broader field validation, and a persistent hosted store.

## Data and attribution

Evaluation uses academic, simulated search-and-rescue imagery only; no real disaster casualty
footage is included. Dataset provenance and attribution requirements are recorded in
[`docs/dataset_licenses.md`](docs/dataset_licenses.md).

## Hackathon materials

- [`docs/demo_video_script.md`](docs/demo_video_script.md)
- [`docs/submission_draft.md`](docs/submission_draft.md)
- [`docs/test_results.md`](docs/test_results.md)
- [`SYSTEM_DESIGN.md`](SYSTEM_DESIGN.md) and [`DESIGN.md`](DESIGN.md)
