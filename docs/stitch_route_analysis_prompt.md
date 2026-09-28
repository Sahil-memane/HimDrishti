# Stitch / UI Generation Prompt: Route Analysis

*Based on the HimDrishti design system. This page provides post-generation analysis of a specific maritime route.*

---

## 🧭 Context & Role

After a route is generated (via the Voyage Setup form), the user lands here to review the safety, efficiency, and waypoints of the AI-generated path. 

**Design Directive:** Highly technical, data-dense, and professional. **NO 3D animated backgrounds.** Focus on charts, metrics, and tabular data.

---

## 🎨 1. Global Design System

(Follows standard HimDrishti Dark Mode tokens: `--background: #071420`, `--primary: #aee9ff`, etc.).

---

## 🖼️ 2. Full Page Layout

- **Static Background:** Solid `#071420` with subtle grid.
- **Side Navigation:** Fixed left. **Active Item:** `Route Analysis`.
- **Top App Bar:** Fixed top.

---

## 🎛️ 5. Main Content Area: Technical Dashboard

A vertical stacking layout of technical panels.

### Top Section: Route Summary Strip
- A horizontal strip of KPI cards (4 columns).
- Metrics:
  - **Total Distance:** "1,240 NM"
  - **Est. Transit Time:** "4d 12h"
  - **Est. Fuel Consumption:** "84,000 L"
  - **Overall Risk Score:** "LOW (2.4/10)" (Text colored based on score, e.g., green/cyan).

### Middle Section: Route Profile / Chart (Spans full width)
- **Container:** Glass panel with `border border-outline-variant`.
- **Header:** "ENVIRONMENTAL PROFILE ALONG ROUTE".
- **Content:** A placeholder for a complex line/area chart. 
  - E.g., An elevation or "Ice Thickness" profile showing X-axis (Distance) and Y-axis (Ice Thickness / Wind Speed).
  - Use simple CSS/HTML to block out the chart area (a dark rectangle with some abstract grid lines and a stylized curved SVG path representing data).

### Bottom Section: Waypoint Manifest (Spans full width)
- **Header:** "WAYPOINT MANIFEST" + an "Export CSV" button.
- **Content:** A detailed data table.
  - Columns: `WPT ID`, `LAT/LON`, `Distance Leg (NM)`, `Est. Time (UTC)`, `Ice Risk %`.
  - Rows: 4-5 example rows of data. Use `JetBrains Mono` for all tabular data.
  - Styling: Dark table headers (`bg-surface-container-high`), thin borders between rows (`border-b border-outline-variant/30`).
  - Hover effect on rows.

---

## ⚡ 6. Details & Interactions

- **Table Design:** The waypoint table must look extremely crisp and readable. High contrast for values (`#ffffff`), muted for column headers (`#bbc9cf`).
- **Export Action:** The "Export" button should have an icon and a subtle hover state.
- **Professionalism:** This screen should feel like a serious engineering or maritime navigation tool. Keep padding consistent and alignment strict.
