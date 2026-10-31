# PLAN.md — Triage

A decision-support system for disaster search-and-rescue teams: ingests large volumes of
drone/bodycam footage, uses Meta's SAM 3.1 to flag visual candidates that may indicate a trapped
or visible person in debris, and uses Muse Spark to cross-reference and rank those candidates
into a prioritized review queue for a human rescuer. **This system never claims to detect a
survivor. It only ever says "a human reviewer should look at this clip first, and here is why."**
That distinction is the single most important design constraint in this entire project and it
governs every phase below.

This plan is written so that **any coding agent (Codex, Claude Code, Kimi, DeepSeek, or a fresh
session of any of them) can resume work at the start of any phase or sub-phase without the
earlier conversation history.** Read Section 0 before anything else, every single time this
project is picked up, whether that is five minutes after the last session or five days later.

---

## 0. MANDATORY REPORTING PROTOCOL — read this before touching any phase

**At the end of every phase, and every sub-phase, the agent must stop and report back to
Manthan in plain, simple language — not technical jargon, not a wall of code, not a diff dump.**
The report must cover exactly three things, every time, no exceptions:

1. **What was actually built or decided in this step** — concretely, in one or two sentences.
2. **Why it matters / what it means for the project** — the significance, not just the fact.
3. **What happens next** — the very next phase or sub-phase, named explicitly.

Keep it short. Do not restate the whole plan. Do not dump code into the chat unless explicitly
asked. This report is what lets Manthan track progress without reading every line of code
himself, so it has to be trustworthy and it has to be habitual — every single sub-phase, not
just every phase.

**The agent has freedom to make small implementation judgment calls** (variable names, minor
library choice between two reasonable options, file layout details not specified below) without
asking first. **The agent does NOT have freedom to assume away a requirement, skip a
sub-phase, silently change scope, or reinterpret the "decision-support only, never a detection
claim" constraint.** Where this plan is specific, follow it exactly. Where it is silent, use
good judgment and say what you assumed in the end-of-phase report.

---

## 1. How Any Agent Resumes Work Here

**Read `docs/STATUS.md` first, always, before doing anything else.** It does not exist yet — the
agent starting Phase 1 creates it, in this exact format, and every phase/sub-phase updates it
immediately before writing the report described in Section 0:

```markdown
# Project Status

Last updated: <ISO timestamp>
Last completed: <Phase N.M — name>
In progress: <Phase N.M — name, or "none">

## What exists right now
- <file/module> — <what it does, current state: done / partial / broken>

## Decisions locked in
- <anything settled that should not be re-litigated by a later agent — e.g. "Phase 0 confirmed
  candidate-detection precision is low on heavy occlusion; system scoped to flag-for-review only,
  never to assert presence/absence with confidence above 'possible'.">

## Known issues / open questions
- <anything unresolved that the next agent needs to know before continuing>

## Next action
- <the exact next command, file, or task — specific enough that a new agent needs no further
  clarification to start working>
```

Before starting **any** phase, verify its "Prerequisites" actually hold in the repo by looking —
do not trust `STATUS.md`'s claims blindly, spot-check that the files it says exist actually
exist and look complete. If this hackathon's tooling requires a separate turn-by-turn
conversation transcript (a `log.txt` driven by an `AGENTS.md`-style file, as has been the case in
other hackathons this builder has entered), that is a **separate, additional** artifact — keep
both `docs/STATUS.md` and any such transcript, never merge them into one file.

---

## 2. Meta Global AI Developer Hackathon — context every phase must respect

- 10-day virtual hackathon, organized by Meta + Cerebral Valley. Hackathon began 26 Oct 2026.
- Workshops/office hours: 27 Oct – 4 Nov 2026.
- **Project submission deadline: 5 Nov 2026, 6:30 AM IST** (per the official timeline as
  researched — reconfirm against the live submission portal before the actual final submit,
  since dates can shift and this builder has already seen one hackathon's deadline referenced
  inconsistently across sources).
- Judging: 5–9 Nov 2026. Winners announced 10 Nov 2026.
- Must build using Meta's models/tools: Meta Model API (Muse Spark, Muse Image), SAM 3.1,
  and/or open-weights Llama models. Using Meta's own Muse Code CLI is **not** a requirement —
  any coding tool/agent is acceptable, confirmed in this project's earlier research.
- $150 in Meta Model API credits per participant, already claimed for this builder's account.
  A Spend Limit notification should be active on the account so nothing bills past the free
  credit — verify this is still set before any heavy batch-processing phase (Phase 4 onward,
  where many SAM 3.1 calls happen in sequence).
- Tracks: Indie Developer or Startup. This project goes under **Indie Developer**.
- No official Meta-published judging rubric was found in prior research for this project; the
  generally observed pattern across 2026 AI hackathons weighs roughly: technical implementation
  (~25–30%), problem-solving/real-world impact (~25%), creativity/novelty (~20–25%),
  completeness/polish (~20%). This is a directional pattern from public hackathon-judging
  writeups, not a confirmed Meta document — reconfirm before finalizing the demo narrative.
- **This project's single biggest risk is overclaiming.** Earlier research in this project's
  history (see `docs/feasibility_results.md` once Phase 0 is complete) established that
  detecting humans in disaster-occlusion footage is a genuinely hard, actively-researched
  problem — specialized, purpose-trained academic models (not general-purpose ones) only
  achieve roughly 0.5–0.6 average precision on this exact task. **Every phase, every UI label,
  every line of the demo video script must reflect this honestly.** This system is a triage
  aid that ranks footage for human attention — it is not, and must never be presented as, a
  survivor-detection system.

