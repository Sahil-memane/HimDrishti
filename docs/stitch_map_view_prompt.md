# Stitch / UI Generation Prompt: MapView Component

*Based on the HimDrishti design system and Architecture. This is the central spatial visualization layer of the Live Voyage Dashboard.*

---

## 🧭 1. Context & Role

The MapView is the core interactive element of the HimDrishti dashboard, occupying the main content area of the screen. It is a Mapbox GL map that renders the geospatial outputs of the AI pipeline. 

Your task is to build a high-fidelity 2D/2.5D map interface using Mapbox GL. Do not use placeholder images or generic 3D CSS effects for the background; the map must render real, interactive vector layers based on the backend data.

**Data Binding Requirements:**
The component must be designed to fetch and visualize three specific data sources:
1. Sea-Ice Heatmap: Fetched from `/api/forecast/sea-ice?day={day}`
2. Iceberg Markers: Fetched from `/api/forecast/icebergs?day={day}`
3. Route Polyline: Fetched from `/api/voyage/{voyage_id}/route`

---

## 🎨 2. Global Design System

- **Mapbox Style:** Use a standard dark map style (like Mapbox Dark) to fit the maritime intelligence theme.
- **Colors:**
  - Base interface elements should use a deep navy blue background.
  - The "Safe" route color is bright ice blue/cyan.
  - The "High Risk" route color is a vibrant neon red or magenta.
  - The "Moderate Risk" route color is a polar amber or warning orange.
- **Typography:** Use a clean sans-serif like Manrope for titles and JetBrains Mono for coordinates and technical readouts.

---

## 🖼️ 3. Component Layout

### Map Container
Ensure the map container spans the full available width and height of its parent grid area, sitting beneath any top navigation bars and beside sidebars.

### Floating Legend Panel
Position a floating legend panel in the top-left corner of the map. It should be styled as a frosted glass panel (highly blurred background, semi-transparent dark navy fill, with a subtle bright border).
The legend should clearly explain:
- Route Risk Scale (a gradient line from cyan to red).
- Iceberg Confidence (a white dot surrounded by a semi-transparent cyan halo).
- Sea Ice Concentration (a gradient from transparent to solid white/blue).

---

## 📡 4. Mapbox Layer Specifications

You must implement the following Mapbox layers using data-driven styling based on the API payload properties:

### Layer 1: Optimized Route Polyline
- **Data Source:** A GeoJSON LineString constructed from the `waypoints` array provided by the route API.
- **Styling:** Render a thick, highly visible line. Use a Mapbox interpolation expression on the `segment_risk_score` property (which ranges from 0.0 to 1.0) to dynamically color the line. 0.0 should be cyan, 0.5 should be orange, and 1.0 should be red.

### Layer 2: Iceberg Markers
- **Data Source:** A GeoJSON FeatureCollection of Points from the icebergs API.
- **Styling:** Render this as two circle layers:
  1. A central, sharp white dot representing the exact predicted location.
  2. A larger, semi-transparent cyan circle rendered beneath the center dot. Use a Mapbox expression to drive the radius of this circle dynamically using the `confidence_radius_km` property from the GeoJSON.

### Layer 3: Sea-Ice Concentration Heatmap
- **Data Source:** A GeoJSON FeatureCollection of Polygons from the sea-ice API.
- **Styling:** Render a fill or heatmap layer. Use the `ice_concentration` property (0 to 100) to drive the color ramp, transitioning from transparent to a solid icy blue. Crucially, use the `confidence` property (0.0 to 1.0) to drive the overall opacity of the filled area.

---

## ⚡ 5. Interactions & Tooltips

Implement interactive tooltips when the user hovers over the map features. The tooltips should be styled as small frosted glass panels with bright, monospace text.

- **Route Hover:** When hovering over the route polyline, display the segment's sequence number and its exact risk score.
- **Iceberg Hover:** When hovering over an iceberg marker, display the iceberg's ID and its confidence radius in kilometers.

Make sure the cursor changes to a pointer when hovering over these interactive layers to indicate they are clickable or inspectable.
