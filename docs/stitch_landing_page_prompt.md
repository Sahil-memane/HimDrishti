# Stitch / UI Generation Prompt: Polar Logistics 3D Scroll-Driven Landing Page

*Based on visual reference designs in `docs/UI themes/` and implementing a unique, modern 3D scroll-driven narrative.*

---

## 🛠️ Technology Stack & Implementation Strategy
To achieve the high-end 3D scroll-driven experience, the landing page MUST be built using the following stack:
- **3D Rendering:** `three.js`, `@react-three/fiber` (R3F), and `@react-three/drei`.
- **Scroll Animations & Camera Control:** `gsap` (with `ScrollTrigger`) or `@react-three/drei`'s `ScrollControls` to map scroll progress to 3D scene animations.
- **Smooth Scrolling:** `@studio-freight/lenis` (highly recommended for seamless scroll-hijacking) or built-in R3F scroll controls.
- **Structure:** A fixed full-screen `<Canvas>` in the background for the 3D Antarctica scene and the Ship. HTML layers are rendered overlaying the canvas (using `@react-three/drei`'s `<Scroll html>` or absolute positioned DOM elements) for the UI text and frosted glass cards.
- **Pathing:** Create an invisible 3D curve (`THREE.CatmullRomCurve3`) in the scene. As the user scrolls (progress 0 to 1), the ship's position and rotation, as well as the camera's position/lookAt, interpolate along this curve to demonstrate navigating the optimal path through the ice.

---

## 🎨 Global Design System & Aesthetic Foundation

### **Theme: High-End Maritime Logistics & Arctic Polar Intelligence**
The landing page merges the **clean, structured layout of a modern enterprise logistics platform** with the **atmospheric, glacial 3D aesthetics of polar navigation**.

- **Color Palette:**
  - **Primary Oceanic Blue:** Deep Royal Marine (`#0a226b` / `#081c4e`)
  - **Polar Accents:** Bioluminescent Cyan (`#00e5ff` / `#06b6d4`), Arctic Sky Blue (`#38bdf8`)
  - **Backgrounds:** Clean Glacial White for light mode; Deep Abyssal Navy (`#030b17` / `#07162c`) for dark mode.
  - **UI Overlays:** Liquid frosted glass (`backdrop-blur-xl`, semi-transparent) to ensure the 3D background remains vibrantly visible behind the UI.
- **Typography:**
  - **Display / Headings:** **Montserrat** (Bold, 700/800, tight tracking)
  - **Body & Metrics:** **Lato** / **Inter** (Clean, legible, 400/500/600)

---

## 🏔️ The 3D Scroll-Driven Scene (Background Canvas)
- **Environment:** A full 3D model of an Antarctica-like glacial environment, featuring deep arctic waters, floating low-poly icebergs, and glowing polar lighting.
- **The Actor (The Ship):** A highly detailed 3D container vessel or cruise ship model.
- **The Animation:** The ship is placed on an optimal path (a spline) navigating *around* the ice fields. As the user scrolls down the webpage, the ship physically moves along this path in the 3D scene, and the camera follows it dynamically (panning, zooming, and rotating to show different angles of the ship and the hazards it is avoiding).

---

## 🌐 1. Header & Navigation Bar (Frosted Glass Floating Navbar)
*(Remains fixed at the top of the screen)*
- **Left:** Logo **"HimDrishti"** with a 3D geometric iceberg/polar prism icon.
- **Center Links:** `Home`, `AI Routing Engine`, `7-Day Forecast`, `Fleet Telemetry`, `Safety Alerts`, `Docs`.
- **Right Controls:** Theme Toggle, Multilingual Switcher, Primary CTA Button **`Launch Command Center`**.

---

## 🚢 2. Hero Section: "Safer Polar Routes, Smarter Navigation"
*(Overlayed on the starting point of the 3D scene. Camera is close behind the ship.)*
- **Main Headline:** **Safer Polar Routes, Smarter Navigation.**
- **Subheadline:** *"HimDrishti is the world's most advanced polar route optimization platform—combining real-time satellite radar sea-ice grids, 7-day predictive iceberg drift kinematics, and A* multi-factor safety graphs."*
- **Action:** Prompts the user to "Scroll to begin the voyage", triggering the 3D ship movement.

---

## 🔄 3. "How It Works" 3-Step Process (Scroll Checkpoint 1)
*(As the user scrolls, the ship navigates into a dense ice field. The camera pans to a top-down tactical view showing the path avoiding obstacles).*
- **Step 1:** Input Voyage & Vessel Parameters.
- **Step 2:** Multi-Model Hazard Synthesis (Highlighting the 3D icebergs in the scene).
- **Step 3:** Collision-Free A* Route (Showing the ship smoothly turning to avoid the hazard on its optimal path).

---

## ⚡ 4. "Everything Your Fleet Needs" (Scroll Checkpoint 2)
*(Ship enters open waters but with dynamic weather/lighting changes, like the aurora borealis, in the 3D scene).*
- 6-Grid Feature Suite presented as floating glass cards.
- Features: Kinematic Iceberg Tracking, 7-Day Sea-Ice Heatmaps, Automated Safety Alerts, A* Optimization, ECDIS Export, Polar Code Coverage.

---

## 📊 5. "About Us & Operational Impact" (Scroll Checkpoint 3)
*(Camera zooms in closely on the ship's bow as it cuts through light ice).*
- High-level KPIs overlayed: `50,000+` NM Optimized, `99.4%` Hazard Avoidance, `18.2%` Fuel Reduction.

---

## 🎯 6. Final Call-to-Action Banner & Footer
*(Ship completes its journey, sailing off into the horizon as the UI fades in).*
- **CTA:** **"Ready To Navigate Polar Extremes with Confidence?"**
- Action Buttons: `Deploy Fleet Dashboard`, `Request Simulator Access`.