---

## 3. Tech Stack

- **Frontend**: React + Vite, as a review dashboard web app — not a live camera app (this is
  fundamentally different from a real-time project; footage is uploaded/ingested and reviewed,
  not streamed live, which removes the latency-architecture problem entirely and should not be
  reintroduced for no reason).
- **Backend**: Node.js + Express, with an explicit async job-queue pattern (Phase 6) since
  processing many clips through two AI model calls each is a batch workload, not a
  request-response workload — treat it as such from the start rather than retrofitting a queue
  in later.
- **AI**: Meta Model API — SAM 3.1 (candidate-signal segmentation across footage) and
  Muse Spark (cross-clip reasoning, prioritization, and structured ranking output).
- **Storage**: A simple file-based or lightweight embedded store (e.g. SQLite) for job/result
  metadata — this project does not need a hosted database service; keep it zero-cost and
  simple, deployable as a single backend process.
- **Hosting (zero-cost)**: Frontend on Vercel/Netlify free tier; backend on Render free tier.
  Phase 10 covers production-readiness and deployment in detail, including the specific lessons
  from a prior bad experience where an agent-generated codebase was not actually deployable to
  Render without substantial manual rework — Phase 10 exists specifically to prevent that from
  happening again on this project.
- **No model training, no fine-tuning, no local GPU anywhere in this plan.** All AI capability
  comes from Meta Model API calls (SAM 3.1, Muse Spark). This keeps the project zero-cost beyond
  the already-claimed API credits and keeps the 10-day window realistic.
- **Demo/test data**: Public academic disaster-response research datasets only — specifically
  SARD (Search And Rescue Dataset — persons *simulating* search-and-rescue scenarios, not real
  disaster footage), and, where licensing permits non-commercial research/educational use,
  NOMAD and/or DODD (occlusion-focused aerial/disaster datasets). **Never use real footage of
  actual disaster victims or real trauma.** This is both an ethical requirement and a practical
  one — real disaster footage is not something a hackathon demo should be built on, and these
  academic datasets exist specifically so projects like this one do not need to.

---

## PHASE 0 — Feasibility Validation (go/no-go gate — mandatory, do not skip)

This is the largest and most important phase in the entire plan. Nothing in Phase 1 onward
should start until this phase's decision checkpoint (0.5) is complete and written down. This
mirrors the discipline already established for this builder's other project this hackathon
season (Silens) — test the core, highest-risk assumption empirically before investing further
build time, rather than assuming it from a model's marketing description.

**Goal:** Honestly, empirically establish how well SAM 3.1 (a general-purpose, zero-shot
segmentation model, not one specifically trained on disaster-occlusion scenes) actually performs
at flagging human-presence signals in occluded, debris-cluttered footage — and use that result
to decide the entire shape of the rest of this project, rather than assuming it will "just
work" because the underlying technology is impressive in general.

**Prerequisites:** A Meta Model API account with credits claimed and a working API key.

### 0.1 — Dataset acquisition and licensing check
- Download the SARD dataset (persons simulating search-and-rescue situations across roads,
  quarries, grassland, and forested areas, under varied weather conditions) from its public
  academic source.
- Attempt to also acquire NOMAD (Natural Occluded Multi-scale Aerial Dataset) and/or DODD
  (Disaster Occlusion Detection Dataset) — both are academic research datasets built
  specifically to study this exact occlusion problem.
- For each dataset, read and record its license terms in `docs/dataset_licenses.md` —
  specifically whether non-commercial, educational/research, or hackathon-demonstration use is
  permitted, and whether attribution is required. Do not proceed to use a dataset whose terms
  are unclear without first flagging it in the end-of-sub-phase report rather than assuming
  permission.
- Organize downloaded data under `data/raw/<dataset-name>/`, with a manifest file recording
  source, license, and any ground-truth labels/annotations that came with it (these labels are
  essential later, in Phase 9, for honest accuracy measurement — do not discard them).

### 0.2 — Baseline test: lightly-occluded / clearly-visible cases
- Select 15–20 images/clips from the acquired data where a person is clearly visible or only
  lightly occluded (a "should be easy" baseline).
- Call SAM 3.1 with a set of candidate text prompts describing human-presence signals (e.g.
  "person", "human limb", "visible body part", "clothing", "hand") rather than a single rigid
  prompt — record which prompts actually produce a usable mask/box and which do not.
- Score each case: did SAM 3.1 produce a correct, reasonably-bounded detection? Record a simple
  hit/miss plus a note on mask quality (tight and accurate vs loose/wrong region).
- This baseline establishes the ceiling — if SAM 3.1 struggles even on the easy cases, that is
  a critical, stop-and-reconsider signal, not something to push past.

### 0.3 — Stress test: heavy-occlusion cases
- Select 15–20 images/clips specifically chosen for heavy occlusion — the person largely
  obscured by debris, only a fragment visible, poor lighting, or partial burial (the actual
  target scenario this whole project exists for).
- Run the identical prompt set used in 0.2.
- Score the same way. **Expect this number to be meaningfully worse than 0.2 — that is not a
  failure of this testing phase, that is the honest finding the whole project's scope should be
  built around.**
