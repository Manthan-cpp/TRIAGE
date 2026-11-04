# SYSTEM_DESIGN.md — Triage

`PLAN.md` says what to build and in what order. This file says how it fits together, and —
critically — states the explicit engineering discipline this project follows so that the
codebase stays reusable, feasible to extend, and actually deployable. Section 5 and Section 6
exist specifically because a prior hackathon project (built with a different AI coding tool, in
Google Antigravity) produced a codebase that was disorganized, hard to reuse, and not actually
deployable to Render without substantial manual rework after the fact. **That experience is the
direct reason these sections exist, and they are not optional guidance — every phase in
`PLAN.md` is expected to follow them from its very first file, not retrofit them later.**

---

## 1. High-Level Data Flow

```
┌──────────────┐     ┌───────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Footage/     │────▶│  Ingestion &       │────▶│  Perception Layer │────▶│  Prioritization   │
│  image batch  │     │  Normalization     │     │  (SAM 3.1)        │     │  Layer            │
│  (upload or   │     │  (Phase 3)         │     │  (Phase 4)        │     │  (Muse Spark)     │
│  dataset)     │     │                    │     │                   │     │  (Phase 5)        │
└──────────────┘     └───────────────────┘     └──────────────────┘     └────────┬─────────┘
                                                                                     │
┌──────────────┐     ┌───────────────────┐     ┌──────────────────┐               │
│  Reviewer     │◀────│  Review Dashboard  │◀────│  Backend API +    │◀──────────────┘
│  (human)      │     │  (Phase 7)         │     │  Job Queue        │
└──────────────┘     └───────────────────┘     │  (Phase 6)        │
                                                  └──────────────────┘
```

**This is deliberately a batch/async pipeline, not a live/real-time one.** Footage is uploaded
or selected, processed over seconds-to-minutes in the background, and reviewed afterward. There
is no latency-critical path anywhere in this system, which removes an entire category of
architectural complexity (and a common source of overclaimed "zero-latency" hackathon demos)
that a different kind of project — a live camera feed, for instance — would have to solve.
Do not introduce streaming/real-time complexity into this project; it is not needed and it is
not what this system is for.

---

## 2. Component Responsibilities

### 2.1 Ingestion & Normalization (Phase 3)
- Accepts raw input (image or video clip), validates it, samples video into representative
  frames at a documented rate, and produces a manifest of processable units. This is the only
  place in the system that touches raw files — everything downstream works with the manifest and
  normalized frames/images, never with raw uploads directly.

### 2.2 Perception Layer — SAM 3.1 (Phase 4)
- Takes the manifest, calls SAM 3.1 with the Phase-0-validated candidate-signal prompt set,
  normalizes the raw API output into structured candidate records, and applies a false-positive
  dampening filter calibrated against Phase 0's measured baseline.
- **This layer never decides what to show a reviewer or how to rank anything** — it only
  produces evidence. Keeping detection and ranking cleanly separated (rather than one giant
  function that calls both APIs and decides everything) is what makes each layer independently
  testable and replaceable — if a better segmentation model becomes available later, only this
  layer needs to change.

### 2.3 Prioritization Layer — Muse Spark (Phase 5)
- Takes candidate records, groups them for comparative reasoning, and produces a schema-validated
  ranked queue with human-readable justification and evidence citations per item.
- Enforces the Phase 1.2 vocabulary rules **inside the prompt itself**, not only in the frontend
  — the frontend should never need to "clean up" or rephrase what this layer returns; if the
  model's raw output ever needs rephrasing before display, that is a sign the prompt needs
  fixing here, not a problem to paper over downstream.

### 2.4 Backend Service — Job Queue, API, Storage (Phase 6)
- Orchestrates the above two layers as a background job, exposes a small REST API, and persists
  results. This is the layer most at risk of becoming an unmanageable monolith if not built with
  explicit discipline from the start — see Section 5 below.

### 2.5 Review Dashboard (Phase 7)
- A thin presentation layer. It should contain **no business logic** — no ranking decisions, no
  confidence-threshold logic, no data transformation beyond what's needed to render what the API
  already returned. If the frontend ever needs to "figure out" something the backend didn't
  already tell it, that logic belongs in the backend, not duplicated or improvised in a
  component.

