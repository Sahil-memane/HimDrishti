# Stitch / UI Generation Prompt: "How It Works" — End-to-End System Flow Page

*Redesigned to accurately reflect the real HimDrishti pipeline architecture: from voyage input → ML model orchestration → dashboard visualization.*

---

## 🎨 1. Global Context & Design System

### Theme: Premium Dark Maritime Intelligence
This page is the **technical credibility centerpiece** of the landing site. It must feel like a mission-control system walkthrough — precise, animated, and deeply technical, while remaining beautiful and approachable.

- **Background:** Full-bleed dark polar scene — deep abyssal navy (`#030b17`) with a subtle Aurora Borealis gradient wash at the top (greens/purples, `opacity: 0.3`). An icebreaker ship is faintly visible in the lower-right background through fog. The entire background has a `backdrop-filter: blur(2px)` haze to keep focus on the UI.
- **Color Palette:**
  - **Primary Glow:** Bioluminescent Cyan (`#00e5ff`) — used for all active connections, lines, and highlighted icons.
  - **Secondary Accent:** Arctic Teal (`#06b6d4`) — used for secondary labels and borders.
  - **Warning/Risk:** Soft Amber (`#fbbf24`) — used for risk score indicators.
  - **Success:** Emerald Green (`#34d399`) — used for completion states.
  - **Backgrounds:** Deep Navy Glass (`rgba(10, 20, 40, 0.6)`) with `backdrop-filter: blur(16px)`.
  - **Text:** Pure White (`#ffffff`) for headings, `rgba(255, 255, 255, 0.7)` for body.
- **Typography:**
  - **Headings:** `Montserrat` or `Inter`, weight 700, tight letter-spacing.
  - **Body/Descriptions:** `Inter`, weight 400/500, `14px`–`16px`.
  - **Mono/Technical Labels:** `JetBrains Mono` or `Fira Code`, weight 400, `12px`–`13px` — used for API endpoint labels, model names, and DB table names.

---

## 📐 2. Page Layout: Vertical Scroll with 5 Connected Phases

The page is a **single vertically-scrolling flow** with 5 distinct phase sections connected by a glowing animated **pipeline spine** running down the center-left of the page.

### The Pipeline Spine (Connecting Thread)
- A **vertical glowing cyan line** (`2px solid #00e5ff`, with `box-shadow: 0 0 12px #00e5ff`) runs from the top of Phase 1 to the bottom of Phase 5.
- At each phase transition point, the line has a **glowing node dot** (a `16px` circle, pulsing cyan glow animation).
- Between phases, small animated **chevron arrows** (▼) travel downward along the line to indicate data flow direction.
- On scroll, as each phase enters the viewport, its section and the connecting line segment **animate in** (fade-up + glow pulse).

---

## 🚢 3. Section Header (Above Phase 1)

- **Title:** **"How HimDrishti Works"**
  - Style: `48px`, `font-weight: 700`, white, centered.
- **Subtitle:** *"From voyage parameters to a fully visualized, AI-optimized polar route — here is the exact pipeline powering your safety."*
  - Style: `18px`, `font-weight: 400`, `rgba(255,255,255,0.6)`, centered, `max-width: 700px`, `margin: 0 auto`.
- **Margin bottom:** `80px` before Phase 1 begins.

---

## 📝 4. Phase 1: Voyage Setup (User Input)

### Layout: Left Card + Right Visual
- **Left Side (60%):** A premium glassmorphism card (`rounded-3xl`, heavy blur).
  - **Phase Badge:** A small pill at the top-left: `PHASE 1` in cyan mono text with a cyan left-border.
  - **Title:** **"Define Your Voyage"** — `28px`, white, bold.
  - **Description:** *"The planner enters all voyage parameters into a clean form. Upon submission, the system instantly returns a tracking ID and begins the async AI pipeline in the background."*
  - **Input Fields Mockup (Read-Only Visual):**
    Display a styled, non-interactive form mockup inside the card showing these fields with example values pre-filled:
    | Field | Example Value |
    |---|---|
    | Start Coordinates | `68.5°N, 33.2°E` |
    | Destination Coordinates | `71.3°N, 42.8°E` |
    | Speed (knots) | `12.0` |
    | Fuel Consumption (L/hr) | `500` |
    | Departure Time | `2026-09-01 08:00 UTC` |
    | Risk Tolerance | `Medium` (dropdown showing Low / Medium / High) |
  - **Submit Button:** Glowing cyan pill button labeled **"Plan Voyage →"** with a subtle pulse animation.

- **Right Side (40%):** A small floating code block (dark terminal style, `bg-gray-950`, monospace font) showing the API response:
  ```json
  {
    "voyage_id": "4e4dca0d-...",
    "status": "processing",
    "message": "Pipeline initiated"
  }
  ```
  With a small label above: `POST /api/voyage → 202 Accepted`

- **Tech Tags (Bottom of card):** Small rounded pills: `React Form`, `FastAPI`, `PostgreSQL`, `JWT Auth`

---

## 🧊 5. Phase 2: Multi-Model Hazard Synthesis (Background Pipeline)

