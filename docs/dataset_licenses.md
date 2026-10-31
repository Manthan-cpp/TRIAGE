# Dataset Licenses and Academic Sources

This document records the provenance, licensing terms, and permitted use cases for all datasets evaluated in Project Triage. In accordance with project ethics and `PLAN.md`, **no real disaster footage or footage depicting actual trauma/victims is ever used**. All imagery originates from academic and open-source benchmarks featuring actors simulating search-and-rescue (SAR) and missing-person scenarios in wilderness, debris, or outdoor terrain.

---

## 1. SARD (Search and Rescue Dataset)

* **Academic Citation:** Sambolek, S., & Ivasic-Kos, M. (2021). "Search and Rescue Image Dataset for Person Detection." *IEEE Access*, 9, 86842-86856. DOI: [10.21227/ahxm-k331](https://doi.org/10.21227/ahxm-k331).
* **Source & Distribution:** IEEE DataPort; Roboflow Universe (`sard-8xjhy`); Anton Pisarenko uav-human-detector benchmark (`AntonSHBK/uav-human-detector`).
* **License:** Creative Commons Attribution 4.0 International (CC BY 4.0) / MIT License on code & sample redistributions.
* **Permitted Use:** Research, educational, evaluation, and hackathon demonstration. Commercial use permitted with proper attribution.
* **Attribution Required:** Yes. Must cite Sambolek & Ivasic-Kos (2021).
* **Content:** Low-altitude UAV/drone frames capturing actors simulating missing, exhausted, or injured individuals across grass, forest, quarry, and dirt road terrains under varying illumination.

---

## 2. Low-Altitude UAV Person Detection Benchmark (UAV-SAR)

* **Source & Distribution:** Hugging Face repository `Mikiee/Person_Detection_and_Re-Identification_from_Low_Altitude_UAV-based_platform`.
* **License:** Creative Commons Attribution 4.0 International (CC BY 4.0).
* **Permitted Use:** Open for non-commercial research, academic study, and development evaluation.
* **Attribution Required:** Yes.
* **Content:** Low-altitude DJI drone video frames with standardized single-class (`person`) YOLO bounding-box annotations across multiple scales, light occlusions, and background clutter.

---

## 3. NOMAD (Natural, Occluded, Multi-scale Aerial Dataset)

* **Academic Citation:** Russell Bernal, A. M., Cleland-Huang, J., & Scheirer, W. (2024). "NOMAD: A Natural, Occluded, Multi-Scale Aerial Dataset for Emergency Response." *WACV 2024*.
* **Source & Distribution:** University of Notre Dame; GitHub (`ArtRuss/NOMAD`).
* **License:** Academic Research & Non-Commercial Educational Use.
* **Permitted Use:** Public academic evaluation of human detection under occluded aerial views.
* **Attribution Required:** Yes. Must cite Bernal et al. (WACV 2024/2025).
* **Content:** 100 actors performing walking, laying, and hiding under 10 calibrated visibility/occlusion levels across 5 aerial distances, specifically structured for search-and-rescue benchmarking.

---

## 4. HERIDAL (Human Rescue Imaging Database on Land)

* **Academic Citation:** Božić-Štulić, M., Gotovac, S., & Papić, V. (2019). "Human detection in aerial imagery based on saliency-guided neural network." *IEEE Transactions on Cybernetics*.
* **Source & Distribution:** IPSAR research group, FESB, University of Split (`fesb.unist.hr`); Zenodo (record 5662351); Roboflow mirror (`new-workspace-qsuag/heridal-t428z`).
* **License:** Creative Commons Attribution 3.0 Unported (CC BY 3.0).
* **Permitted Use:** Free for non-commercial research, academic benchmarking, and algorithmic development.
* **Attribution Required:** Yes. Must cite University of Split IPSAR research group.
* **Content:** High-altitude aerial orthophotos of wilderness and mountainous terrain with person annotations for search-and-rescue operations.

---

## Ethical & Legal Compliance Checklist

- [x] **No trauma footage:** Zero imagery of real-world casualties, disasters, or injured victims.
- [x] **Simulated targets only:** All persons are volunteer actors or simulated figures in controlled environments.
- [x] **License verified:** Every dataset used carries an open research license (CC BY 4.0, CC BY 3.0, MIT, or Academic Non-Commercial).
- [x] **Attribution documented:** Full academic citations recorded for paper and README inclusion.