- Separately, run the same heavy-occlusion set through a handful of negative controls (images
  from the dataset that contain *no* person, or only debris) — record SAM 3.1's false-positive
  rate here. A system that flags everything "just in case" is not useful triage; it recreates
  the exact bottleneck (too much to review) it is meant to solve.

### 0.4 — Ranking-correlation test (the test that actually determines if this project is worth building)
- This is more important than raw detection accuracy alone, because the final product is a
  **ranked review queue**, not a yes/no detector. The real question: when SAM 3.1's candidate
  signals are fed to Muse Spark for cross-referencing and the whole set of test clips (both from
  0.2 and 0.3, shuffled together, roughly 30–40 clips total) is ranked by the pipeline's
  output, **do real-person clips actually land higher in the ranking than empty/debris-only
  clips, more often than random chance would produce?**
- Compute this directly: compare the pipeline's ranking order against the known ground truth
  (which clips actually contain a person, from the dataset's own labels or your own manual
  tagging during 0.1). A simple, honest metric works here — e.g., what fraction of the
  top-10-ranked clips actually contain a person, versus what fraction would be expected if the
  ranking were random given the dataset's overall person/no-person ratio.
- **This is the number that actually matters for whether "Triage" has a reason to exist**: even
  imperfect raw detection can still be a genuinely useful product if the ranking reliably
  surfaces more true positives near the top than a human randomly working through the backlog
  would encounter. If ranking shows no meaningful correlation with ground truth, the core premise
  of the product does not hold, regardless of how good the individual SAM 3.1 calls looked in
  isolation.

### 0.5 — Decision checkpoint (write this down, do not skip)
- Write all numbers from 0.2, 0.3, and 0.4 into `docs/feasibility_results.md`, honestly,
  including the negative/discouraging ones.
- Decide, explicitly, one of three outcomes, and write the decision down in both
  `docs/feasibility_results.md` and `docs/STATUS.md`'s "Decisions locked in" section:
  1. **Ranking correlation is clearly positive and meaningful** → proceed with the full plan as
     scoped below, with confidence language throughout the UI/demo calibrated to the actual
     measured numbers (Phase 7's UI copy must cite these numbers, not generic claims).
  2. **Detection is weak but ranking still shows some positive correlation** → proceed, but
     scope the UI and demo narrative even more conservatively — frame explicitly as "a modest
     but measurable improvement over unranked manual review," cite the actual measured
     improvement, and do not claim more.
  3. **No meaningful ranking correlation at all** → **stop before building further**, return to
     this plan's assumptions, and consider whether a narrower sub-problem (e.g., restricting to
     a specific signal type that scored better in 0.2/0.3, such as "visible clothing fragment,"
     rather than the general case) rescues the project, or whether a different project entirely
     is the honest conclusion. Do not proceed to Phase 1 on a pipeline that has been shown not
     to work better than chance.

**Deliverables:** `docs/dataset_licenses.md`, `docs/feasibility_results.md` with full real
numbers from all four sub-phases, and an explicit written decision per 0.5.

**Resumability check:** `docs/feasibility_results.md` exists, contains real numbers (not
placeholders) for 0.2, 0.3, and 0.4, and states one of the three 0.5 outcomes explicitly in
writing.

**End-of-phase report to Manthan:** State the real numbers from each sub-test in plain language,
state which of the three 0.5 outcomes was reached and why, and state clearly what that means for
how confident the UI and demo can be later in the project. Name Phase 1 as the next step only if
outcome 1 or 2 was reached.

---

## PHASE 1 — Research & Ethical/Scope Framing

**Goal:** Lock in, in writing, the non-negotiable scope and framing constraints that every later
phase must respect — this phase exists so that no later phase (or later agent, or a moment of
"wouldn't it be cooler if it just said CONFIRMED") can accidentally drift the project back toward
overclaiming.

**Prerequisites:** Phase 0 complete, with outcome 1 or 2 reached.

### 1.1 — Target user and use-case definition
- Write a short, concrete user profile into `docs/product_framing.md`: who actually uses this
  (a search-and-rescue coordinator or reviewer sitting at a laptop after a drone/bodycam
  collection pass, with a large backlog of footage and limited reviewer-hours), what their
  current manual process looks like without this tool, and exactly what decision this tool helps
  them make faster (which clip to look at next), not what decision it makes for them.

### 1.2 — Non-negotiable framing rules
- Write the following into `docs/product_framing.md` as explicit, permanent rules referenced by
  every later phase:
  - The system never outputs language implying certainty of a human's presence (no "detected,"
    "found," "confirmed," "survivor located"). Approved vocabulary: "flagged for review,"
    "candidate signal," "priority rank," "possible indicator."
  - Every flagged item in the UI must show its confidence/strength honestly, including showing
    low-confidence flags as visually and textually distinct from higher-confidence ones — never
    uniform presentation.
  - The system never auto-dismisses or hides a clip from the reviewer entirely; it only
    reorders/prioritizes. A human reviewer should always be able to see everything, just in a
    more useful order.
  - All UI copy, the README, and the demo video script must be checked against this list before
    submission (this becomes an explicit checklist item in Phase 11).

