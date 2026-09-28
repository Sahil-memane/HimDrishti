# Stitch / UI Generation Prompt: Alerts

*Based on the HimDrishti design system. This page handles live risk monitoring and system alerts.*

---

## 🧭 Context & Role

The Alerts panel is a unified inbox/feed for all system warnings, iceberg detections, and severe weather notices. It requires a highly readable list/detail layout.

**Design Directive:** Clean, professional, high-contrast. **NO 3D animations.** Focus on list readability, filtering, and rapid information digestion.

---

## 🎨 1. Global Design System

(Follows standard HimDrishti Dark Mode tokens: `--background: #071420`, `--primary: #aee9ff`, `--error: #ffb4ab` for high severity).

---

## 🖼️ 2. Full Page Layout

- **Static Background:** Solid `#071420`.
- **Side Navigation:** Fixed left. **Active Item:** `Alerts`.
- **Top App Bar:** Fixed top.

---

## 🎛️ 5. Main Content Area: Inbox / Split View

Use a classic "Master-Detail" or Split-Pane layout.

### Left Pane: Alert Feed (35% width)
- **Top Bar:** 
  - Search input ("Search alerts...").
  - Filter chips: "All", "Critical", "Warnings", "Info".
- **List Items (The Feed):**
  - A scrollable list of alert cards.
  - **Selected State:** The active alert card should have a `border-primary` and `bg-primary/10`.
  - **Card Content:** 
    - Icon (e.g., `warning` in red for critical, `info` in blue).
    - Title: "Iceberg Calving Event".
    - Timestamp: "10:42Z" (`Mono`).
    - Region snippet: "Ross Sea Sector".

### Right Pane: Alert Details (65% width)
- **Container:** A large glass panel (`bg-surface-container`, `border border-outline-variant`).
- **Header Section:**
  - Large Alert Title (`Manrope`, 24px).
  - Badges: [Severity: CRITICAL] [Status: UNRESOLVED].
  - Exact Timestamp and Coordinates (`Mono`).
- **Body Section:**
  - A detailed text description of the event.
  - **Telemetry Box:** A dark nested container showing raw data (Wind speed, Ice mass estimate, Distance to nearest vessel).
- **Action Footer:**
  - Buttons: "Acknowledge Alert" (Primary button style), "Route to Nav System" (Secondary button style).

---

## ⚡ 6. Details & Interactions

- **Severity Colors:** 
  - Critical/High: Use `--error` (`#ffb4ab`) heavily for icons and text highlights.
  - Medium/Warning: Use a distinct warning color (e.g., a muted yellow/orange if available, or `--secondary`).
  - Low/Info: Use `--on-surface-variant`.
- **Interactivity:** Hovering over alert list items should highlight them slightly (`bg-surface-container-high`).
