# Project Triage — System Notes & Pipeline Rules

Last updated: 2026-10-31

## 1. Frame Sampling & Normalization Strategy

### 1.1 Video Frame Sampling Rule
- **Default rate:** 1 frame per second (`1 fps`).
- **Filter:** FFmpeg `-vf fps=1,scale='min(800,iw)':-1:flags=lanczos`
- **Rationale:** Aerial search drone footage typically sweeps an area at speeds where 1 fps provides sufficient spatial overlap between consecutive frames. Sampling at full video rate (e.g. 30 fps) would:
  - Generate 30x more model calls, ballooning API costs from cents to dollars per short clip.
  - Inflate triage queue latency with 97% redundant duplicate signals.
- **Timestamping:** Every sampled frame is assigned an exact fractional second timestamp (`t0s`, `t1s`, `t2s`...) stored in the unit record.

### 1.2 Image & Frame Normalization Rule
- **Max Dimension:** 800px on the longest dimension (preserving aspect ratio).
- **Target Format:** JPEG at quality 85 (`sharp.jpeg({ quality: 85 })`).
- **Benchmark Rationale:**
  - Original raw UAV images (~340KB - 1.2MB PNG/high-res JPG) resize to ~90KB.
  - Reduces network transfer payload by ~71%.
  - Speeds up SAM 3.1 server-side visual token decode latency from ~3.9s to ~1.5s per prompt.
  - Combined with intra-frame parallel prompts, wall-clock perception latency dropped by 74% (6,722ms -> 1,722ms).

### 1.3 Storage & Manifest Layout
Every ingestion job creates an isolated directory in `data/ingested/<jobId>/`:
- `raw/`: Unaltered original uploaded files (for archive/evidence).
- `normalized/`: Standardized 800px JPEG frames ready for perception.
- `meta.json`: Job creation timestamp, source label, and original filenames.
- `manifest.json`: Structured list of every processable unit with relative paths, dimensions, and timestamps.

### 1.4 Unit Record Schema
```json
{
  "unitId": "unit_0001",
  "sourceFile": "flight_survey_01.mp4",
  "sourceType": "video",
  "timestampSec": 0,
  "filePath": "data/ingested/job_xyz/normalized/frame_0001_t0s.jpg",
  "width": 800,
  "height": 450
}
```
