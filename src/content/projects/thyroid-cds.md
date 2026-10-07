---
title: Thyroid CDS
tagline: Clinical decision support for thyroid hormone testing and dose titration.
year: "2026"
role: Data pipeline & modeling
stack: [Python, Polars, scikit-learn, MIMIC-IV]
kind: research
order: 3
featured: true
credits: With Gabriella Arguello and Lian Lian, Washington University in St. Louis
---

A two-arm clinical decision support system built on MIMIC-IV.

- **Arm 1** routes new or undiagnosed patients: guideline thresholds first, then a risk model for the gray zone.
- **Arm 2** supports titration for patients already on levothyroxine, using a matched cohort and split-conformal ranges.

By design, neither arm outputs a directive numeric dose. The system is built as non-device clinical decision support under the 21st Century Cures Act.

The repo contains the data acquisition and ingestion pipeline (MIMIC-IV to analysis-ready Parquet tables for both arms) plus the Arm 1 routing logic.
