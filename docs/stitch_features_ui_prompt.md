# Stitch / UI Generation Prompt: "Everything Your Fleet Needs" Feature Grid

*Based on the provided reference image of the glassmorphic 3x2 feature grid overlaid on an Aurora Borealis and ship background.*

---

## 🎨 1. Global Context & Background (The 3D Scene / Wallpaper)
This UI sits as a floating layer over the 3D WebGL canvas (or a static background image if used as a fallback).
- **Background Visuals:** A stunning night-time polar scene. Deep blue/green icy waters in the foreground, a large icebreaker ship in the center, and a vibrant glowing green/purple Aurora Borealis in the night sky.
- **Lighting:** The background is dark enough that the bright glowing cyan UI elements will pop beautifully.

---

## 📐 2. Layout Structure
- **Section Container:** 
  - Centered layout, max-width of around `1200px`.
  - Padding: `80px` top and bottom.
- **Section Title:**
  - Text: **"Everything Your Fleet Needs"**
  - Style: Clean white, `Inter` or `Montserrat`, font-weight `600`, size `36px` to `48px`.
  - Alignment: Centered above the grid with a `40px` bottom margin.
- **The Grid:**
  - A responsive CSS Grid.
  - Desktop: 3 columns x 2 rows (`grid-template-columns: repeat(3, 1fr)`).
  - Tablet: 2 columns x 3 rows.
  - Mobile: 1 column x 6 rows.
  - Gap: `24px` between cards.

---

## ✨ 3. Card Aesthetics (Premium Glassmorphism)
Each of the 6 feature cards must perfectly replicate the liquid frosted glass effect with glowing borders.

**CSS Properties for the Cards:**
- **Background:** Semi-transparent dark overlay, e.g., `rgba(10, 30, 60, 0.4)` or a very subtle linear gradient.
- **Backdrop Blur:** Heavy frosted glass effect (`backdrop-filter: blur(16px)`).
- **Border:** 2px solid cyan glow. Use `border: 2px solid rgba(0, 229, 255, 0.6)`.
- **Box Shadow (Glow):** Outer cyan glow to make the border pop, e.g., `box-shadow: 0 0 20px rgba(0, 229, 255, 0.2), inset 0 0 15px rgba(0, 229, 255, 0.1);`.
- **Border Radius:** Very rounded corners (`border-radius: 24px`).
- **Dimensions:** Aspect ratio close to square, or roughly `300px` width by `220px` height.
- **Padding:** `32px` internal padding.
- **Hover State:** On hover, slightly increase the `box-shadow` glow and translate up `Y(-4px)` for a floating interactive feel.

---

## 📦 4. Card Content & Items
Each card has a top-aligned, glowing cyan icon and centered text below it.

**Icon Styles:**
- Large (around `48px` to `64px`).
- Bright Cyan color (`#00e5ff`) with a drop shadow glow (`filter: drop-shadow(0 0 8px #00e5ff)`).
- Centered horizontally within the card.
- Margin bottom of `16px`.

**Text Styles:**
- Color: Pure White (`#ffffff`).
- Font: `Inter` or `Lato`, `18px` to `20px`, `font-weight: 500`.
- Alignment: `text-align: center`.
- Line height: `1.4`.

### The 6 Feature Cards:
1. **Kinematic Iceberg Tracking**
   - *Icon:* A radar/crosshair with an iceberg in the center.
2. **7-Day Sea-Ice Heatmaps**
   - *Icon:* A square heatmap grid (blue/red/orange waves).
3. **Automated Safety Alerts**
   - *Icon:* A bell with a glowing exclamation point `!` badge.
4. **A* Optimization**
   - *Icon:* A glowing navigation arrow/compass inside a circle.
5. **ECDIS Export**
   - *Icon:* A wireframe globe with an export arrow pointing right.
6. **Polar Code Coverage**
   - *Icon:* A security shield with a polar bear silhouette inside.