### 1.3 — Legal/ethical data-use statement
- Expand `docs/dataset_licenses.md` (started in Phase 0.1) into a short, clear statement
  suitable for inclusion in the README: what data was used, why it is appropriate (simulated
  SAR training data, not real disaster footage), and an explicit note that a production version
  of this tool would need a formal partnership/data-use agreement with an actual SAR
  organization before deployment — this honesty is itself a point in the project's favor with
  judges, not a weakness to hide.

**Deliverables:** `docs/product_framing.md`, expanded `docs/dataset_licenses.md`.

**Resumability check:** `docs/product_framing.md` exists and contains the explicit vocabulary
rule list from 1.2, word for word, in a form later phases can be checked against.

**End-of-phase report to Manthan:** Explain in plain language what framing rules were locked in
and why they matter (this is what keeps the project honest and defensible under judge
questioning), and name Phase 2 as next.

---

## PHASE 2 — Environment & Meta API Setup

**Goal:** Working dev environment with both Meta models callable from code, and cost tracking in
place before any batch-scale usage begins.

**Prerequisites:** Phase 1 complete.

### 2.1 — Repo scaffolding
- Initialize the repo with `frontend/`, `backend/`, `data/`, and `docs/` top-level directories.
- `.env.example` with placeholders for `META_MODEL_API_KEY` and any other config needed; real
  `.env` gitignored from the first commit, not added later.
- Create `docs/STATUS.md` per Section 1's format, backfilling it with everything completed in
  Phases 0 and 1 so it accurately reflects reality from this point forward.
- Set up linting/formatting config (ESLint + Prettier for the Node/React stack) from the start —
  this is a small cost now that prevents style-drift and inconsistent code later, especially
  important if more than one agent/session works on this project over the following days.

### 2.2 — SAM 3.1 connectivity test
- Minimal script: send one real image/clip from Phase 0's data to SAM 3.1 with a real candidate
  prompt, confirm the full request/response cycle works from backend code (not just from a
  dashboard), and print the returned mask/box data in a readable form.
- Note actual observed latency per call — this matters for Phase 6's batch-processing design
  (if each call takes several seconds, a large footage backlog needs a queue that processes in
  the background, not a synchronous request that makes a user's browser wait).

### 2.3 — Muse Spark connectivity test
- Minimal script: send a small set of SAM 3.1 outputs (from 2.2) plus a prioritization prompt to
  Muse Spark, confirm a structured, parseable response comes back.
- Confirm Muse Spark's response can be made to reliably follow a strict JSON schema (this
  matters a great deal for Phase 5 — a system that sometimes returns prose and sometimes JSON is
  a reliability problem waiting to surface during a live demo). If initial prompting does not
  reliably produce structured output, iterate on the prompt here, in isolation, before building
  anything that depends on it.

### 2.4 — Cost/usage instrumentation
- Wrap both API clients with a shared logging utility recording timestamp, endpoint, approximate
  token/unit cost, and a running total, written to a local log file or lightweight store.
- This must exist **before** Phase 3/4's batch processing begins, since that is where usage
  volume actually ramps up — check this log periodically throughout the rest of the build, not
  just once at setup.

**Deliverables:** Working repo skeleton with linting configured, confirmed real API calls to
both models from code, and cost logging in place and verified to actually write entries.

**Resumability check:** Running both connectivity-test scripts against real Phase 0 data returns
real, parsed responses, and the cost log shows corresponding entries.

**End-of-phase report to Manthan:** State that both models are confirmed working from code (not
just from the dashboard), give the observed latency numbers, and name Phase 3 as next.

---

## PHASE 3 — Data Pipeline & Ingestion Architecture

**Goal:** A clean, reusable pipeline for turning raw footage (whether from the demo datasets or,
eventually, a real upload) into a normalized, processable unit — built once, used everywhere,
not re-implemented ad hoc in later phases.

**Prerequisites:** Phase 2 complete.

### 3.1 — Ingestion module
- A single, well-isolated backend module responsible for accepting a file (image or short video
  clip), validating it (format, size, basic corruption check), and storing it in a consistent
  location (`data/ingested/<job-id>/`) with a metadata record (original filename, upload time,
  source label such as "SARD" or "user-upload").
- **This module must be small and single-purpose** — if it starts growing to handle
  normalization, AI calls, and database writes all in one file, that is a sign it needs to be
  split; see Section 5.3 of `SYSTEM_DESIGN.md` for the explicit file-size/responsibility rules
  this project follows, and apply them starting here, in the very first backend module written,
  not retrofitted later.

### 3.2 — Frame/clip normalization
- For video clips: extract a manageable set of representative frames (not every frame — define
  and document a simple, sensible sampling strategy, e.g. one frame per second for short clips)
  rather than processing full video frame-by-frame, which would be both slow and expensive given
  the per-call cost of SAM 3.1.
- For images: pass through with basic normalization (consistent max resolution, format).
- Document the exact sampling/normalization rule chosen in `docs/system_notes.md` so later
  phases and later agents understand why a given frame was or was not processed.

### 3.3 — Batch manifest generation
- After ingestion and normalization, produce a manifest (JSON) listing every processable unit
  (image or sampled frame) with its source clip, timestamp-within-clip (if applicable), and a
  unique ID — this manifest is what Phase 4's SAM 3.1 pass and Phase 6's job queue both consume,
  so getting its shape right here avoids rework later.

**Deliverables:** `backend/src/ingestion/` module set, a test run against Phase 0's dataset
producing a real, correct manifest file.

