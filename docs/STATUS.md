# Project Status

Last updated: 2026-10-31T20:58:30+05:30
Last completed: Phase 1 — Research & Ethical/Scope Framing
In progress: none

## What exists right now
- `SYSTEM_DESIGN.md` — Technical architecture, component responsibilities, file size limits (150-250 lines), and production checklist. (done)
- `PLAN.md` — 11-phase development and evaluation plan with mandatory reporting protocol and resumption guidelines. (done)
- `DESIGN.md` — Operations dashboard visual and UX specification (anti-AI slop, 1 accent color, dense queue). (done)
- `Backend/.env` — Environment configuration containing `META_MODEL_API_KEY` (gitignored). (done)
- `docs/STATUS.md` — Living tracking document for agent resumption. (done)
- `docs/dataset_licenses.md` — Licensing, provenance, and README-ready ethical statement. (done)
- `docs/feasibility_results.md` — Honest ground-truth IoU audit and failure mode analysis for Phase 0 (Outcome 2). (done)
- `docs/product_framing.md` — Locked target user profile, non-negotiable vocabulary rules, confidence labels, and zero-dismissal rule. (done)
- `data/raw/` — 38 curated evaluation units (14 light, 16 heavy, 8 negatives). (done)
- `data/raw/manifest.json` — Structured manifest linking IDs, categories, and ground truth. (done)

## Decisions locked in
- **Phase 0 Outcome 2 Locked:** Assistive backlog triage only, never autonomous survivor detection. 85.7% light / 62.5% heavy occlusion recall, 12.5% negative false alarms.
- **Phase 1 Framing Locked:**
  - Strict Banned Words: `"detected"`, `"confirmed"`, `"survivor found"`, `"victim located"`, `"guaranteed"`.
  - Strict Approved Words: `"flagged for review"`, `"candidate signal"`, `"priority rank"`, `"possible indicator"`.
  - Confidence Tokens: Exclusively `possible-high`, `possible-medium`, `possible-low`.
  - Zero-Dismissal: All clips remain visible and reviewable; low confidence items are reordered, never hidden.
- **Production Prompt Set:** Pruned to `["person", "clothing"]`.
- **Architecture:** Async in-process job queue, SQLite persistence, modular backend (max 150-250 lines/file).

## Known issues / open questions
- Phase 2 scaffolding: need to configure shared cost/usage logging and TypeScript/Node skeleton for backend and React+Vite for frontend.

## Next action
- Phase 2: Environment & Meta API Setup (scaffolding `backend/`, `frontend/`, `.env.example`, linting, API client modules, and cost logger).
