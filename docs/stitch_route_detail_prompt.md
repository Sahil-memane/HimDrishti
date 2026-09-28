# Stitch / UI Generation Prompt: RouteDetail Component

*Based on the HimDrishti design system and Architecture. This component visualizes the deterministic outputs of the Route Optimization model.*

---

## 🧭 1. Context & Role

The Route Detail panel is an analytical dashboard designed to accompany the map view. Its job is to take the raw JSON data returned by the route optimization API and present it as a highly professional, tabular manifest.

The data consists of top-level Key Performance Indicators (KPIs) like total distance and ETA, followed by an array of waypoints that make up the actual route legs.

---

## 🎨 2. Design System & Aesthetics

- **Vibe:** Highly technical, data-dense, and strictly aligned. It should feel like a digital maritime manifest or aerospace telemetry readout.
- **Backgrounds:** Use solid, deep navy colors for the main backgrounds with slight variations in lightness to separate sections.
- **Typography:**
  - Use a clean sans-serif for section headers and metric titles (uppercase, muted color, wide tracking).
  - Use a large, bold font for the main KPI values to make them highly legible.
  - Use a monospace font for all tabular data (coordinates, timestamps, fuel numbers) so the digits align perfectly in columns.
- **Contrast:** Ensure all primary data values are bright white or cyan so they pop sharply against the dark backgrounds.

---

## 🖼️ 3. Component Layout & Structure

### Main Container
Create a large, centrally aligned container or a wide side-panel. Give it a subtle glassmorphic effect (dark background, slight blur, faint borders) and a fixed height so the internal contents can scroll.

### Top Section: Voyage KPIs
Create a grid layout at the top of the panel to display four summary cards. 
- The cards should display: Total Distance, Arrival ETA, Estimated Fuel, and Overall Route Risk.
- Separate these cards using thin, muted borders (a 1px grid gap approach works well here).
- For the "Overall Route Risk" value, implement color-coding logic: if the value is low, color it cyan or green; if moderate, amber; if high, neon red.

### Middle Section: Waypoint Manifest Table
Below the KPIs, build a data table that takes up the remaining vertical space. The container around this table should allow vertical scrolling.
- **Header:** Create a sticky table header that remains visible while scrolling. The columns should be: Sequence Number, Latitude, Longitude, ETA, Cumulative Fuel, and Leg Risk Score.
- **Rows:** Iterate over the provided waypoint data to generate the rows. 
  - Ensure the coordinates are formatted to exactly 4 decimal places.
  - For the "Leg Risk Score" column, display the number alongside a small circular color indicator (green, yellow, or red based on the severity of the score).
  - Add a hover effect to the table rows so their background slightly lightens when the user mouses over them.

### Footer Section
At the very bottom of the panel, create a fixed footer area.
- Align the contents to the right.
- Add two action buttons: "Download GeoJSON" and "Export Manifest".
- Style the export manifest button as a primary, solid cyan button that glows slightly on hover. Style the GeoJSON button as a secondary, outlined button. Include appropriate icons for both.

---

## ⚡ 4. Data Binding Expectations

Design the component assuming it will receive a JSON payload with root-level properties for the KPIs (`total_distance_km`, `eta`, `total_fuel_estimate_l`, `overall_risk_score`) and a `waypoints` array. Ensure your UI fields map exactly to this conceptual structure without inventing unrelated data points.
