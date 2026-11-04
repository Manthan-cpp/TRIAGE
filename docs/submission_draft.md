# Project Triage — Written Submission Draft

## Problem

Search-and-rescue coordinators may receive hours of drone or body-camera footage after a
collection pass. Manual chronological review spends scarce attention on empty terrain and makes
it difficult to decide which clip to inspect next.

## Solution

Project Triage is a batch decision-support system. Ingestion validates and normalizes media, SAM
3.1 produces candidate visual signals, and Muse Spark compares those signals within a batch to
create a ranked review queue. The system never asserts that a person is present, never dispatches
responders, and never removes a source unit from human access.

## Technical implementation

The Node/Express backend runs an in-process asynchronous job state machine backed by SQLite. Video
is sampled at 1 fps and images are normalized to an 800px maximum dimension before parallel SAM
prompt calls. A calibrated dampening layer records weak signals without dismissing them. Muse
Spark output is schema-checked, vocabulary-checked, retried once when malformed, and converted to
explicit manual-review items if ranking remains unavailable. Every queue item links to its source
unit, prompt evidence, media path, and audit events.

The React/Vite frontend presents ingestion progress, a dense queue, clip review overlays, audit
history, benchmark results, API telemetry, and the system’s ethical scope.

## Results and limitations

The Phase 0 strict baseline measured 85.7% light-occlusion recall, 62.5% heavy-occlusion recall,
and 12.5% false alarms on negative controls. The calibrated Phase 9 suite reached 100% Precision@10
and 96.7% overall true-positive recall across its labeled positive units, but still missed a deeply
camouflaged case and retained a terrain-shadow false alarm. The product is therefore useful as
review prioritization, not autonomous detection.

## Responsible deployment

The evaluated imagery contains simulated subjects from academic datasets; no real casualty footage
is used. A field version would require accredited SAR partnerships, data-use agreements, diverse
weather and sensor validation, trained human oversight, and durable hosted storage.