### Layout: Full-Width Horizontal Flow Diagram
This is the most visually complex section — it shows the 3 ML models executing in sequence.

- **Phase Badge:** `PHASE 2` pill.
- **Title:** **"AI Hazard Synthesis Pipeline"** — `28px`, white, bold.
- **Description:** *"Once the voyage is submitted, an async background task orchestrates three specialized ML microservices in sequence. Each model reads from and writes to the shared PostGIS database."*

### The Pipeline Diagram (Horizontal, Inside a Large Glass Card)
A horizontal flow diagram with **4 connected nodes**, each node being a smaller glass card:

#### Node 1: API Gateway (Orchestrator)
- **Icon:** A gear/cog with a play button overlay.
- **Label:** `API Gateway`
- **Sublabel (mono):** `pipeline.py`
- **Status Indicator:** Green dot + "Triggers Pipeline"

**→ Animated glowing arrow →**

#### Node 2: Model 1 — Sea Ice Forecasting
- **Icon:** A snowflake/ice crystal with a heatmap gradient overlay.
- **Label:** `Model 1: Sea Ice`
- **Sublabel (mono):** `ConvLSTM / LSTM`
- **Key Output (small tag):** `sea_ice_forecasts` table
- **Detail Tooltip/Expandable:** "Predicts 7-day sea ice concentration (SIC) grid. Each cell stores `sic_percent`, `horizon_day`, and `confidence` (0–1)."

**→ Animated glowing arrow →**

#### Node 3: Model 2 — Iceberg Trajectory Prediction
- **Icon:** A triangle (iceberg) with a dotted trajectory arc.
- **Label:** `Model 2: Icebergs`
- **Sublabel (mono):** `Kinematic + Kalman`
- **Key Output (small tag):** `iceberg_predictions` table
- **Detail Tooltip/Expandable:** "Predicts 7-day iceberg drift positions using ocean currents. Each prediction stores `lat`, `lon`, `horizon_day`, and `confidence_radius_km` (grows with uncertainty)."

**→ Animated glowing arrow →**

#### Node 4: Model 3 — A* Route Optimization
- **Icon:** A compass/navigation arrow with a graph network overlay.
- **Label:** `Model 3: Routing`
- **Sublabel (mono):** `A* Search`
- **Key Output (small tag):** `waypoints` + `risk_scores` tables
- **Detail Tooltip/Expandable:** "Builds a navigable grid, scores each cell on a 6-factor weighted cost function (ice risk 40%, iceberg risk 30%, wave risk 15%, wind 5%, current 5%, fuel 5%), blocks unsafe cells (SIC > 90%, iceberg < 20km, waves > 5m), and returns the lowest-cost A* path."

### Below the Diagram: Database Write Summary
A small dark card showing what gets written to PostgreSQL:
```
📦 DB Writes:
├── sea_ice_forecasts   → 7-day SIC grid (confidence per cell)
├── iceberg_predictions → 7-day drift positions (confidence radius)
├── waypoints           → Ordered route (lat, lon, ETA, fuel, risk)
├── risk_scores         → Per-waypoint breakdown (ice / iceberg / weather)
└── voyages.status      → Updated to 'planned' ✅
```

---

## 📊 6. Phase 3: Route Data Retrieval & Explainability

### Layout: Left Visual (JSON) + Right Card
- **Phase Badge:** `PHASE 3` pill.
- **Title:** **"Explainable Route Intelligence"** — `28px`, white, bold.
- **Description:** *"The frontend polls the API until the pipeline completes. The response includes not just the optimal path, but full explainability — a human-readable reasoning string and per-waypoint risk factor breakdowns."*

- **Left Side (50%):** A styled JSON response block (dark terminal) showing a truncated but realistic API response:
  ```json
  {
    "voyage_id": "4e4dca0d-...",
    "status": "planned",
    "total_waypoints": 62,
    "overall_risk_score": 0.161,
    "eta": "2026-09-03T09:05:46Z",
    "fuel_estimate_liters": 11274.08,
    "reasoning": "Path optimized for High risk tolerance.
      Avoided all critical hazards (SIC > 90%, Icebergs < 20km).
      Average SIC encountered: 11.6%.
      Estimated fuel: 11274.1L.",
    "waypoints": [
      {
        "sequence": 1,
        "lat": 68.50, "lon": 33.20,
        "risk_factors": {
          "ice_risk": 0.05,
          "iceberg_risk": 0.00,
          "weather_risk": 0.12
        }
      }
    ]
  }
  ```
  Label above: `GET /api/voyage/{id}/route → 200 OK`

- **Right Side (50%):** A glass card with 4 large KPI stat blocks stacked vertically:
  | Metric | Value | Icon |
  |---|---|---|
  | Waypoints | `62` | 📍 Map pin |
  | Overall Risk | `0.161 (Low)` | 🛡️ Shield (green) |
  | ETA | `Sep 3, 09:05 UTC` | ⏱️ Clock |
  | Fuel Estimate | `11,274 L` | ⛽ Fuel pump |

  Below the KPIs, a small section titled **"Why This Path?"** with the reasoning text rendered in a subtle italic style inside a bordered box.

