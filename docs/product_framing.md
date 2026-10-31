# Product Framing & Ethical Scope — Project Triage

Last updated: 2026-10-31T20:58:00+05:30  
Document Version: 1.0 (Phase 1 Deliverable)

---

## 1. Target User & Operational Use-Case

### 1.1 The User Persona
* **Role:** Search-and-Rescue (SAR) Operations Coordinator / Video Reviewer.
* **Operating Environment:** Base-camp field station, mobile command post, or regional coordination center, working on a standard laptop under operational time pressure.
* **Input Burden:** 5 to 50 hours of raw aerial drone or bodycam video ingested per collection pass across disaster terrain (earthquake rubble, mudslides, quarry collapses, wilderness search).
* **The Manual Bottleneck:** Without automated assistance, reviewers must manually scrub through hours of footage in chronological or random order. Over 80% of reviewed footage contains empty terrain, rocks, or trees, causing severe cognitive fatigue and delaying human attention on genuinely critical frames.

### 1.2 What Triage Does (and Does NOT Do)
* **What Triage DOES:** It ingests raw video batches, extracts sampled frames, uses SAM 3.1 to identify candidate visual signals (clothing, person-like geometries), chains those detections into Muse Spark for comparative batch reasoning, and surfaces a **prioritized, justified review queue**. It ensures that the first 30 minutes of human review time are focused on the highest-likelihood candidate frames.
* **What Triage DOES NOT DO:** Triage **never** autonomously decides whether a human is present or absent. It does **not** replace human visual judgment, does **not** dispatch rescue personnel automatically, and does **not** claim detection certainty.

---

## 2. Non-Negotiable Framing & Vocabulary Rules

These rules are permanent and mandatory. They govern all frontend copy, prompt engineering, backend API responses, the README, and the demo presentation.

### 2.1 Banned Vocabulary ("Certainty Claims")
The system, code, and interface must **NEVER** use words that imply certainty of human life or presence:
* ❌ **BANNED:** `"detected"`, `"detection confirmed"`, `"survivor found"`, `"survivor located"`, `"human confirmed"`, `"guaranteed"`, `"victim located"`.

### 2.2 Approved Vocabulary ("Triage & Decision Support")
All signals, overlays, and rankings must use restrained, operational language:
* ✅ **APPROVED:** `"flagged for review"`, `"candidate signal"`, `"priority rank"`, `"possible indicator"`, `"reviewer attention recommended"`.

### 2.3 Strict Confidence Label Vocabulary
Every candidate presented in the Priority Queue and Clip Review tabs must display its confidence level using **strictly one of three approved tokens**:
1. `possible-high` — Corroborating multi-prompt visual signals (e.g. both body geometry and clothing fragment detected).
2. `possible-medium` — Single clear visual signal with moderate background contrast.
3. `possible-low` — Weak, ambiguous, or solitary signal on complex/noisy terrain (styled calmly, never alarming).

**Rules:**
- Never display raw floating-point probabilities as if they were exact certainties (e.g., no "94.2% match").
- Every label must include clear visible text alongside any icon or indicator (no icon-only labels).

### 2.4 The Zero-Dismissal Rule
* The system **never auto-dismisses, filters out, or hides** a video clip from the human reviewer.
* A low-confidence item or an item with zero candidate flags is pushed to the bottom of the queue, but remains **fully visible, accessible, and reviewable**. The human operator retains full authority and oversight over 100% of the ingested footage.

---

## 3. Real-World Partnership & Deployment Statement

* **Current Status:** Project Triage is currently an **experimental proof-of-concept** and decision-support prototype developed for the Meta Global AI Developer Hackathon.
* **Pre-Deployment Requirements:** 
  1. A production version would require formal research partnerships and operational calibration with accredited Search-and-Rescue organizations (e.g., FEMA, INSARAG, Mountain Rescue teams).
  2. The system must undergo rigorous multi-environment field validation under diverse weather, thermal, and sensor conditions before integration into real mission workflows.
  3. No rescue dispatch decisions should ever be made based solely on automated triage rankings.
