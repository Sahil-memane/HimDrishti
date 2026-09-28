# HimDrishti — Master UI & 3D Interactive Design Specification

*This master document combines all visual, technical, architectural, and component-level requirements for the HimDrishti Frontend platform across both the 3D Marketing Landing Page and the Live Operations Intelligence Dashboard.*

---

## 🎨 1. Global Design System & Aesthetics

### **Vibe & Theme: Antarctic Liquid Glass & 3D Dynamic Environment**
The platform must embody an ultra-premium, next-generation Maritime Command Center tailored specifically for polar and arctic navigation. It must look and feel like an elite aerospace / maritime intelligence tool (comparable to modern Bloomberg terminals, Apple Pro interfaces, and defense telemetry HUDs).

- **Color Palette (Antarctic Polar Spectrum):**
  - **Backgrounds:** Deep abyssal ocean navy (`#030b17`), midnight oceanic slate (`#07162c`), and pure obsidian (`#01050a`).
  - **Glass Overlays:** Glacial frosted translucent whites (`rgba(255, 255, 255, 0.05)` to `rgba(255, 255, 255, 0.12)`) with icy border accents (`rgba(147, 197, 253, 0.25)`).
  - **Primary Accents:** Bioluminescent cyan (`#06b6d4`), polar electric blue (`#38bdf8`), and glacial white (`#f8fafc`).
  - **Risk & Alert Status Colors:**
    - *Optimal / Safe:* Neon aurora green (`#10b981`)
    - *Moderate Caution:* Polar amber (`#f59e0b`)
    - *Critical Hazard / Danger:* Hazard magenta / neon crimson (`#f43f5e`)
- **UI Architecture & Patterns:**
  - **Liquid Glassmorphism:** Heavy use of layered frosted glass panels with `backdrop-blur-xl` and `backdrop-blur-2xl`, subtle specular highlights along edges, and frosted ice textures.
  - **3D Physics & Dynamic Elements:** 3D interactive objects (stylized low-poly/photorealistic icebergs, floating container/research ships, rotating 3D topographical globes, 3D depth-tilted cards).
  - **Dynamic Micro-Interactions:** Fluid animations where elements glide like water over ice; numbers roll and tick up smoothly; hover states trigger subtle luminous glows and isometric perspective tilts.
  - **Data Density & Technical Depth:** High data density without visual clutter. Clean typography (e.g., *Inter*, *JetBrains Mono* for coordinates/telemetry, *Outfit* for hero headlines).

**Target Tech Stack:** React, TypeScript, TailwindCSS, Mapbox GL JS (3D terrain & bathymetry enabled), React Three Fiber / Three.js (for 3D canvas), Framer Motion / GSAP (for scroll-scrubbing & fluid transitions), Recharts (for deep statistical telemetry), Zustand (global state management).

---

## 🌐 2. Global Layout & Utility System

### **Brand Identity:**
- **Platform Name:** **HimDrishti** (displayed prominently in modern typography with a geometric, glowing 3D iceberg/prism glyph).

### **Persistent Frosted Glass Navigation Bar (Header):**
- **Left:** Brand logo and live system badge (`v1.0-Polaris`).
- **Center:** Navigation links (`Dashboard`, `Voyage History`, `Predictive Fleet`, `Safety Alerts`, `Docs`).
- **Right Utility Tools:**
  - **Theme Switcher:** Animated toggle between **"Polar Night"** (Deep Dark Mode) and **"Midnight Sun"** (High-contrast Arctic Light Mode).
  - **Multilingual / Internationalization Dropdown (Globe Icon):** Instant locale switching (English, Hindi, French, Russian, Norwegian, Japanese) for international maritime crews.
  - **User Profile HUD:** Avatar with glowing role badge (`Maritime Planner` or `Ship Master`), session status, and logout action.

