# Project Triage

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Meta Model API](https://img.shields.io/badge/Meta%20AI-SAM%203.1%20%7C%20Muse%20Spark%201.3-blueviolet)](https://api.meta.ai)
[![Demo Video](https://img.shields.io/badge/YouTube-Demo%20Video-red?logo=youtube)](https://www.youtube.com/watch?v=xDeto4KjvcE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178C6.svg)](https://www.typescriptlang.org)

> **Tactical Aerial Search & Rescue (SAR) Reconnaissance Copilot**  
> Built for the **Meta Global AI Developer Hackathon** — Track: *Build for Your World*.

**Project Triage** is an AI-powered tactical reconnaissance copilot that transforms raw aerial drone sweeps into prioritized, life-saving intelligence. By pairing **Meta SAM 3.1** spatial segmentation with **Meta Muse Spark 1.3** situational reasoning, Triage eliminates hours of manual footage review during the golden hour of disaster response.

📺 **[Watch the 2-Minute Demo Video on YouTube](https://www.youtube.com/watch?v=xDeto4KjvcE)**

---

<p align="center">
  <img src="assets/screenshots/02_pipeline_execution.png" width="49%" alt="Pipeline Execution Status" />
  <img src="assets/screenshots/04_earthquake_rubble_triage.jpg" width="49%" alt="Earthquake Disaster Rubble Triage" />
</p>

---

## The Problem Statement

When floods, earthquakes, or wildfires hit, emergency teams deploy aerial drones capturing tens of thousands of high-resolution 4K frames. Spotting a motionless survivor, submerged clothing, or a distant distress gesture is an excruciating manual process. 

Responders face acute **cognitive fatigue** scanning miles of empty wreckage under extreme time pressure. In emergency triage, the first **"golden hour"** determines survival—yet valuable minutes are lost scrubbing through empty video streams.

## The Solution: Project Triage

Project Triage automates the reconnaissance bottleneck through an intelligent, zero-loss triage pipeline:
- **Intelligent Backlog Ingestion:** Ingests raw drone sweeps (MP4, MOV) and disaster photos, filtering thousands of redundant frames through motion and perceptual sampling.
- **Zero-Dismissal Safety Protocol:** AI never silently discards a candidate. High-confidence cues are prioritized, while ambiguous signals are elevated to human operators for verification.
- **Human-in-the-Loop Mission Control:** Responders inspect spatial segmentations, surrounding environmental hazards, and telemetry in an obsidian glassmorphism interface to dispatch rescue teams in seconds.

---

## Target Users

1. **Search & Rescue (SAR) Teams:** Rapidly pinpoint stranded hikers, missing persons, or injured victims in dense wilderness or rugged terrain.
2. **Emergency Operations Centers (EOC):** Triage floodwaters and collapsed structures to deploy medical and extraction units by urgency.
3. **UAV / Drone Recon Operators:** Process raw drone sweeps immediately upon landing (or over field uplinks) without needing manual scrubbing.

---

## System Workflow

```mermaid
flowchart LR
    A["Raw Drone Footage<br/>(Video / Photos)"] --> B["Intelligent Keyframe Ingestion<br/>(1 fps & Perceptual Sampling)"]
    B --> C["Meta SAM 3.1<br/>(Spatial Boundary Masks)"]
    C --> D["Meta Muse Spark 1.3<br/>(Situational Risk Reasoning)"]
    D --> E["Tactical Triage Queue<br/>(P1 Critical ➔ P4 Monitor)"]
    E --> F["Human Operator Action<br/>(Dispatch / Verify / Escalate)"]

    style A fill:#1e293b,stroke:#475569,color:#fff
    style B fill:#1e293b,stroke:#475569,color:#fff
    style C fill:#3b82f6,stroke:#60a5fa,color:#fff
    style D fill:#8b5cf6,stroke:#a78bfa,color:#fff
    style E fill:#0f172a,stroke:#3b82f6,color:#fff
    style F fill:#059669,stroke:#34d399,color:#fff
```

---

## Meta AI Integration & Significance

Project Triage bridges the critical gap between basic object detection and actionable rescue reasoning by combining two Meta model families:

| Meta Model | Role in Pipeline | Tactical Significance |
| :--- | :--- | :--- |
| **Meta SAM 3.1**<br/>(`sam-3.1`) | **Spatial Perception & Zero-Shot Segmentation** | Generates pixel-accurate boundary masks for survivors, clothing, and vehicles across chaotic wilderness, rubble, and flood terrain without task-specific fine-tuning. |
| **Meta Muse Spark 1.3**<br/>(`muse-spark-1.3`) | **Contextual Reasoning & Hazard Triage** | Evaluates the immediate environment around each candidate (immobility, structural instability, rising water) to compute structured risk scores and assign priority tiers (P1 to P4). |

**Why this matters:** Traditional computer vision stops at drawing a generic bounding box. Meta Muse Spark understands *why* a detected person in a collapsed building is in critical danger (P1) versus an upright resting hiker on a trail (P3), giving commanders instant situational context.

---

<p align="center">
  <img src="assets/screenshots/01_batch_ingest.png" width="49%" alt="Batch Ingestion Setup" />
  <img src="assets/screenshots/03_forest_sar_review.jpg" width="49%" alt="Forest Search & Rescue Review" />
</p>

---

## Setup & Startup Instructions

### Prerequisites
- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher)
- **Meta Model API Key**

### 1. Installation
Clone the repository and install all dependencies:
```bash
git clone https://github.com/Manthan-cpp/TRIAGE.git
cd TRIAGE
npm run install:all
```

### 2. Configure Environment
Copy the example environment file and add your Meta API key:
```bash
cp .env.example .env
```
Inside `.env`:
```ini
META_MODEL_API_KEY=your_meta_model_api_key_here
META_MODEL_API_BASE_URL=https://api.meta.ai/v1
PORT=4000
```

### 3. Build & Launch
Build both frontend and backend bundles, then start the production server:
```bash
npm run build
npm start
```
Open **`http://localhost:4000`** in your browser.

> **Instant State Reset:** To clear test jobs, evaluation candidates, and uploaded cache back to a clean slate, click the **Reset Data** button in the dashboard or run:
> ```bash
> npm run reset
> ```

---

## Acknowledgements

- **Meta AI & Cerebral Valley:** For hosting the Meta Global AI Developer Hackathon and providing access to the Meta Model API ecosystem (SAM 3.1 & Muse Spark 1.3).
- **Academic Benchmark Datasets:** Evaluation imagery uses open, simulated academic search-and-rescue datasets with actors:
  - **SARD (Search and Rescue Image Dataset for Person Detection):** Sambolek & Ivasic-Kos (2021), *IEEE Access*.
  - **UAV-SAR (Low-Altitude UAV Person Detection Benchmark):** CC-BY 4.0.
  - **NOMAD:** Russell Bernal et al. (WACV 2024).
  - **HERIDAL:** Božić-Štulić et al. (2019), *IEEE Transactions on Cybernetics*.
  *(No actual disaster casualties or trauma footage are included).*

---

## License & Contributing

- **License:** Distributed under the [MIT License](LICENSE).
- **Contributing:** Please review our [Contributing Guidelines](CONTRIBUTING.md) to learn about our code standards, test suite, and life-safety design principles.