**Resumability check:** Running the ingestion pipeline against a handful of Phase 0's dataset
files produces a correctly structured manifest with the right number of entries, verified by
eye against the input.

**End-of-phase report to Manthan:** Explain that footage/images now flow through one consistent,
reusable pipeline before any AI processing touches them, and name Phase 4 as next.

---

## PHASE 4 — Core Perception Layer: SAM 3.1 Candidate Detection

**Goal:** Run SAM 3.1 across the ingested manifest using the prompt set validated in Phase 0,
producing structured candidate-signal records — this is the "perception" half of the pipeline.

**Prerequisites:** Phase 3 complete; Phase 0's validated prompt list available.

### 4.1 — Prompt-set module
- A single, dedicated module (not scattered across call sites) holding the final candidate-signal
  text prompts validated in Phase 0 (e.g. "human limb," "visible clothing fragment," "person"),
  documented with a short comment on why each was kept from Phase 0's testing.
- Design this so adding or removing a prompt later is a one-line change, not a multi-file edit —
  this is exactly the kind of small, isolated responsibility that keeps the codebase reusable
  rather than tangled.

### 4.2 — SAM 3.1 batch-call module
- A module that takes the Phase 3 manifest, calls SAM 3.1 once per unit with each prompt in the
  prompt set (or using whatever multi-prompt/multiplex capability SAM 3.1 exposes, if it allows
  checking several concepts in one call — confirm this during implementation and document
  whichever approach is used and why), and records the raw output.
- Respect whatever per-call latency was observed in Phase 2.2 when deciding whether this needs
  to run as a background job from the very first version, or whether a simple sequential loop is
  acceptable for the dataset sizes this project actually deals with — document the decision.

### 4.3 — Candidate-record structuring
- Normalize SAM 3.1's raw output per unit into a consistent internal record: which prompt
  matched, mask/box coordinates, any confidence/score value SAM 3.1 provides, and a link back to
  the source clip/frame and timestamp from the manifest.
- Store these as structured data (not just logged text) — this is what Phase 5 consumes, and
  what Phase 8's evidence-citation feature depends on later.

### 4.4 — False-positive dampening pass
- Using Phase 0.3's measured false-positive rate on empty/debris-only footage as a guide, apply
  a simple, documented filtering rule here (e.g. a minimum confidence threshold, or requiring
  more than one prompt to match before a candidate record is kept) — tune this using Phase 0's
  own test data as a sanity check before moving on, since an unfiltered pass will flood Phase 5
  with noise and undermine the entire point of the ranking step.

**Deliverables:** `backend/src/perception/` module set, a structured candidate-record output file
from a real run against Phase 3's manifest.

**Resumability check:** Running this phase's pipeline against Phase 3's manifest produces a
candidate-record file with real, structured entries, and spot-checking a few entries against the
source images by eye shows the recorded mask/box roughly corresponds to what SAM 3.1 actually
found.

**End-of-phase report to Manthan:** State how many candidate signals were found across how many
input units, mention the false-positive dampening applied and why, and name Phase 5 as next.

---

## PHASE 5 — Reasoning & Prioritization Layer: Muse Spark

**Goal:** Take Phase 4's candidate records and produce the actual product output — a ranked,
justified review queue — this is the "reasoning" half of the pipeline and the part that turns
raw detections into something a human reviewer can actually act on efficiently.

**Prerequisites:** Phase 4 complete.

### 5.1 — Cross-clip context aggregation module
- A module that groups Phase 4's candidate records in a way useful for ranking — e.g. by
  physical location/zone if that metadata is available, or simply as one pool across the whole
  batch job if not. Document which grouping strategy is used.
- Muse Spark's large context window is the genuine lever here: feed it a batch of candidate
  records together (not one at a time in isolation) so it can reason comparatively — "this
  candidate is stronger than that one because X" — rather than scoring each in a vacuum.

### 5.2 — Prioritization prompt design
- Design the exact prompt sent to Muse Spark, informed directly by Phase 0's measured results:
  explicitly tell the model about realistic false-positive rates and ask it to reason about
  relative likelihood across the batch, not to assert certainty for any single item. Reinforce
  the vocabulary rules locked in Phase 1.2 directly inside the prompt itself, not just in the
  frontend copy — this is the most reliable place to prevent the model from generating
  overconfident language in the first place.
- Request a strict, enforced JSON output schema (validated in Phase 2.3) containing, at minimum
  per ranked item: `candidate_id`, `priority_rank`, `confidence_label` (using only the approved
  vocabulary from Phase 1.2), `reasoning_text` (a short, human-readable justification), and the
  source `evidence_ids` it cites (linking back to Phase 4's candidate records — this becomes the
  citation trail built out fully in Phase 8).

### 5.3 — Ranking output module
- A module that calls Muse Spark with Phase 5.1's grouped batches and Phase 5.2's prompt,
  validates the returned JSON against the expected schema (reject and retry/log on malformed
  output rather than silently passing through broken data), and writes the final ranked queue to
  storage.

### 5.4 — Re-run against Phase 0's labeled test set
- Before moving to Phase 6, run this complete Phase 4 + Phase 5 pipeline against Phase 0's own
  labeled dataset one more time, now as a fully assembled pipeline rather than isolated
  sub-tests, and compare the resulting ranking against ground truth exactly as done in Phase
  0.4. This confirms the full, assembled system still performs consistently with what Phase 0
  predicted — if it does not, that is a signal to investigate before building the UI on top of
  a pipeline that silently regressed somewhere between Phase 0's isolated test and this
  integrated version.