### **Persistent Global Footer:**
- **Telemetry Bar:** Displays live microservice connectivity indicators (`API Gateway: ONLINE`, `Model 1 Sea Ice: SYNCED`, `Model 2 Iceberg Drift: ACTIVE`, `Model 3 A* Routing: READY`).
- **Status Indicator:** Pulsing radar beacon icon indicating real-time satellite telemetry ingestion.

---

## 🚀 3. Page 1: 3D Scrollable Marketing Landing Page

*A captivating, narrative-driven 3D scrollable experience that tells the story of conquering polar routes with AI.*

### **Section 1: The Hero Canvas (100vh)**
- **3D Centerpiece:** A realistic, floating 3D iceberg in dark, volumetric arctic waters. As the user moves the cursor, the camera shifts perspective with smooth parallax lighting.
- **Typography:**
  - Massive glowing title: **"Navigate the Unnavigable."**
  - Subtitle: *"Next-generation AI maritime routing. Avoid dynamic hazards, optimize fuel efficiency, and conquer polar extremes with predictive 7-day intelligence."*
- **Call to Actions:**
  - Primary: Glowing liquid-glass button **"Access Command Center"** (directs to Login).
  - Secondary: **"Explore the Architecture ↓"** (smooth scroll trigger).
- **Scroll Prompt:** Pulsing frozen chevron encased in a translucent glass orb.

### **Section 2: Scroll-Driven Feature Showcase (Parallax)**
- **3D Animation:** As the user scrolls, the iceberg camera zooms out seamlessly to reveal a high-definition 3D topographical globe centered on **Baffin Bay**, rotating on its axis.
- **Floating Glass Cards (`backdrop-blur-2xl`):**
  1. **AI Route Optimization Engine:** *"A* graph-search algorithm evaluating multi-layer cost matrices across sea-ice, icebergs, weather, and fuel burn."* (With glowing 3D vector path graphic).
  2. **7-Day Predictive Iceberg Tracking:** *"Machine learning trajectory models simulating drift dynamics with compounding uncertainty radii."* (With 3D radar cone visual).
  3. **Sea-Ice Satellite Synthesis:** *"Live multi-spectral satellite radar transformed into sub-kilometer concentration heatmaps."*

### **Section 3: "Under the Ice" (Deep-Tech Architecture)**
- **Holographic Transformation:** The 3D globe transitions into a futuristic wireframe/holographic data-grid mode.
- **Interactive Microservice Pipeline:**
  - **Step 1: Environmental Forecasting (Model 1)** — Synthetic aperture radar sea-ice grids.
  - **Step 2: Hazard Kinematics (Model 2)** — Ocean current & wind vector drift simulation.
  - **Step 3: A* Pathfinding Matrix (Model 3)** — 6-factor cost-optimized routing.
- **Visuals:** Floating glowing particles and data streams demonstrating the orchestration handled by the FastAPI Gateway.

### **Section 4: Aurora Borealis CTA & Footer**
- **Visuals:** 3D camera tilts skyward toward a shimmering, dynamic Aurora Borealis (Northern Lights) particle field.
- **CTA Banner:** Massive frosted glass panel: *"Ready to deploy predictive routing to your fleet?"* → Button: **"Launch Dashboard"**.

---

## 🔐 4. Component 1: Authentication (`LoginRegister`)

- **Visuals:** Full-bleed background with slow-motion 3D polar ocean waves. Central floating glassmorphic pane (`backdrop-blur-xl`, subtle cyan gradient border).
- **Elements & Strict Field Validations:**
  - **Login Mode:**
    - `email`: Standard RFC email format (Required).
    - `password`: String (Required).
  - **Registration Mode:**
    - `full_name`: String, minimum 2 characters (Required).
    - `email`: Valid email syntax.
    - `password`: Minimum 8 characters, at least 1 number & 1 special character.
    - `role`: Dropdown selector strictly bounded to `planner` or `mariner`.
  - **CTA Button:** Gradient button with 3D click depress and active shimmer loading state.

---

## ⚙️ 5. Component 2: Voyage Setup Form (`VoyageSetupForm`)

