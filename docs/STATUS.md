# Project Status

Last updated: 2026-10-31T20:33:30+05:30
Last completed: Phase 0 — Feasibility Validation (Outcome 2 Locked)
In progress: none

## What exists right now
- `SYSTEM_DESIGN.md` — Technical architecture, component responsibilities, file size limits (150-250 lines), and production checklist. (done)
- `PLAN.md` — 11-phase development and evaluation plan with mandatory reporting protocol and resumption guidelines. (done)
- `DESIGN.md` — Operations dashboard visual and UX specification (anti-AI slop, 1 accent color, dense queue). (done)
- `Backend/.env` — Environment configuration containing `META_MODEL_API_KEY` (gitignored). (done)
- `docs/STATUS.md` — Living tracking document for agent resumption. (done)
- `docs/dataset_licenses.md` — Licensing and provenance record for SARD, UAV-SAR, NOMAD, and HERIDAL. (done)
- `docs/feasibility_results.md` — Honest ground-truth IoU audit and failure mode analysis for Phase 0. (done)
- `data/raw/` — 38 curated evaluation units (14 light, 16 heavy, 8 negatives). (done)
- `data/raw/manifest.json` — Structured manifest linking IDs, categories, and ground truth. (done)

## Decisions locked in
- **Phase 0 Checkpoint: OUTCOME 2 Locked.** Project is strictly decision support / backlog prioritization, NOT autonomous detection.
- **Audited Metrics:** 85.7% light occlusion recall, 62.5% heavy occlusion recall (IoU >= 0.5), 12.5% false positive rate on negative controls.
- **Failure Mode Documented:** Foliage false alarms leak into top ranks (`neg_03` at Rank 9). System must never assert survivor certainty.
- **Production Prompt Set:** Pruned to `["person", "clothing"]`.
- **Vocabulary Constraint:** Strictly `possible-high`, `possible-medium`, and `possible-low`.

## Known issues / open questions
- Need false-positive dampener in perception layer (Phase 4.4) to reduce shadow/texture false alarms.

## Next action
- Phase 1: Research & Ethical/Scope Framing (`docs/product_framing.md`).
