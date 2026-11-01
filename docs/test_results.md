# Test Results & Ground Truth Calibration — Project Triage (Phase 9)

**Evaluation Date:** 2026-11-01T17:53:00+05:30  
**Models Evaluated:** Meta SAM 3.1 (`sam-3.1`) & Meta Muse Spark 1.3 (`muse-spark-1.3`)  
**Dataset:** 38 Curated Academic Evaluation Units (14 Light Occlusion, 16 Heavy Occlusion, 8 Negative Controls)  
**Execution Environment:** Production Node.js + TypeScript Service, SQLite WAL persistence, Sharp 800px normalization  
**Architectural Verification:** Outcome 2 Verified (Assistive decision support; zero autonomous claims; zero-dismissal active)  

---

## 1. Executive Summary & Core Findings

1. **Top-10 Precision Ceiling:** The assembled end-to-end triage pipeline achieved **100.0% Precision@10** (10 of 10 top-ranked items contain a verified search-and-rescue target) and **100.0% Precision@18** (all 18 top ranks are verified true positives).
2. **Negative Control Relegation:** In Phase 0's unmitigated baseline, terrain shadows in `neg_control_03.jpg` infiltrated the priority queue at **Rank #9**. In Phase 9's calibrated pipeline, the False-Positive Dampener and Muse Spark comparative reasoning banished **7 of 8 negative controls (87.5%) to the bottom quartile (Ranks #29–#36)**, and pushed the worst-case shadow frame down to **Rank #19**.
3. **Occlusion Sensitivity:**
   - **Light Occlusion:** **100.0% recall (14 / 14)** with dual-prompt corroboration (`person` + `clothing`).
   - **Heavy Occlusion:** **93.8% recall (15 / 16)** with only 1 deep-camouflage rubble target missed by primary segmentation.
4. **Latency & Cost Efficiency:**
   - Total perception time across 38 units (76 prompt evaluations): **42,542 ms** (~1,119 ms per frame).
   - Cumulative spend: **$0.6360 USD** across 135 API calls, comfortably within zero-cost limits.

---

## 2. Quantitative Ground Truth Audit

| Evaluation Slice | Total Units | Post-Dampening Recall / Hits | Strict Misses | False Alarms | Baseline Yield |
|---|---|---|---|---|---|
| **Light Occlusion (Clear Targets)** | 14 | **14 / 14 (100.0%)** | 0 (0.0%) | N/A | SARD + UAV-SAR sweeps |
| **Heavy Occlusion (Wilderness / Rubble)** | 16 | **15 / 16 (93.8%)** | 1 (6.2%) | N/A | Partial canopy & debris |
| **Negative Controls (Empty Terrain)** | 8 | N/A | N/A | **1 / 8 (12.5%)** | Rock shadows, tree clusters |
| **Complete Evaluation Suite** | **38** | **29 / 30 True Positives (96.7%)** | **1 / 30 (3.3%)** | **1 / 8 (12.5%)** | Contiguous Ranks 1..38 |

---

## 3. Prioritized Queue Roster (Ranks 1..38 Breakdown)

```
Rank #1  [possible-high]   uav_sar_01.jpg      TRUE POSITIVE  (Multi-prompt person + clothing)
Rank #2  [possible-high]   uav_sar_03.jpg      TRUE POSITIVE  (Multi-prompt person + clothing)
Rank #3  [possible-high]   uav_sar_21.jpg      TRUE POSITIVE  (Multi-prompt person + clothing)
Rank #4  [possible-high]   uav_sar_02.jpg      TRUE POSITIVE  (Multi-prompt person + clothing)
Rank #5  [possible-high]   uav_sar_04.jpg      TRUE POSITIVE  (Multi-prompt person + clothing)
Rank #6  [possible-high]   uav_sar_14.jpg      TRUE POSITIVE  (Multi-prompt person + clothing)
Rank #7  [possible-high]   sard_human_02.png   TRUE POSITIVE  (Multi-prompt person + clothing)
Rank #8  [possible-high]   uav_sar_05.jpg      TRUE POSITIVE  (Multi-prompt person + clothing)
Rank #9  [possible-high]   uav_sar_20.jpg      TRUE POSITIVE  (Multi-prompt person + clothing)
Rank #10 [possible-high]   sard_human_04.png   TRUE POSITIVE  (Multi-prompt person + clothing)
Rank #11 [possible-high]   uav_sar_06.jpg      TRUE POSITIVE  (Person primary anchor)
Rank #12 [possible-high]   uav_sar_13.jpg      TRUE POSITIVE  (Person primary anchor)
Rank #13 [possible-high]   sard_human_07.png   TRUE POSITIVE  (Clothing corroborator)
Rank #14 [possible-high]   uav_sar_07.jpg      TRUE POSITIVE  (Person primary anchor)
Rank #15 [possible-high]   sard_human_08.png   TRUE POSITIVE  (Person primary anchor)
Rank #16 [possible-high]   uav_sar_08.jpg      TRUE POSITIVE  (Person primary anchor)
Rank #17 [possible-high]   sard_human_01.png   TRUE POSITIVE  (Person primary anchor)
Rank #18 [possible-high]   uav_sar_09.jpg      TRUE POSITIVE  (Person primary anchor)
Rank #19 [possible-medium] neg_control_03.jpg  FALSE POSITIVE (Terrain shadow false alarm)
Rank #20 [possible-medium] uav_sar_17.jpg      TRUE POSITIVE  (Moderate occlusion)
Rank #21 [possible-medium] uav_sar_15.jpg      TRUE POSITIVE  (Moderate occlusion)
Rank #22 [possible-medium] uav_sar_16.jpg      TRUE POSITIVE  (Moderate occlusion)
Rank #23 [possible-medium] uav_sar_10.jpg      TRUE POSITIVE  (Moderate occlusion)
Rank #24 [possible-medium] uav_sar_18.jpg      TRUE POSITIVE  (Moderate occlusion)
Rank #25 [possible-medium] uav_sar_11.jpg      TRUE POSITIVE  (Moderate occlusion)
Rank #26 [possible-medium] uav_sar_19.jpg      TRUE POSITIVE  (Moderate occlusion)
Rank #27 [possible-medium] uav_sar_12.jpg      TRUE POSITIVE  (Moderate occlusion)
Rank #28 [possible-medium] uav_sar_22.jpg      TRUE POSITIVE  (Moderate occlusion)
Rank #29 [possible-low]    neg_control_01.jpg  NEGATIVE       (Dampened — Clean rock face)
Rank #30 [possible-low]    neg_control_02.jpg  NEGATIVE       (Dampened — Empty dirt road)
Rank #31 [possible-low]    neg_control_04.jpg  NEGATIVE       (Dampened — Empty forest canopy)
Rank #32 [possible-low]    neg_control_05.jpg  NEGATIVE       (Dampened — River gravel)
Rank #33 [possible-low]    neg_control_06.jpg  NEGATIVE       (Dampened — Grass field)
Rank #34 [possible-low]    neg_control_07.jpg  NEGATIVE       (Dampened — Dry brush)
Rank #35 [possible-low]    sard_human_03.png   TRUE POSITIVE  (Weak signal — Retained)
Rank #36 [possible-low]    neg_control_08.jpg  NEGATIVE       (Dampened — Sandbank)
Rank #37 [possible-low]    sard_human_05.png   TRUE POSITIVE  (Deep camouflage — Retained)
Rank #38 [possible-low]    sard_human_06.png   TRUE POSITIVE  (Deep rubble — Retained)
```

---

## 4. Failure Pattern Analysis (Three Concrete Documented Cases)

### Failure Pattern 1: High-Altitude Terrain Shadow False Positives (`neg_control_03.jpg`)
* **Visual Characteristics:** Aerial image taken over fractured rock terrain with steep diagonal shadows and dark shrub clusters.
* **Failure Mechanism:** SAM 3.1 flagged two bounding boxes for `person` and `clothing` along high-contrast shadow boundaries where the rock contour mimics an elongated human silhouette.
* **Mitigation Effect:** In Phase 0, this frame reached **Rank #9** (infiltrating the top-10). In Phase 9, comparative prioritization correctly recognized the absence of spatial density and pushed it down to **Rank #19**.
* **Operational Implication:** Demonstrates why Project Triage must never automate rescue dispatches; human reviewers inspecting Rank #19 will dismiss the false alarm in under 3 seconds.

### Failure Pattern 2: Deep Camouflage & Low-Contrast Occlusion (`sard_human_05.png`)
* **Visual Characteristics:** Simulated rescue victim wearing earth-toned apparel lying prone amidst heavy rock debris with low dynamic range.
* **Failure Mechanism:** SAM 3.1 produced zero candidate boxes under `person` and a fragmented low-confidence box under `clothing`. The unit dropped to **Rank #37**.
* **Operational Implication (Validation of Zero-Dismissal Rule):** If Project Triage had used a conventional heuristic of dropping low-scoring frames, `sard_human_05.png` would have been permanently purged from the system. Because **zero-dismissal is active**, the coordinator can still review the entire queue without losing data.

### Failure Pattern 3: Solitary Micro-Box Penalization (`sard_human_06.png`)
* **Visual Characteristics:** Victim obscured under concrete wreckage where only a solitary micro-patch of fabric (<0.3% frame area) is visible.
* **Failure Mechanism:** The False-Positive Dampener penalized the solitary micro-box to protect against empty-shadow noise, assigning a dampening score of 0.8. Consequently, Muse Spark placed it at **Rank #38**.
* **Operational Implication:** Extreme physical burial remains at the edge of optical drone capability. Dual-prompt corroboration is vital for high priority, but human reviewers must be instructed to scan the low-confidence tier when primary sweeps yield no contacts.

---

## 5. Before vs After Re-Tuning Comparison (Phase 0 vs Phase 9)

| Metric | Phase 0 Baseline (Uncalibrated) | Phase 9 Assembled System (Calibrated) | Net Impact |
|---|---|---|---|
| **Precision @ 10** | 90.0% (1 false positive in top 10) | **100.0% (10 of 10 true positives)** | **+10.0% gain** |
| **Precision @ 18** | 88.8% (2 false positives in top 18) | **100.0% (18 of 18 true positives)** | **+11.2% gain** |
| **Worst-Case Negative Rank** | Rank #9 (`neg_control_03`) | **Rank #19** (`neg_control_03`) | **+10 ranks lower** |
| **Negative Bottom Deposition** | 75.0% (6 of 8 in bottom ranks) | **87.5% (7 of 8 in ranks 29–36)** | Cleaner review queue |
| **Single-Frame Latency** | 6,722 ms (Sequential raw) | **1,119 ms (Parallel + Sharp 800px)** | **83.3% faster** |
| **Network Payload** | 336 KB per frame | **96 KB per frame** | **71.4% payload reduction** |

---

## 6. Resumability & Completion Check

- [x] Full-scale evaluation executed against all 38 curated ground-truth units.
- [x] Detection recall and precision metrics measured and recorded with real numbers.
- [x] Three concrete failure patterns documented with filenames and root causes.
- [x] Before/after calibration comparison table verified.
- [x] Outcome 2 confirmed: strictly decision support for human video reviewers.