*Designed as a slide-out HUD drawer or floating command console over the 3D map.*

- **Title:** "Initialize Polar Voyage Parameters"
- **Strict Validations (Backend Pipeline Compatibility):**
  - **Start Coordinates:**
    - `start_lat`: Float ∈ `[60.0, 80.0]` (Baffin Bay Bounding Box).
    - `start_lon`: Float ∈ `[-80.0, -50.0]`.
    - *UX Bonus:* Interactive "Click on Map" target crosshair picker.
  - **Destination Coordinates:**
    - `dest_lat`: Float ∈ `[60.0, 80.0]`.
    - `dest_lon`: Float ∈ `[-80.0, -50.0]`.
    - *UX Bonus:* Interactive "Click on Map" target crosshair picker.
  - **Vessel Performance:**
    - `speed_knots`: Float > 0 and ≤ 40.0 knots.
    - `fuel_consumption_lph`: Float > 0 (Litres per hour).
  - **Schedule:**
    - `departure_time`: ISO-8601 DateTime, strictly `≥ current_time()` (no past departures).
- **The Trade-Off Engine (Risk Tolerance):**
  - **Dynamic 3D Control Knob / Equalizer Selector:** Three discrete operational modes:
    - `"Low"` (Safest — Maximum hazard standoff distances, avoids any ice > 15%).
    - `"Medium"` (Balanced — Optimal safety-to-fuel equilibrium).
    - `"High"` (Max Fuel-Efficient — Minimum distance path, permits controlled ice navigation).
  - **Real-time Live Previews:** Shows anticipated fuel variance % and hazard standoff margins as the knob is turned.
- **Submit Trigger:** Glowing CTA button **"Compute A* Route"** with disabled state if any validation fails, accompanied by inline glowing red error tooltips and a circular radar loading state during pipeline execution.

---

## 🗺️ 6. Component 3: Live Operations Intelligence Dashboard

*The core mission control view combining high-precision spatial visualization with deep statistical telemetry.*

### **A. 3D Mapbox GL Canvas (`MapView`)**
- **Basemap:** Custom dark polar maritime map with 3D bathymetry (depth contours) and 3D terrain elevation.
- **Glowing Neon Route Polyline:**
  - Gradient tube color-coded per segment risk (Neon Green `[0.0 - 0.25]`, Yellow `[0.25 - 0.50]`, Orange `[0.50 - 0.75]`, Neon Red `[> 0.75]`).
- **Explainability Hover Tooltips (On Waypoints / Segments):**
  - Displays a glassmorphic HUD card containing:
    - Leg Sequence & Projected Timestamp.
    - **Mini Radar Chart:** Visual breakdown of `risk_factors` (Sea Ice Risk, Iceberg Proximity Risk, Wave/Weather Risk).
    - **AI Reasoning Narrative:** Real-time explainability text (e.g., *"Path diverted 14 NM south-east to maintain a 25km safety perimeter around fast-drifting Iceberg B-15A while keeping sea-ice concentration below 12%."*).
- **Dynamic Hazard Layers:**
  - **Iceberg Markers:** Glowing 3D iceberg icons with translucent, pulsing "confidence fields" (uncertainty radius circles in km).
  - **Sea-Ice Heatmap:** High-resolution GeoJSON raster/polygon overlay depicting Sea Ice Concentration (SIC %) from 0% to 100%.

### **B. Route & Statistical Details Panel (`RouteDetail`)**
*Right-hand dense glassmorphic sidebar for analytical decision-making.*
- **Hero Key Performance Indicators (KPI Cards):**
  - **Overall Route Risk Score:** Semi-circular glowing gauge meter (e.g., `0.16 — OPTIMAL`).
  - **Estimated Time of Arrival (ETA):** High-precision UTC clock display with duration counter (e.g., `84h 12m`).
  - **Total Projected Fuel Burn:** Digital fuel gauge (e.g., `11,274.1 L`).