**Deliverables:** `backend/src/prioritization/` module set, a real ranked-queue output file from
a run against Phase 4's candidate records, and a re-confirmation measurement against Phase 0's
labeled set.

**Resumability check:** Running this phase's pipeline against Phase 4's output produces a
correctly schema-validated ranked queue, and the Phase 0.4-style re-measurement produces results
consistent with (not dramatically worse than) Phase 0's original numbers.

**End-of-phase report to Manthan:** State that the full detection-plus-ranking pipeline is now
assembled end to end, give the re-confirmed accuracy/correlation numbers, and name Phase 6 as
next.

---

## PHASE 6 — Backend Service Architecture (job queue, API, storage)

**Goal:** Wrap Phases 3–5's pipeline in a proper, production-shaped backend service — a job
queue for batch processing, a clean REST API for the frontend, and persistent storage for
results — built with explicit code-organization discipline from the start (this phase directly
addresses the "huge unmanageable files, not reusable, not deployable" problem experienced on a
prior project built with a different agent/tool).

**Prerequisites:** Phase 5 complete.

### 6.1 — Job queue design
- A simple, lightweight async job queue (does not need a separate service like Redis for this
  project's scale — an in-process queue with persistence to the lightweight store, e.g. SQLite,
  is sufficient and keeps the deployment simple and free-tier-friendly) that accepts an ingestion
  job (Phase 3), runs it through Phases 4 and 5, and records progress/status so the frontend can
  poll or subscribe to updates rather than holding a connection open for a long-running batch
  job.
