# Latency Analysis & Optimization Architecture

## 1. Root Cause Breakdown

### Measured Baselines (Phase 2 live tests)
| Call | Latency |
|---|---|
| SAM 3.1 — single prompt (`person`) | ~3,990 ms |
| Muse Spark 1.3 — batch of 3 candidates | ~10,940 ms |

### Why It's Slow (Sequential Worst Case)

```
Frame 1: SAM("person") → 4s → SAM("clothing") → 4s = 8s SAM
         ↓ (if detections > 0)
         Muse Spark batch → 11s
         ─────────────────────
         Per frame total: ~19s SEQUENTIAL
```

For a 100-frame batch with 2 prompts per frame:
- Sequential: 100 × 8s (SAM) + ~11s (Muse Spark batch) = **~811s ≈ 13.5 minutes** ❌

### Root Causes (ranked by impact)
1. **No intra-frame parallelism**: `person` + `clothing` SAM calls run sequentially → wastes 4s per frame
2. **No inter-frame parallelism**: frames processed one at a time, no concurrency
3. **Oversized payloads**: Original images up to 1920×1080 PNG (~1.3MB base64) → larger payload = more upload time + more server decode time
4. **No early-exit on zero-detect frames**: Muse Spark called even when SAM found nothing (11s wasted)
5. **No frame sampling**: Every frame from a 30fps clip processed; only need ~1fps for SAR

---

## 1b. Live Benchmark Results (Phase 2.5 — measured on `uav_sar_01.jpg`)

| Approach | Person | Clothing | Wall Time |
|---|---|---|---|
| **Sequential (old)** | 3,631ms | 2,936ms | **6,722ms** |
| **Parallel + resize (new)** | 1,238ms | 1,698ms | **1,722ms** |
| **Saving** | — | — | **5,000ms (74% faster)** |

**Payload:** 336KB → 96KB (71% smaller) — this explains why the API itself is responding faster per call; smaller image = less server decode time.

> [!IMPORTANT]
> The 74% wall-time reduction comes from TWO compounding effects: (1) concurrent calls eliminate sequential wait, and (2) resized image reduces per-call API processing time from ~3.9s to ~1.5s average.

---

## 2. Optimization Plan

### Tier 1 — Must implement (immediate, surgical, high ROI)

| Optimization | Technique | Expected Saving | Complexity |
|---|---|---|---|
| **Parallel SAM prompts** | `Promise.all([person, clothing])` | ~4s per frame (50%) | Low |
| **Image resize to 800px max** | `sharp` resize before base64 encode | ~2-3x smaller payload → ~1-2s saved per call | Low |
| **Skip Muse on zero-detect** | If both SAM prompts return 0 boxes → skip | Saves 11s per empty frame | Trivial |
| **Frame sampling** | Sample 1fps from video (not every frame) | 30x fewer frames for 30fps video | Medium |

### Tier 2 — Implement in Phase 4-5

| Optimization | Technique | Expected Saving | Complexity |
|---|---|---|---|
| **Bounded parallel frame workers** | p-limit or manual semaphore, 6 concurrent frames | Near-linear throughput scaling | Medium |
| **Progressive streaming** | Server-sent events: push ranked results as frames complete | UX: first result in ~5s not 5min | Medium |
| **JPEG over PNG** | Convert all frames to JPEG quality 85 before encode | ~3-4x smaller than PNG for photos | Low |

### Tier 3 — Future (post-hackathon)
- Redis queue + pre-warm workers
- Edge caching for repeated frames (hash dedup)

---

## 3. Revised Latency Targets (After Tier 1)

```
Frame (with Tier 1):
  SAM("person") ┐
                ├── Promise.all → max(~3s, ~3s) = ~3s  (was 8s sequential)
  SAM("clothing") ┘
  ↓ if detections = 0 → SKIP Muse (saves 11s) → mark possible-low
  ↓ if detections > 0 → Muse Spark batch → ~11s
  ─────────────────────────────────────────────────────
  Per frame with detections: ~14s (was ~19s) → 26% faster
  Per frame no detections:   ~3s  (was ~19s) → 84% faster
```

**With Tier 1 + 6 parallel workers (Tier 2):**
- 100 frames, assume 30% with detections, 70% empty:
  - 70 empty frames × 3s / 6 workers = ~35s
  - 30 detection frames × 14s / 6 workers = ~70s
  - **Total: ~105s ≈ 1.75 minutes** (vs 13.5 min sequential) ✅

**Demo scenario (10 frames):**
- With 6 workers + Tier 1: ~14-25s total → **first ranked result in ~5s via streaming** ✅

---

## 4. Implementation Checklist

- [x] `sharp` installed as backend dependency
- [ ] `sam31Client.ts` updated: image resize + parallel Promise.all
- [ ] `museSparkClient.ts` updated: zero-detect early exit
- [ ] Frame sampler in Phase 3: configurable fps (default 1fps)
- [ ] Bounded concurrency in Phase 4: p-limit, default 6 workers
- [ ] Server-sent events stream in Phase 6: progressive ranking push

---

## 5. What We Cannot Optimize

- **Muse Spark base latency (~11s)**: This is server-side inference time. We cannot reduce it. Mitigation: skip for zero-detect frames, run in parallel for detection frames.
- **SAM 3.1 base latency (~4s/call)**: This is server-side inference time. Mitigation: run both prompts concurrently.
- **Network round-trip**: ~100-300ms negligible vs inference time.

**Bottom line**: The API is inherently slow. The architecture's job is to hide that latency via parallelism + early-exit, not eliminate it.
