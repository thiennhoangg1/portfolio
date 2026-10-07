---
title: TapCount
tagline: Snap a photo of a cooler and get an inventory count. It learns from every correction.
year: "2026"
role: Solo developer
stack: [Python, FastAPI, YOLO, Gemini, Claude, PyTorch]
kind: side
order: 2
featured: true
---

Take a photo of a cooler, shelf, or delivery and TapCount counts how much of each beer you have. Your stock shows up as a virtual fridge with a photo of every item.

## How it works

- **Scan:** upload up to six photos. The AI draws a numbered box on every item it found so you can check its work, then you save the count or add it to stock as a delivery.
- **Fridge:** stock on shelves with counts, stock bars, and par-level warnings.
- **Learns over time:** every correction becomes a training label. Counting can use a cloud model (Google Gemini or Anthropic Claude) or a YOLO detector trained on your own labeled photos, running locally.
- **Watches mode:** photograph a watch to identify it, compare the asking price with your own market ranges, and get a checklist of red flags.
