# Demo Video Script — Project Triage

## 1. Opening (20 seconds)

“Project Triage helps a search-and-rescue coordinator decide which footage to review next. It
does not declare that a person is present. It turns a large batch into an ordered list of
candidate signals while keeping every source unit available to a human.”

## 2. Ingest (25 seconds)

Open **Ingest Batch**, show the academic evaluation batch, and launch it. Point out the visible
`queued → ingesting → candidate segmentation → prioritization → review ready` state tracker and
the unit progress counter.

## 3. Priority Queue (35 seconds)

Open **Priority Queue**. Show the rank, thumbnail, approved confidence label, matched prompts,
and one-line reasoning. Search for a source filename and switch confidence tiers. Explain that
low-confidence and empty units remain visible rather than being discarded.

## 4. Clip Review and audit (35 seconds)

Open a row. Show the single-accent box overlay, source timestamp, prompts, dampening explanation,
evidence IDs, and Muse Spark justification. Record a reviewer action, then open **Forensic Audit**
to show the human decision event.

## 5. Honest results (25 seconds)

“On the 38-unit evaluation suite, the Phase 0 strict baseline was 62.5% on heavy occlusion and
had a 12.5% negative-control false-alarm rate. After calibration, the Phase 9 suite reached 100%
Precision@10, but still included a terrain-shadow false alarm and documented misses. Those numbers
describe this benchmark, not operational certainty.”

## 6. Close (15 seconds)

“A real deployment would need accredited SAR partnerships, formal data agreements, broader field
validation, and persistent production storage. Project Triage is an assistive review prototype,
with the final decision always kept with a trained human.”