- **Statistical Analytics (Recharts Visualizations):**
  - **Stacked Area Chart:** Cumulative Fuel Consumption (L) vs. Encountered Hazard Risk over the 7-day transit timeline.
  - **Comparative Bar Chart:** HimDrishti AI Route vs. Naive Great-Circle / Straight-Line Route (showing % risk reduction & fuel savings).
- **Waypoint Ledger Table:**
  - Compact, scrollable data grid with mini sparklines.
  - Columns: `#`, `Coordinates (Lat, Lon)`, `ETA (UTC)`, `Cum. Fuel (L)`, `Segment Risk`, `Dominant Hazard`.

### **C. Live Diagnostics & Alerts Drawer (`AlertsPanel`)**
*Left-hand sliding drawer for real-time safety interventions.*
- **Streaming Safety Alerts:** Live cards populated from backend notifications (e.g., `CRITICAL: Iceberg Drift Vector Shift within 15km of Waypoint #14`).
- **Visual Design:** 3D card entry animation with pulsing red/yellow ambient glow.
- **Interaction:** Actionable **"Acknowledge & Log"** button wired directly to `PATCH /api/alerts/{alert_id}/acknowledge`.

### **D. The 7-Day Uncertainty Timeline Console (`ForecastPanel`)**
*Floating timeline console anchored at the bottom center of the map.*
- **Interactive Scrubber:** Day 1 through Day 7 slider bar with glowing thumb control and time-step playback buttons (`Play`, `Pause`, `Speed: 1x/2x/5x`).
- **Uncertainty Visualization (F5 Spec):**
  - Scrubbing the slider dynamically adjusts the temporal state of the map.
  - **Confidence Decay Effect:** As the user moves from Day 1 to Day 7, Sea-Ice heatmap opacity gently attenuates according to the model's cell `confidence` score.
  - **Compounding Uncertainty Radii:** Iceberg confidence circles visibly expand in radius across the timeline to visually demonstrate kinematic drift uncertainty compounding over time.

---

## 📊 7. Complete Validation & Endpoint Mapping Reference

| Component | Field / Action | Type / Constraints | Backend Target / Endpoint |
|---|---|---|---|
| **Auth** | Login | `email`, `password` (valid format) | `POST /api/auth/login` |
| **Auth** | Register | `full_name`, `email`, `password`, `role ∈ {planner, mariner}` | `POST /api/auth/register` |
| **Voyage Setup** | Start Point | `lat ∈ [60.0, 80.0]`, `lon ∈ [-80.0, -50.0]` | `POST /api/voyage` (lat_s, lon_s) |
| **Voyage Setup** | Dest Point | `lat ∈ [60.0, 80.0]`, `lon ∈ [-80.0, -50.0]` | `POST /api/voyage` (lat_d, lon_d) |
| **Voyage Setup** | Speed & Fuel | `speed > 0 & <= 40`, `fuel_consumption > 0` | `POST /api/voyage` |
| **Voyage Setup** | Departure Time | ISO-8601 String, `departure_time >= now()` | `POST /api/voyage` |
| **Voyage Setup** | Risk Tolerance | String enum: `"Low" \| "Medium" \| "High"` | `POST /api/voyage` |
| **Dashboard** | Fetch Route | Polls until `status == 'planned'` | `GET /api/voyage/{id}/route` |
| **Dashboard** | Sea Ice Layer | Bounding box GeoJSON with `confidence` | `GET /api/forecast/sea-ice?day={d}` |
| **Dashboard** | Iceberg Layer | Bounding box GeoJSON with `confidence_radius_km` | `GET /api/forecast/icebergs?day={d}` |
| **Dashboard** | Alerts Feed | Active voyage safety alerts | `GET /api/alerts/{voyage_id}` |
| **Dashboard** | Acknowledge Alert | Action button | `PATCH /api/alerts/{alert_id}/acknowledge` |

---

*This master document represents the complete, unified architectural blueprint for both the public-facing 3D landing experience and the operational tactical dashboard for HimDrishti.*
