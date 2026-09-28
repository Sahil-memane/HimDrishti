# Stitch / UI Generation Prompt: Forecast

*Based on the HimDrishti design system. This page provides deep-dive sea ice and weather forecasting tools.*

---

## 🧭 Context & Role

The Forecast panel allows analysts and mariners to view predictive models of sea ice drift, iceberg movement, and weather conditions. 

**Design Directive:** Professional, scientific layout. **NO 3D animated backgrounds.** Emphasize high-contrast data presentation, timeline controls, and a large map/visualization area.

---

## 🎨 1. Global Design System

(Follows standard HimDrishti Dark Mode tokens: `--background: #071420`, `--primary: #aee9ff`, etc. Fonts: `Manrope` for headings, `Inter` for UI, `JetBrains Mono` for data).

---

## 🖼️ 2. Full Page Layout

- **Static Background:** Solid `#071420` with a faint 40x40px grid overlay. No animations.
- **Side Navigation:** Fixed left. **Active Item:** `Forecast`.
- **Top App Bar:** Fixed top. Standard layout.

---

## 🎛️ 6. Main Content Area: Forecasting Workspace

A split layout: A large visualization area taking up the majority of the screen, and a sidebar or bottom bar for controls and metrics.

### 1. Map Visualization Area (Left / Top, 70% width or height)
- **Container:** Large `rounded-lg` panel, `border border-outline-variant`.
- **Content:** A static, high-quality dark-mode map placeholder image (e.g., a top-down view of Antarctica with data overlays).
- **Overlays on Map:**
  - A small floating legend panel (top right) showing "Ice Concentration (%)" with a color scale gradient (Deep Blue to White).
  - Floating coordinates text (`JetBrains Mono`) tracking mouse position placeholder.

### 2. Timeline / Scrubber Control (Bottom of Map)
- A dedicated horizontal control panel simulating a time-slider.
- **Play/Pause button**.
- **Slider track:** Shows a 72-hour forecast window (e.g., "Now", "+24h", "+48h", "+72h").
- The slider thumb should use `--primary` color.

### 3. Forecast Metrics Sidebar (Right, 30% width)
- **Header:** "SECTOR ALPHA DATA"
- A vertical stack of metric cards:
  - **Sea Ice Extent:** Current value vs. Historical average (show a delta percentage like `+2.4%` in red).
  - **Surface Temperature:** Large readout (e.g., `-18.5 °C`) in `Manrope`.
  - **Wind Vector:** Speed (KTS) and Direction (Degrees in `Mono`).
- Include a small dropdown to change the active "Sector" or "Region".

---

## ⚡ 7. Details & Interactions

- **Data Hierarchy:** The map is the focal point. Controls should be obvious but not visually overwhelming.
- **Input Contrast:** Any dropdowns or inputs must have bright text (`#ffffff`) on dark backgrounds.
- **Scientific Feel:** Use monospace fonts generously for any numerical data, timestamps, or coordinates.