- Document the queue's state machine explicitly (e.g. `queued → ingesting → detecting →
  ranking → complete / failed`) in `docs/system_notes.md`.

### 6.2 — REST API layer
- A small, clearly organized set of route modules (not one giant routes file) exposing: job
  submission, job status/progress, retrieving a completed ranked queue, and retrieving a single
  candidate's full detail (image/frame, mask overlay data, Muse Spark's reasoning text, cited
  evidence) for Phase 7's detail view.
- Each route module should be small and focused on one resource — this is covered in detail,
  with explicit size/structure rules, in `SYSTEM_DESIGN.md` Section 5; apply those rules here as
  the first real API surface built in this project.

### 6.3 — Storage layer
- A thin, isolated data-access module (not database calls scattered through route handlers)
  wrapping the lightweight store — jobs, candidate records, ranked queues, and evidence links all
  go through this one module, so switching storage backends later (if ever needed) touches one
  file, not the whole codebase.

### 6.4 — Error handling and graceful degradation
- Explicit handling for: a SAM 3.1 or Muse Spark API call failing mid-batch (log it, mark that
  unit as failed without crashing the whole job), malformed Muse Spark JSON output (retry once,
  then fall back to a clearly-marked "could not rank — flagged for manual review" state rather
  than silently dropping the item), and a job that partially completes (the frontend should be
  able to show partial results rather than nothing until 100% is done).

**Deliverables:** `backend/src/` organized into clear, small modules per the structure above; a
working job submitted through the queue, processed end to end, and retrievable via the API.

**Resumability check:** Submitting a real job through the API, polling its status until
complete, and retrieving the final ranked queue and a candidate detail view all work correctly
against real data from earlier phases.

**End-of-phase report to Manthan:** Explain that the backend is now a proper service with a job
queue (not a script that has to be run by hand), describe briefly how errors are handled instead
of crashing the whole system, and name Phase 7 as next.

---

## PHASE 7 — Frontend: Review Dashboard

**Goal:** A clean, production-grade, tab-based review dashboard — the interface a real SAR
coordinator would actually want to use, not a flashy hackathon demo page. Follow `DESIGN.md` in
full for this phase; this section states what each tab must functionally do, `DESIGN.md` states
exactly how it must look.

**Prerequisites:** Phase 6 complete.

### 7.1 — Ingest tab
- Where footage/images are uploaded (or, for the demo, where a pre-loaded dataset batch is
  selected and submitted) to create a new job via Phase 6's API.
- Shows live job progress (using the Phase 6.1 state machine) rather than a blank loading spinner
  with no information.

### 7.2 — Priority Queue tab
- The core product view: the ranked list of candidates from the most recently completed (or an
  in-progress) job, each row showing its priority rank, confidence label (using only the
  approved vocabulary from Phase 1.2), a thumbnail, and a one-line reasoning summary.
- Must visually and textually distinguish confidence levels clearly (per Phase 1.2's rules) —
  this is a functional requirement here, with the exact visual treatment specified in
  `DESIGN.md`.
- Clicking a row opens the Clip Review tab/view for that item.

### 7.3 — Clip Review (detail) tab
- Full detail for one candidate: the source image/frame with the SAM 3.1 mask/box overlay drawn
  on it, Muse Spark's full reasoning text, the list of cited evidence IDs (linking to Phase 8's
  citation trail), and the original clip/frame metadata (source, timestamp).
- A reviewer action area — even if this project does not build real case-management, include a
  simple "mark reviewed" / "mark false positive" control, since a real triage tool needs this and
  it demonstrates the human-in-the-loop design concretely during a demo.

### 7.4 — Overview/Analytics tab
- Simple, honest summary stats for the current job: total candidates found, how many are
  high/medium/low confidence, how many have been reviewed so far. This is not meant to be a
  flashy analytics dashboard — keep it genuinely useful and simple, per `DESIGN.md`'s
  anti-AI-slop guidance.

### 7.5 — Settings/About tab
- Shows which Meta models are in use, links to `docs/product_framing.md`'s ethical/scope
  statement (surfacing this directly in the product itself, not burying it only in the README,
  is itself part of the honest-design story), and the current API usage/cost log from Phase 2.4.

**Deliverables:** A working frontend with all five tabs functional against the real backend from
Phase 6.

**Resumability check:** A full flow — upload/select a batch via the Ingest tab, watch it
process, view the resulting Priority Queue, open a Clip Review detail, and see Overview stats
update — works end to end against real data.

**End-of-phase report to Manthan:** Describe the five working tabs in plain language and what
each one is for, and name Phase 8 as next.

---

## PHASE 8 — Evidence & Citation Trail

**Goal:** Make every claim in the system traceable back to real, checkable evidence — this is
both a trust feature for the end user and a direct defense against judge questioning about
reliability.

**Prerequisites:** Phase 7's Clip Review tab exists to display this.

### 8.1 — Evidence linkage completeness check
- Audit Phase 4 and Phase 5's data flow to confirm every ranked candidate in the final queue can
  be traced back to: which SAM 3.1 call produced it, which prompt matched, and which source
  frame/timestamp it came from. If any link in this chain is missing anywhere in the pipeline
  built so far, fix it here before calling this phase complete — a citation trail with gaps is
  not a citation trail.

### 8.2 — Audit log
- A simple, append-only log recording every processing step for every job (ingested at X, SAM
  3.1 called with prompt Y at Z, Muse Spark ranked at W) — this is a genuinely useful
  accountability feature for a real SAR tool, demonstrates engineering maturity to judges, and
  is cheap to build given the structured data already flowing through the pipeline from earlier
  phases.

**Deliverables:** Confirmed, gap-free evidence linkage visible in the Clip Review tab; an audit
log file/table populated by a real job run.

**Resumability check:** Picking any item at random from a completed job's Priority Queue and
tracing it through the Clip Review tab's citation display back to a specific source frame and
SAM 3.1 call works correctly, with no missing links.

**End-of-phase report to Manthan:** Explain that every flagged item can now be traced back to
exactly why it was flagged, in a way a skeptical judge or a real rescuer could verify, and name
Phase 9 as next.

---

## PHASE 9 — Testing & Calibration Against Ground Truth

**Goal:** Measure the complete, assembled system's real accuracy one more time, at full scale,
with honest reporting — this becomes direct material for the demo narrative and the required
written submission draft.

**Prerequisites:** Phases 4–8 complete.

### 9.1 — Full-scale evaluation run
- Run the complete pipeline (ingestion through ranking) against the largest labeled subset of
  Phase 0's academic datasets that is practical given the API credit budget (check the Phase 2.4
  cost log before committing to a size).
- Record full results: detection hit/miss rates by occlusion level (reusing Phase 0's easy vs
  heavy-occlusion split), ranking-correlation numbers (reusing Phase 0.4's methodology), and
  false-positive rates.

### 9.2 — Failure pattern analysis
- Specifically name and document at least 3 concrete failure patterns observed (e.g. "struggles
  when debris color closely matches clothing color," "lighting condition X produces more false
  positives," "ranking under-prioritizes candidates with only one matching prompt even when
  correct") — this level of honest specificity is what separates a credible evaluation from a
  vague "it mostly works" claim.

### 9.3 — Targeted re-tuning
- Using 9.2's findings, adjust Phase 4.1's prompt set or Phase 4.4's filtering threshold or Phase
  5.2's prompt as appropriate, and re-run a subset to confirm the adjustment actually helped
  before considering this sub-phase done.

**Deliverables:** `docs/test_results.md` with full real numbers, the named failure patterns, and
notes on what was adjusted in response.

**Resumability check:** `docs/test_results.md` contains real figures from a full-scale run,
at least 3 specifically named failure patterns, and a record of at least one re-tuning pass with
a before/after comparison.

**End-of-phase report to Manthan:** Give the real, final accuracy/correlation numbers in plain
language, name the main failure patterns found, and name Phase 10 as next.

---

## PHASE 10 — Production-Grade Hardening & Deployment

**Goal:** Ship a version that is genuinely deployable without manual post-hoc fixing — this
phase exists specifically because of a prior experience on a different project where
agent-generated code was not actually deployable to Render and required substantial manual
rework after the fact. That must not happen again here, and this phase is structured to catch
exactly those problems before they become a last-minute scramble.

**Prerequisites:** Phase 9 complete.

### 10.1 — Codebase audit against `SYSTEM_DESIGN.md`'s production-readiness checklist
- Go through every item in `SYSTEM_DESIGN.md` Section 6's checklist (file-size/responsibility
  rules, environment-variable usage, no hardcoded paths or secrets, proper start scripts,
  health-check endpoint, graceful handling of missing config) against the actual codebase as it
  exists right now, not as it was planned — fix every violation found before moving on. Do not
  skip this because "it probably works" — this exact assumption is what caused the prior
  project's deployment problems.

### 10.2 — Local production-mode smoke test
- Run both frontend and backend in their production build modes locally (not dev-server mode)
  and confirm the full Phase 7 user flow still works — a surprising amount of "works in dev,
  breaks in prod" failure happens here and it is far cheaper to catch locally than after a
  deploy attempt.

### 10.3 — Backend deploy (Render free tier)
- Deploy following `SYSTEM_DESIGN.md` Section 6's deployment-specific guidance.
- Explicitly test cold-start behavior (free-tier services sleep and have a slow first request) —
  if this is unacceptable for demo purposes, document a mitigation (e.g. a pre-demo warm-up
  request) rather than discovering the problem live in front of judges.

### 10.4 — Frontend deploy (Vercel/Netlify free tier)
- Confirm it correctly points at the deployed backend's real URL (not `localhost`), via
  environment configuration, not a hardcoded value.

### 10.5 — Full remote smoke test
- From a device that is not the development machine, run through the entire Phase 7 flow against
  the live deployed URLs end to end. Do not consider deployment complete until this passes
  cleanly on a genuinely fresh device/browser.

### 10.6 — Spend-limit and public-link safety check
- Confirm the Meta Model API Spend Limit notification is still active before sharing any public
  demo link, since a shared, working link could receive unexpected traffic/usage.

**Deliverables:** A live, publicly reachable URL that works end-to-end for a stranger with zero
setup, confirmed via a genuinely fresh device.

**Resumability check:** Opening the deployed frontend URL on a device that has never touched
this project's codebase, running the full Ingest → Priority Queue → Clip Review flow, completes
without error.

**End-of-phase report to Manthan:** Confirm the project is live at a public link, state that it
was specifically checked for the kind of deployment problems experienced on a prior project, and
name Phase 11 as next.

---

## PHASE 11 — Submission Packaging

**Goal:** Assemble every deliverable the hackathon actually requires, checked against real
requirements, with the honest framing from Phase 1 carried through every artifact.

**Prerequisites:** Phase 10 complete.

### 11.1 — README
- What the project does, framed exactly per Phase 1.2's approved vocabulary (never "detects
  survivors," always "flags candidates for prioritized human review"), which Meta models are
  used and where in the code, setup/run instructions, link to the live deployed demo, and an
  honest, numbers-cited accuracy/limitations section drawn directly from Phase 9's results.

### 11.2 — Demo video script and recording
- Script a short demo that: shows the real dashboard with real data, walks through
  Ingest → Priority Queue → Clip Review, explicitly states the measured accuracy/limitations
  on camera or in a caption (not hidden only in the README), and closes with the honest
  production-deployment caveat from `docs/product_framing.md` 1.3 (a real SAR partnership and
  further validation would be needed before any real-world use). This honesty is a deliberate
  part of the pitch, not a disclaimer to minimize.

### 11.3 — Written project draft
- Problem statement and target user (from Phase 1.1), technical architecture (how SAM 3.1 and
  Muse Spark are chained, summarized from `SYSTEM_DESIGN.md`), challenges/breakthroughs
  (genuinely drawn from what was actually hard in Phases 0, 4, 5, and 9 — not invented), and a
  future roadmap that is honest about what would be needed for real-world deployment.

### 11.4 — Submission-requirements checklist
- Re-check the hackathon's actual, current submission form/requirements at the time of
  submitting against everything assembled here — requirements can shift over a 10-day window,
  and this plan's Section 2 was accurate as researched at an earlier point, not guaranteed
  current at submission time.

### 11.5 — Final credit-usage check
- One last look at the Phase 2.4 cost log — note final total usage in the README for
  transparency, consistent with the project's overall honest-reporting character.

**Deliverables:** Final submission package — README, demo video, written draft, live link — ready
before the deadline stated in Section 2.

**Resumability check:** Every item the official submission form asks for has a corresponding,
completed, checked-off item in this phase.

**End-of-phase report to Manthan:** Confirm the full submission package is ready, summarize what
the demo video and written draft emphasize, and state that the project is ready to submit.

---

## Appendix — File/Module Map

```
frontend/
  src/
    pages/IngestTab/              — Phase 7.1
    pages/PriorityQueueTab/       — Phase 7.2
    pages/ClipReviewTab/          — Phase 7.3
    pages/OverviewTab/            — Phase 7.4
    pages/SettingsTab/            — Phase 7.5
backend/
  src/
    ingestion/                    — Phase 3
    perception/
      promptSet.ts                — Phase 4.1
      sam31Client.ts              — Phase 4.2
      candidateRecords.ts         — Phase 4.3
      falsePositiveFilter.ts      — Phase 4.4
    prioritization/
      contextAggregator.ts        — Phase 5.1
      museSparkClient.ts          — Phase 5.2/5.3
    jobs/                         — Phase 6.1 (queue + state machine)
    routes/                       — Phase 6.2 (small, per-resource route modules)
    storage/                      — Phase 6.3
    lib/costLogger.ts             — Phase 2.4
data/
  raw/<dataset-name>/             — Phase 0.1
  ingested/<job-id>/              — Phase 3.1
docs/
  STATUS.md                       — read first, always
  dataset_licenses.md             — Phase 0.1, expanded Phase 1.3
  feasibility_results.md          — Phase 0
  product_framing.md              — Phase 1
  system_notes.md                 — Phases 3, 6
  test_results.md                 — Phase 9
SYSTEM_DESIGN.md                  — technical architecture (separate file)
DESIGN.md                         — visual/UX spec (separate file)
```
