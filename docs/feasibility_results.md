# Feasibility Validation Results — Project Triage

Last evaluated: 2026-10-31T20:17:42+05:30  
Models evaluated: Meta SAM 3.1 (`sam-3.1`) & Meta Muse Spark 1.3 (`muse-spark-1.3`)  
Dataset source: SARD (Search and Rescue Dataset) & Low-Altitude UAV-SAR Benchmark (`data/raw/manifest.json`)  
Evaluation units: 38 images (14 light occlusion, 16 heavy occlusion, 8 negative controls)

---

## 1. Executive Summary & Outcome

Following the mandatory protocol in `PLAN.md` Phase 0, we empirically tested SAM 3.1 candidate detection and Muse Spark cross-clip prioritization against real drone search-and-rescue imagery before proceeding with full implementation.

* **Decision Checkpoint Outcome: Outcome 1**  
  *Ranking correlation is clearly positive and meaningful.*  
  Feeding SAM 3.1 candidate detections to Muse Spark produced a **90.0% Precision@10** (compared to a 78.9% random baseline) and **95.0% Precision@20** (19 of 20 true positive person frames placed at the front of the queue). Negative controls were consistently depressed to lower priority ranks. We proceed with the full plan with calibrated vocabulary (`possible-high`, `possible-medium`, `possible-low`).

---

## 2. Phase 0.2 — Baseline Test (Light Occlusion)

* **Objective:** Establish the detection ceiling on clearly visible or lightly occluded persons.
* **Test set:** 14 drone frames with visible simulated rescue subjects.
* **Tested Prompts:** `"person"`, `"clothing"`, `"human limb"`, `"visible body part"`, `"hand"`.

### Results:
* **Overall Any-Signal Hit Rate:** **14/14 (100.0%)**
* **Prompt Breakdown:**
  * `"person"`: **14/14 (100.0%)** — Reliable bounding boxes across aerial perspectives.
  * `"clothing"`: **10/14 (71.4%)** — Provides strong corroborating torso/garment regions inside person boxes.
  * `"human limb"`: **2/14 (14.3%)** — High precision when detected, but fails when altitude obscures limb boundaries.
  * `"visible body part"`: **0/14 (0.0%)** — Too abstract; rejected as a production prompt.
  * `"hand"`: **0/14 (0.0%)** — Sub-pixel feature below resolution limit at standard UAV flight heights; rejected.

---

## 3. Phase 0.3 — Stress Test (Heavy Occlusion & Negatives)

* **Objective:** Test candidate signal recovery under difficult terrain, partial occlusion, and foliage, and measure false-positive rate on negative controls.
* **Test set:** 16 heavily occluded drone frames + 8 negative controls (debris, rock, forest floor with 0 persons).

### Results:
* **Heavy Occlusion Hit Rate:** **16/16 (100.0%)**
  * `"person"`: 16/16 (100.0%)
  * `"clothing"`: 12/16 (75.0%)
  * `"human limb"`: 1/16 (6.3%)
* **Negative Controls False Positive Rate:** **1/8 (12.5%)**
  * 7 of 8 negative control frames produced clean 0 detections.
  * 1 frame (`neg_03`) triggered a false alarm on textured foliage with irregular shadows.

---

## 4. Phase 0.4 — Ranking Correlation Test (Muse Spark)

* **Objective:** Determine whether chained Muse Spark comparative reasoning concentrates true positives near the top of the review queue compared to unranked review.
* **Methodology:** All 38 candidate summaries were submitted in a single batch to Muse Spark 1.3 requesting structured JSON ranking, calibrated confidence labels, and reasoning justifications.

### Quantitative Comparison:
| Metric | Random Baseline | Measured (Triage Pipeline) | Net Lift |
|---|---|---|---|
| **Precision @ 10** | 78.9% (7.9 / 10) | **90.0% (9 / 10)** | **+11.1%** |
| **Precision @ 20** | 78.9% (15.8 / 20) | **95.0% (19 / 20)** | **+16.1%** |
| **Top 10 Queue Composition** | Mixed | 9 Person Frames, 1 Negative | 90% reviewer efficiency |
| **Negative Dampening** | Uniform distribution | 7 of 8 negatives pushed to bottom half | Effective triage |

### Qualitative Analysis:
* Muse Spark successfully elevated candidates with **corroborating prompts** (both `"person"` and `"clothing"`) to `possible-high`.
* Solitary candidate flags on low-contrast backgrounds were appropriately labeled `possible-medium` or `possible-low`.
* The model followed the non-negotiable framing rules: it justified why a reviewer should check a frame first, without asserting certainty of a survivor's presence.

---

## 5. Architectural & Prompting Guidelines for Phase 4 & Phase 5

1. **Production Candidate Prompt Set:** Retain `["person", "clothing", "human limb"]`. Prune sub-pixel and abstract queries.
2. **Confidence Heuristic:** Multi-prompt corroboration (`person` + `clothing`) is the strongest predictor of high-quality detection and should receive higher default queue weighting.
3. **Framing & Scope:** Maintain strict vocabulary lock: `possible-high`, `possible-medium`, and `possible-low`. Never claim survivor confirmation.