---

## 3. Why Async Job Queue, Not Request/Response

A naive implementation might expose a single API endpoint that accepts footage and, in one
request, runs ingestion → SAM 3.1 → Muse Spark → returns a ranked list. **This will not work
well in practice** for two concrete reasons:

1. Processing a batch of footage through two chained AI API calls per unit takes meaningfully
   longer than a typical HTTP request timeout, especially as batch size grows — a synchronous
   design either times out or forces the frontend to hold a connection open indefinitely.
2. A reviewer should be able to start a batch, leave, and come back to check progress or partial
   results — this is how the real tool this project models would actually be used, and designing
   for it from the start (Phase 6.1's state machine) is far cheaper than retrofitting it after
   the fact.

The job queue does not need to be a separate infrastructure service (no Redis, no message
broker) given this project's scale — an in-process queue backed by the lightweight local store
is sufficient, keeps the system deployable as a single process on a free-tier host, and avoids
adding infrastructure dependencies that complicate deployment for no real benefit at this scale.

---

## 4. API Contracts

### `POST /api/jobs`
```
Request:  { sourceLabel: string, units: [{ type: "image"|"video", fileRef: string }] }
Response: { jobId: string, status: "queued" }
```

### `GET /api/jobs/:jobId`
```
Response: {
  jobId: string,
  status: "queued" | "ingesting" | "detecting" | "ranking" | "complete" | "failed",
  progress: { total: number, processed: number },
  completedAt?: string
}
```

### `GET /api/jobs/:jobId/queue`
```
Response: {
  jobId: string,
  rankedItems: [{
    candidateId: string,
    priorityRank: number,
    confidenceLabel: "possible-high" | "possible-medium" | "possible-low",
    reasoningSummary: string,
    thumbnailUrl: string
  }]
}
```

### `GET /api/candidates/:candidateId`
```
Response: {
  candidateId: string,
  sourceFrameUrl: string,
  maskOverlayData: object,
  fullReasoningText: string,
  evidenceIds: string[],
  sourceMetadata: { clipId: string, timestampSec?: number, datasetLabel: string }
}
```

Keep these contracts stable once Phase 6/7 lock them in — do not let the frontend reach into
backend internals or assume a shape that isn't explicitly part of this contract. If a new field
is needed, add it here first and treat this file as the source of truth, updating it alongside
the code change.

---

## 5. Code Organization Rules (mandatory — this is the core fix for the prior project's problems)

These rules apply from the **very first file written** in this project, not after the fact.

### 5.1 File size and single responsibility
- **No file should exceed roughly 150–250 lines as a soft target.** If a file is growing past
  that while implementing a phase, that is a signal to split it along natural responsibility
  boundaries (e.g. separate the API-calling logic from the data-normalization logic from the
  validation logic), not a reason to keep adding to one file because it's "all related to the
  same feature." A feature being conceptually related does not mean its implementation belongs
  in one file — this was the specific failure mode of the prior project (1000+ line files for
  features that did not need anywhere near that).
- Every module should be describable in one sentence: "this file does X." If that sentence needs
  "and," the file likely needs to be split.

### 5.2 Directory structure reflects responsibility, not feature name
- Organize by what a module *does* (`ingestion/`, `perception/`, `prioritization/`, `jobs/`,
  `routes/`, `storage/`) rather than bundling an entire feature's frontend, backend, and data
  logic into one same-named folder. This keeps each layer independently testable and makes it
  obvious where new code belongs.

### 5.3 No duplicated logic
- If the same validation, formatting, or transformation logic is needed in two places, it goes
  into a shared utility module, not copy-pasted. Before writing a new helper function, check
  whether an equivalent already exists in the codebase.

### 5.4 Explicit interfaces between layers
- Each layer (ingestion, perception, prioritization, storage) should expose a small, explicit
  set of functions/methods that other layers call — not reach into another layer's internal data
  structures directly. This is what makes Section 4's API contracts meaningful and what allows
  any one layer to be modified or replaced without rippling changes through the whole codebase.

### 5.5 Configuration, not hardcoding
- API keys, URLs, file paths, and any value that differs between local development and the
  deployed environment must come from environment variables (via `.env` locally, platform
  environment variables when deployed) — never hardcoded, never committed. This is both a
  security practice and, directly, a deployability requirement (Section 6).

---

## 6. Production-Readiness Checklist (apply in Phase 10, but build toward it from Phase 2 onward)

This checklist exists specifically because of the prior project's deployment failure, where
code that "worked" in the development environment was not actually deployable without
significant manual rework. Every item here is something that should be true continuously, not
discovered and fixed only at the end:

- [x] **No hardcoded `localhost` URLs anywhere** — frontend-to-backend communication uses an
      environment-configured base URL, so the exact same build works locally and once deployed.
- [x] **A real start script exists** (`npm start` or equivalent) that runs the production build,
      not the dev server — confirm this is what the hosting platform will actually invoke.
- [x] **The backend binds to the port provided by the hosting platform's environment variable**
      (e.g. `process.env.PORT`), not a hardcoded port number — this is one of the most common,
      entirely avoidable reasons a Node service fails to deploy on Render/Railway/similar
      platforms.
- [x] **A health-check endpoint exists** (e.g. `GET /health` returning a simple 200 OK) — hosting
      platforms use this to confirm the service is actually running, and it is also useful for
      the Phase 10.5 remote smoke test.
- [x] **No secrets committed to the repository, ever** — verify this explicitly before each
      deploy, not just assumed from `.gitignore` being present.
- [x] **The lightweight local data store's file path is configurable**, not hardcoded to a path
      that only exists on the development machine — on most free-tier hosts, local filesystem
      writes may not persist across restarts/redeploys, so document this limitation explicitly
      in `docs/system_notes.md` rather than being surprised by it during Phase 10.
- [x] **Dependencies are pinned to real, installed versions** (a real `package-lock.json`
      committed, not just a loose `package.json` range) — this is what makes "it works on my
      machine" actually reproducible on a fresh deploy.
- [x] **The app does not crash on missing/invalid optional configuration** — it should fail
      clearly and loudly for genuinely required config (like a missing API key) but not crash on
      anything that has a sensible default.
- [x] **A production build has actually been run and smoke-tested locally** (Phase 10.2) before
      the first real deploy attempt — do not let the hosting platform's deploy step be the first
      time the production build is actually exercised.

---

## 7. Data Persistence Model

Given this project's scale (a hackathon demo processing dataset-sized batches, not a real
production SAR deployment), a single embedded, file-based store (SQLite, or an equivalent
simple persistence layer) is the right choice — it requires no separate hosted database service,
keeps the project genuinely zero-cost, and keeps deployment to a single process. Document this
choice's known limitation explicitly (Section 6's point on filesystem persistence on free
hosting tiers) rather than treating it as a hidden gap discovered during Phase 10.

Tables/collections needed, at minimum: `jobs`, `candidate_records`, `ranked_queue_items`,
`audit_log` (Phase 8.2). Keep the schema for each as narrow as what Section 4's API contracts
actually need to return — do not store speculative fields "in case they're useful later."

---

## 8. Known Architectural Risks (carried from `PLAN.md` Phase 0)

- **Detection/ranking accuracy is the core, honestly-uncertain risk**, exactly as established in
  `PLAN.md` Phase 0 — this system design assumes Phase 0's empirical measurement determines how
  confidently the product can be presented, not that SAM 3.1 "just works" on this hard domain.
- **Free-tier hosting filesystem persistence is not guaranteed across restarts** — this is a
  known, documented limitation of the chosen zero-cost deployment approach, not a bug to be
  surprised by. For a hackathon demo this is an acceptable trade-off; a real deployment would
  need a persistent, hosted database, explicitly noted as future work in
  `docs/product_framing.md`.
- **Batch API cost scales with footage volume** — the Phase 2.4 cost log and Phase 6.1's queue
  design both exist partly to keep this visible and bounded rather than discovering a credit
  shortfall mid-demo-prep.
