# Stitch / UI Generation Prompt: Dashboard

*Based on the HimDrishti design system. This is the main overview screen presented to users after login, summarizing all active Antarctic operations.*

---

## 🧭 Context & Role

This screen serves as the **command center overview**. It provides a high-level summary of active voyages, current ice coverage, and critical alerts. 

**Design Directive:** Keep it professional, clean, and resembling a high-end research/scientific tool. **NO 3D animated backgrounds.** Use subtle gradients and grid patterns to create depth without distracting from the data.

---

## 🎨 1. Global Design System

### Theme: Deep Maritime Intelligence / Professional Dark Mode
- **Color Palette:**
  - `--background: #071420` (Deep Navy)
  - `--surface: #071420`
  - `--surface-container: #14212d`
  - `--surface-container-high: #1f2b38`
  - `--surface-container-highest: #293643`
  - `--primary: #aee9ff` (Ice Blue)
  - `--primary-fixed-dim: #49d6ff` (Bright Cyan)
  - `--secondary: #77d1ff`
  - `--on-surface: #d7e4f5` (Light Silver — main text)
  - `--on-surface-variant: #bbc9cf` (Muted labels)
  - `--outline: #869398`
  - `--outline-variant: #3c494e` (Borders)
  - `--error: #ffb4ab` (Danger / Alerts)
- **Typography:**
  - `Manrope` (bold, `600-700`) → Page headings, section titles, large metrics
  - `Inter` (regular, `400-700`) → Body text, labels
  - `JetBrains Mono` (`500`) → Data readouts, coordinates, timestamps

---

## 🖼️ 2. Full Page Layout

The screen has **3 structural layers**:

### Layer 1: Static Background
- **Solid background:** `bg-background` (`#071420`).
- **Subtle overlay:** A faint grid pattern (thin white lines at 3% opacity, 40×40px grid) to give a technical feel.
- **NO animations, NO 3D effects.** Purely clean, static background.

### Layer 2: Side Navigation Bar (Fixed Left)
### Layer 3: Top App Bar + Main Content Grid

---

## 📡 3. Side Navigation Bar (Fixed Left)

- **Width:** `64px` collapsed (mobile), `256px` expanded (desktop `md:` breakpoint).
- **Background:** `surface-container` solid, `border-right: 1px solid outline-variant`.

### Navigation Links
Vertical list of navigation items. 
- **Active Item:** `Dashboard` (`bg-secondary-container`, `text-on-secondary-container`, `font-bold`).
- Inactive items: `Voyage`, `Forecast`, `Alerts`, `Route Analysis`, `History`. (Hover state: `bg-surface-container-high`).
- Icons: Material Symbols.

---

## 📡 4. Top App Bar (Fixed Top)

- **Height:** `64px`. Spans from right edge of sidebar to right edge of viewport.
- **Background:** `surface/90` with `backdrop-blur-md` and `border-bottom: 1px solid outline-variant`.
- **Content:** 
  - Left: "HimDrishti Intelligence" (`Manrope`, 24px, `text-primary`).
  - Right: Icons (`sync`, `notifications`) and User Avatar.

---

## 🎛️ 5. Main Content Area: Dashboard Overview

The main content area should use a responsive CSS Grid (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3` or `4` with a `gap-6`), featuring a masonry or dashboard-style layout of "Glass Panels".

### Panel Style (The "Glass Card")
- **Background:** `rgba(20, 33, 45, 0.7)` (Surface Container slightly transparent).
- **Border:** `1px solid outline-variant`.
- **Border Radius:** `rounded-lg` (8px).
- **Padding:** `p-5` or `p-6`.

### Required Dashboard Widgets

**Widget 1: Active Fleet Status (Top Left, spans 2 columns on lg)**
- Header: "FLEET OVERVIEW" (`Inter`, `label-caps`).
- Content: A table or list showing 3 active vessels. 
  - Columns: Vessel Name, Current Location (Lat/Lon in Mono), Status (e.g., "In Transit", "Moored"), ETA.
  - Status indicators: Green/Cyan dot for active, Yellow for delayed.

**Widget 2: System Health & Coverage (Top Right, 1 column)**
- Header: "SYSTEM STATUS".
- Content: Large KPI numbers.
  - Satellite Link: "99.8% Uptime"
  - Active Data Feeds: "12/12 Online"
  - Last Sync: "2 mins ago" (`JetBrains Mono`).

**Widget 3: Recent Critical Alerts (Bottom Left, 1 column)**
- Header: "LIVE ALERTS".
- Content: A compact vertical list of 3 recent alerts.
  - E.g., "Iceberg Calving Detected - Ross Ice Shelf", "Severe Gale Warning - Sector 4".
  - Use `text-error` for high severity, `text-secondary` for warnings.

**Widget 4: Quick Weather / Ice Snapshot (Bottom Middle/Right, spans 2 columns)**
- Header: "REGIONAL SNAPSHOT".
- Content: A placeholder for a mini-map or simple bar/line chart representing ice concentration trends over the last 24 hours. Keep it abstract but technical (using SVG placeholders or simple CSS shapes).

---

## ⚡ 6. Micro-Interactions & Details

- **Hover Effects:** When hovering over a widget, slightly lighten the border (`border-primary/50`) to show interactivity.
- **Data Contrast:** Ensure all data values are bright (`#ffffff` or `#d7e4f5`) so they pop against the dark backgrounds. Labels should remain muted (`#bbc9cf`).
- **Clean aesthetic:** Avoid unnecessary visual clutter. The focus is entirely on data density and readability.
