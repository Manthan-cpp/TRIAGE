# Feasibility Validation Results — Project Triage (Honest Ground-Truth Audit)

Last evaluated: 2026-10-31T20:28:00+05:30  
Models evaluated: Meta SAM 3.1 (`sam-3.1`) & Meta Muse Spark 1.3 (`muse-spark-1.3`)  
Ground-Truth Audit: Spatial Intersection-over-Union (IoU $\ge$ 0.5 strict, $\ge$ 0.3 loose)  
Dataset: 38 evaluation units (14 light occlusion, 16 heavy occlusion, 8 negative controls)

---

## 1. Clear Verdict & Checkpoint Decision

* **Checkpoint Decision: OUTCOME 2 (Assistive Lift Only — Imperfect Detection)**
* **Verdict:** Feasible **ONLY** as an operational reviewer prioritization tool. **NOT feasible** as an autonomous survivor detector.
* **Core Finding:** Zero-shot SAM 3.1 achieves **62.5% strict recall on heavy occlusion** and exhibits a **12.5% false-positive rate** on textured terrain. In our test, false positive candidate signals deceived Muse Spark into placing an empty background frame (`neg_03`) at **Rank 9** in the queue.
* **Net Value:** Despite false-positive leakage, the pipeline concentrated 9 true person frames in the top 10 (90% precision vs 78.9% random baseline) and successfully relegated 7 of 8 negative controls to the bottom half of the queue.

---

## 2. Spatial IoU Ground-Truth Audit

| Slice | Total Units | Strict Hits (IoU $\ge$ 0.5) | Loose Hits (IoU $\ge$ 0.3) | Complete Misses | False Alarms |
|---|---|---|---|---|---|
| **Light Occlusion** | 14 | 12 (85.7%) | 12 (85.7%) | 2 (14.3%) | 0 |
| **Heavy Occlusion** | 16 | 10 (62.5%) | 10 (62.5%) | 6 (37.5%) | 0 |
| **Negative Controls** | 8 | N/A | N/A | N/A | **1 (12.5%)** |
| **Total / Overall** | 38 | **22 / 30 (73.3%)** | **22 / 30 (73.3%)** | **8 / 30 (26.7%)** | **1 / 8 (12.5%)** |

### Prompt Efficacy Breakdown:
* `"person"`: Primary bounding box anchor. Detects upright or partially occluded bodies reliably.
* `"clothing"`: Secondary corroborator. Triggered on 71% of light and 75% of heavy cases, but also contributed to the false positive on `neg_03`.
* `"human limb"`: High precision when present, but extremely low recall (<15%) due to aerial distance.
* `"visible body part"` & `"hand"`: **0% yield**. Dropped from production prompt set.

---

## 3. Concrete Failure Transcripts

### Failure Mode 1: False Positive Infiltration (`neg_03`)
* **Input:** Pure terrain foliage with shadow patches; 0 humans present.
* **SAM 3.1 Output:** Returned 2 `"person"` boxes (`[20, 140, 70, 239]`, `[266, 174, 333, 239]`) and 3 `"clothing"` boxes.
* **Muse Spark Prioritizer Reaction:** Ingested 5 candidate boxes, inferred high multi-prompt corroboration, and assigned **Rank 9** in the priority queue.
* **Takeaway:** Dense foliage shadows can mimic person/clothing aspect ratios. Solitary or unverified candidate clusters must not be presented with high confidence.

### Failure Mode 2: Heavy Occlusion Resolution Drop (`sard_05`, `sard_06`)
* **Input:** Low-contrast aerial frame with simulated rescue subject hidden by terrain features.
* **SAM 3.1 Output:** `"clothing"` and `"human limb"` returned 0 boxes. `"person"` produced an uncorroborated, loose boundary.
* **Takeaway:** General-purpose zero-shot models cannot penetrate deep camouflage or low target-to-background contrast.

---

## 4. Prioritization Ranking Lift (Phase 0.4)

| Metric | Random Backlog Review | Triage Chained Pipeline | Net Impact |
|---|---|---|---|
| **Precision @ 10** | 78.9% (7.9 / 10) | **90.0% (9 / 10)** | **+11.1% gain** |
| **Precision @ 20** | 78.9% (15.8 / 20) | **95.0% (19 / 20)** | **+16.1% gain** |
| **Negative Deposition** | Evenly scattered | 7 of 8 negatives pushed to bottom | Reduces wasted rescuer hours |

---

## 5. Scope Boundaries for Later Phases

1. **Vocabulary Rule:** Never use "Detected", "Located", or "Found". Only "Candidate Flag", "Priority Rank", "Possible-High/Med/Low".
2. **Reviewer Interface:** The human coordinator must inspect every clip; nothing is ever auto-dismissed.
3. **Demo Narrative:** The submission video and README must explicitly cite the 62.5% heavy occlusion rate and the `neg_03` false positive to showcase technical honesty.