---

## 🗺️ 7. Phase 4: Dashboard Visualization (Map Rendering)

### Layout: Full-Width Simulated Dashboard Screenshot
- **Phase Badge:** `PHASE 4` pill.
- **Title:** **"Interactive Voyage Dashboard"** — `28px`, white, bold.
- **Description:** *"All data layers converge on a single Mapbox GL map. The planner sees the optimized route, ice concentration heatmaps, iceberg markers with growing confidence radii, and real-time alerts — all in one view."*

- **Main Visual:** A large, prominent mockup of the dashboard map (this should be the hero visual of this section). Show a dark-themed Mapbox map with:
  - A **cyan polyline** tracing the optimized route from start (green marker) to destination (red marker).
  - A **color-graded heatmap overlay** showing sea ice concentration (blue = low, red = high SIC).
  - **Triangle iceberg markers** (white/cyan) scattered in the region with faint dashed circles around them (confidence radius).
  - A **sidebar panel** on the right showing: Voyage ID, Status (✅ Planned), ETA, Fuel, Risk Score.
  - A **7-Day Forecast Slider** at the bottom of the map.

- **Below the Map Mockup:** Three small feature callout cards in a horizontal row:
  1. **Route Layer** — "62 waypoints rendered as a smooth polyline with per-segment risk coloring."
  2. **Ice Heatmap** — "GeoJSON FeatureCollection from `/api/forecast/sea-ice` with opacity driven by `confidence`."
  3. **Iceberg Markers** — "Circle markers from `/api/forecast/icebergs` with radius driven by `confidence_radius_km`."

---

## 🔔 8. Phase 5: Forecast Uncertainty & Safety Alerts

### Layout: Split — Left (Slider Demo) + Right (Alert Card)
- **Phase Badge:** `PHASE 5` pill.
- **Title:** **"Confidence-Aware Forecasting & Alerts"** — `28px`, white, bold.
- **Description:** *"As the forecast horizon extends from Day 1 to Day 7, uncertainty grows. HimDrishti makes this visible — heatmap opacity fades, iceberg confidence circles expand, and automated safety alerts fire when thresholds are breached."*

- **Left Side (55%):** A simulated "Day Slider" visualization mockup:
  - Show two side-by-side mini-maps (or a before/after slider):
    - **Day 1:** Dense, high-opacity ice heatmap. Iceberg markers have tight, small confidence circles. Label: `Confidence: 0.95`
    - **Day 7:** Faded, low-opacity ice heatmap. Iceberg markers have large, expanded dashed confidence circles. Label: `Confidence: 0.62`
  - A slider bar at the bottom labeled `Day 1 ←————→ Day 7`

- **Right Side (45%):** A glass card titled **"Automated Safety Alerts"** showing a mock alert feed:
  ```
  🔴 CRITICAL — Iceberg B-42 predicted within 15km
     of waypoint #28 on Day 3. Reroute advised.

  🟡 WARNING — Sea ice concentration at waypoint #41
     exceeds 75% on Day 5. Monitor closely.

  🟢 INFO — Favorable current (+1.2 kt tailwind)
     detected along segments 12–18.
  ```
  Each alert has a colored left-border (red/yellow/green) and a timestamp.

---

## 🎯 9. Final Call-to-Action

- **Layout:** Centered, full-width banner with a subtle gradient background (`linear-gradient` from navy to dark teal).
- **Headline:** **"Your Fleet Deserves AI-Grade Safety."**
- **Subheadline:** *"Experience the full HimDrishti pipeline — from satellite data to optimized polar routes — in under 60 seconds."*
- **Buttons:**
  - Primary (glowing cyan): **"Launch Command Center →"**
  - Secondary (outlined white): **"View Technical Docs"**

---

## ⚡ 10. Micro-Interactions & Animations

These animations are critical for a premium feel:

1. **Pipeline Spine Glow:** The vertical connecting line should have a subtle CSS animation where the glow pulses every 3 seconds.
2. **Phase Entry:** Each phase section fades in from below (`translateY(40px) → 0`) with a `0.6s ease-out` transition as the user scrolls it into the viewport (Intersection Observer).
3. **Arrow Flow:** The horizontal arrows between Model nodes in Phase 2 should have a repeating CSS animation where a small bright dot travels along the arrow path (simulating data flow).
4. **KPI Counter:** The numbers in Phase 3 (waypoints: 62, risk: 0.161, fuel: 11274) should animate up from 0 using a counting animation on scroll-enter.
5. **Day Slider Hover:** In Phase 5, hovering over the slider should show a tooltip with the exact confidence value for that day.
6. **Card Hover:** All glass cards translate up `4px` and increase their glow intensity on hover.

---

## 📱 11. Responsive Behavior

- **Desktop (≥1280px):** Side-by-side layouts as described above. Pipeline spine on the left.
- **Tablet (768px–1279px):** Cards stack vertically. Phase 2 pipeline diagram becomes vertical instead of horizontal.
- **Mobile (≤767px):** Full single-column layout. Pipeline spine hidden. Phase badges become full-width section headers. JSON blocks become horizontally scrollable.
