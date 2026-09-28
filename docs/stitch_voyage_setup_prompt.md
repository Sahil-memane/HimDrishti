# Stitch / UI Generation Prompt: Voyage Setup Form (Glass Panel + Side Nav)

*Based on the `voyagesetupform2.html` reference design. This is the primary data-entry screen that triggers the entire AI routing pipeline.*

---

## 🧭 Context & Role

This screen is the **mission-critical input gateway** of HimDrishti. The planner arrives here after login. The layout uses a **left sidebar navigation**, a **top app bar**, and a **centered frosted-glass form panel** floating over an animated Antarctic satellite background.

**Backend Contract:** The form submits a `VoyageCreateRequest` payload to `POST /api/voyage`. The form must collect **exactly** these fields — no more, no less:

| # | Field | Type | Required | Backend Validation |
|---|---|---|---|---|
| 1 | `vessel_id` | UUID | ✅ | Must reference an existing vessel |
| 2 | `start_lat` | float | ✅ | `-90 ≤ val ≤ 90` |
| 3 | `start_lon` | float | ✅ | `-180 ≤ val ≤ 180` |
| 4 | `dest_lat` | float | ✅ | `-90 ≤ val ≤ 90` |
| 5 | `dest_lon` | float | ✅ | `-180 ≤ val ≤ 180` |
| 6 | `speed_knots` | float | ✅ | `> 0` (also `≤ vessel.max_speed_knots` — server-side) |
| 7 | `fuel_capacity_l` | float | ❌ Optional | `> 0` if provided |
| 8 | `fuel_consumption_lph` | float | ❌ Optional | `> 0` if provided |
| 9 | `departure_time` | datetime | ✅ | Must be a valid ISO datetime |
| 10 | `risk_tolerance` | string | ❌ Default: `"Medium"` | One of `"Low"`, `"Medium"`, `"High"` |

---

## 🎨 1. Global Design System

### Theme: Deep Maritime Intelligence / Frosted Glass Dark Mode
- **Color Palette (from existing design tokens):**
  - `--background: #071420` (Deep Navy)
  - `--surface: #071420`
  - `--surface-container: #14212d`
  - `--surface-container-high: #1f2b38`
  - `--surface-container-highest: #293643`
  - `--primary: #aee9ff` (Ice Blue — headings, active states)
  - `--primary-fixed-dim: #49d6ff` (Bright Cyan — CTAs, surface tint)
  - `--secondary: #77d1ff`
  - `--on-surface: #d7e4f5` (Light Silver — main text)
  - `--on-surface-variant: #bbc9cf` (Muted labels)
  - `--outline: #869398`
  - `--outline-variant: #3c494e` (Borders)
  - `--error: #ffb4ab` (Danger / validation errors)
- **Typography:**
  - `Manrope` (bold, `600-700`) → Page headings, section titles, display text
  - `Inter` (regular, `400-700`) → Body text, labels
  - `JetBrains Mono` (`500`) → All input values, coordinate fields, technical labels, data readouts

---

## 🖼️ 2. Full Page Layout

The screen has **3 structural layers**:

### Layer 1: Animated Background — Moving Satellite Imagery
- A **full-bleed background image** of Antarctica (satellite view — dark navy ocean, stark white ice shelves, cinematic maritime aesthetic).
- **CRITICAL ANIMATION:** The background image must continuously **pan/drift slowly** to simulate a moving satellite feed. Use CSS animation:
  ```css
  @keyframes bgPan {
    0%   { background-position: 0% 0%; }
    25%  { background-position: 30% 20%; }
    50%  { background-position: 60% 40%; }
    75%  { background-position: 30% 60%; }
    100% { background-position: 0% 0%; }
  }
  ```
  Apply: `animation: bgPan 60s ease-in-out infinite;` on the background div. The image should be scaled larger than viewport (`background-size: 150%` or `200%`) to allow the panning to be smooth and seamless.
- Opacity: `20-30%` so it remains subtle behind the UI.
- On top of the image, overlay a **subtle grid pattern** (thin white lines at 5% opacity, 50×50px grid) for tactical depth.
- The background is purely decorative — `pointer-events: none`.

### Layer 2: Side Navigation Bar (Fixed Left)
### Layer 3: Top App Bar + Centered Glass Form Panel

---

## 📡 3. Side Navigation Bar (Fixed Left)

- **Width:** `64px` collapsed (mobile), `256px` expanded (desktop `md:` breakpoint).
- **Height:** Full viewport height, fixed.
- **Background:** `surface-container` solid with `backdrop-blur-2xl`, `border-right: 1px solid outline-variant`.
- **Z-index:** Highest (`z-50`).

### Brand Section (Top)
- **DO NOT** include a sailing icon or "Antarctic Command" subtitle.
- Show only the text **`HimDrishti Intelligence`** in `Manrope`, bold, `text-primary` (`#aee9ff`). On mobile (collapsed), show only a single letter `H` or a compact icon.

### Navigation Links
Vertical list of navigation items, each with a Material Symbols icon + label:
| Icon | Label | State |
|---|---|---|
| `dashboard` | Dashboard | Inactive |
| `sailing` | Voyage | **Active** (highlighted with `secondary-container` bg) |
| `weather_mix` | Forecast | Inactive |
| `warning` | Alerts | Inactive |
| `analytics` | Route Analysis | Inactive |
| `history` | History | Inactive |

- Active item: `bg-secondary-container`, `text-on-secondary-container`, `font-bold`.
- Inactive items: `text-on-surface-variant`, hover → `text-on-surface` + `bg-surface-container-high`.
- Font: `Inter`, `label-caps` (12px, bold, `letter-spacing: 0.1em`).
- Labels hidden on mobile (`hidden md:block`).

### User Profile (Bottom, desktop only)
- Circular avatar image (40×40px, `border border-outline-variant`, `rounded-full`).
- Username: `SYS_OP_1` in `label-caps`.
- Subtitle: `Active Duty` in muted small text.

---

## 📡 4. Top App Bar (Fixed Top)

- **Height:** `64px`, fixed at top.
- **Position:** Spans from right edge of sidebar to right edge of viewport (`left: 64px` on mobile, `left: 256px` on desktop).
- **Background:** `surface/60` with `backdrop-blur-2xl` and `border-bottom: 1px solid outline-variant`, subtle `shadow-md`.
- **Z-index:** `z-40`.

### Content
- **Left:** Text **`HimDrishti Intelligence`** — `Manrope`, `headline-md` (24px), `font-bold`, `text-primary` (`#aee9ff`).
  - **IMPORTANT:** No sailing icon, no "Antarctic Command" subtitle. Just the text.
- **Right:** Icon buttons row:
  - `sync` icon (refresh)
  - `update` icon (check for updates)
  - `notifications` icon (alerts bell)
  - On mobile: small circular avatar (32×32px)
  - All icons: `text-on-surface-variant`, hover → `text-primary`.

---

## 🎛️ 5. Main Form Panel (Centered Glass Card)

This is the **hero element** of the screen. It is a centered card floating in the main content area (to the right of the sidebar, below the top bar).

### Panel Shell
- **Width:** `max-w-5xl` (≈ 1024px), `w-full`.
- **Background:** Frosted glass — `rgba(8, 28, 44, 0.6)` with `backdrop-filter: blur(20px)`.
- **Border:** `1px solid rgba(174, 233, 255, 0.1)`.
- **Extra:** A faint top-to-bottom gradient overlay: `linear-gradient(180deg, rgba(174, 233, 255, 0.05) 0%, transparent 100%)`.
- **Border radius:** `rounded-xl` (12px).
- **Padding:** `24px` mobile, `32px` desktop.
- **Shadow:** `shadow-2xl` for depth.
- **Decorative:** A thin glowing accent line at the very top edge — `h-[1px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-50`.

### Panel Header
- Title: `"Plan Your Antarctic Voyage"` — `Manrope`, `headline-lg` (32px), `text-on-surface` (`#d7e4f5`).
- Subtitle: `"INITIALIZE INTELLIGENT ROUTING PROTOCOL"` — `JetBrains Mono`, 14px, `text-on-surface-variant`, uppercase.
- Separated from form body by `border-bottom: 1px solid outline-variant` with `padding-bottom: 16px` and `margin-bottom: 32px`.

### Form Body — 2-Column Grid Layout

The form uses a `grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12` layout. Left column groups vessel/coordinate data, right column groups routing/time parameters.

> **CRITICAL:** Every input MUST have high text contrast. Input text color must be `#d7e4f5` (on-surface) or brighter (like `#ffffff`). **Do NOT use dull/muted text colors for input values.** The current design uses `#d7e4f5` which gets lost against the dark input backgrounds — use `color: #ffffff` or `color: #e8f4ff` for all typed input values. Placeholder text should remain muted (`#869398`).

### Global Input Style — `.input-dark`
```css
.input-dark {
    background-color: #040C14;
    border: 1px solid rgba(134, 147, 152, 0.3);
    color: #ffffff;               /* ← HIGH CONTRAST white text for entered values */
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
    padding: 8px 12px;
    border-radius: 4px;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.input-dark::placeholder {
    color: #869398;              /* Muted placeholder — intentionally lower contrast */
}
.input-dark:focus {
    border-color: #aee9ff;
    outline: none;
    box-shadow: 0 0 0 1px #aee9ff, 0 0 12px rgba(174, 233, 255, 0.15);
}
.input-dark.error {
    border-color: #ffb4ab;
    box-shadow: 0 0 0 1px #ffb4ab;
}
```

---

### Left Column — Vessel & Origin Data

#### Field 1: Vessel Selection — `vessel_id`
- Section header: `VESSEL TELEMETRY` — `Inter`, `label-caps`, `text-primary`, uppercase, `tracking-widest`.
- Label: `ASSIGNED VESSEL` — `JetBrains Mono`, 12px, uppercase, `text-on-surface-variant`.
- Input: **`<select>` dropdown** with `id="vessel_id"`, `name="vessel_id"`, class `input-dark w-full`.
- Options populated from user's vessels. Each `<option value="{uuid}">` displays `"{vessel_name} — {imo_number}"`.
- Default option: `"— Select Vessel —"` with `value=""`, `disabled`, `selected`.
- **Validation:** Required. Error: `"Please select a vessel"`.
- Full-width, spans the left column.

#### Fields 2-3: Origin Coordinates — `start_lat`, `start_lon` (2-column sub-grid)
| Label | Input ID | Type | Placeholder | Pre-fill | Validation |
|---|---|---|---|---|---|
| `ORIGIN LAT` | `start_lat` | `number` (`step="any"`) | `-90.0 to 90.0` | `-65.4321` | Required, `-90 ≤ val ≤ 90` |
| `ORIGIN LON` | `start_lon` | `number` (`step="any"`) | `-180.0 to 180.0` | `-62.9876` | Required, `-180 ≤ val ≤ 180` |

- `grid grid-cols-2 gap-4`.
- Each input: class `input-dark w-full`, `text-primary` for pre-filled values to indicate they are coordinate data.
  - **BUT entered text must still be high-contrast white** — use `color: #ffffff` not a muted tone.

#### Fields 6-7: Speed & Fuel Consumption — `speed_knots`, `fuel_consumption_lph` (2-column sub-grid)
| Label | Input ID | Type | Placeholder | Pre-fill | Validation |
|---|---|---|---|---|---|
| `SPEED (KTS)` | `speed_knots` | `number` (`step="0.1"`) | `0.1 - 30.0` | `18.5` | **Required**, `> 0`, `≤ 30` |
| `FUEL RATE (LPH)` | `fuel_consumption_lph` | `number` (`step="0.1"`) | `Liters per hour` | `1250` | **Optional**, `> 0` if provided |

- `grid grid-cols-2 gap-4`.
- Add unit suffixes inside the input container (positioned absolute right): `KTS` and `LPH` in muted mono text.
- Error messages:
  - `speed_knots` empty → `"Speed is required"`
  - `speed_knots` ≤ 0 or > 30 → `"Speed must be between 0.1 and 30 knots"`
  - `fuel_consumption_lph` ≤ 0 (when filled) → `"Fuel rate must be greater than 0"`

---

### Right Column — Routing Parameters

#### Fields 4-5: Destination Coordinates — `dest_lat`, `dest_lon` (2-column sub-grid)
- Section header: `ROUTING PARAMETERS` — `Inter`, `label-caps`, `text-primary`, uppercase, `tracking-widest`.

| Label | Input ID | Type | Placeholder | Pre-fill | Validation |
|---|---|---|---|---|---|
| `DEST LAT` | `dest_lat` | `number` (`step="any"`) | `-90.0 to 90.0` | (empty) | Required, `-90 ≤ val ≤ 90` |
| `DEST LON` | `dest_lon` | `number` (`step="any"`) | `-180.0 to 180.0` | (empty) | Required, `-180 ≤ val ≤ 180` |

- `grid grid-cols-2 gap-4`.
- Pre-fill with placeholder values only (not actual values) so the user must enter destination.

#### Field 8: Fuel Capacity — `fuel_capacity_l` (full width)
| Label | Input ID | Type | Placeholder | Pre-fill | Validation |
|---|---|---|---|---|---|
| `FUEL CAPACITY (L)` | `fuel_capacity_l` | `number` (`step="1"`) | `Total fuel in liters` | `50000` | **Optional**, `> 0` if provided |

- Full width within the right column.
- Helper text below in muted 10px mono: `"Optional — overrides vessel default"`.
- Error: `"Fuel capacity must be greater than 0"`

#### Field 9: Departure Time — `departure_time` (full width)
| Label | Input ID | Type | Validation |
|---|---|---|---|
| `DEPARTURE TIME (UTC)` | `departure_time` | `datetime-local` | **Required**, `≥ now()` |

- Full width within the right column.
- Auto-fill with current time + 1 hour via JS on page load.
- Error messages:
  - Empty → `"Departure time is required"`
  - Past time → `"Departure must be in the future"`

#### Field 10: Risk Tolerance — `risk_tolerance` (3-card radio selector)
- Label: `RISK PREFERENCE PROFILE` — `JetBrains Mono`, 12px, uppercase, `text-on-surface-variant`, with `mt-4 mb-3`.
- A hidden input: `<input type="hidden" id="risk_tolerance" name="risk_tolerance" value="Medium">`.
- Display: `grid grid-cols-3 gap-2` — three selectable cards:

| Card | Radio Value | Icon | Label | Color Accent |
|---|---|---|---|---|
| 1 | `Low` | `shield` | `SAFEST` | `text-primary` (cyan) |
| 2 | `Medium` | `balance` | `BALANCED` | `text-secondary` (blue) |
| 3 | `High` | `local_gas_station` | `EFFICIENT` | `text-tertiary` (warm) |

- Each card: `bg-surface-container-high`, `border border-outline-variant`, `rounded`, `p-3`, centered content.
- Selected state: `border-primary`, `bg-primary/10`, `box-shadow: 0px 0px 12px 0px rgba(174, 233, 255, 0.4)` (glow effect).
- Implementation: Hidden `<input type="radio" name="risk_profile">` inside each `<label>`, using `peer` + `peer-checked:` Tailwind classes.
- **Clicking a card updates the hidden `risk_tolerance` input** to the matching value (`"Low"`, `"Medium"`, `"High"`).
- **Default:** First card (`Low` / Safest) is checked.
- **Validation:** Auto-set, no user error possible.

---

### Form Footer — Submit Action (spans full 2-column width)

- `col-span-1 lg:col-span-2`, separated by `border-top: 1px solid outline-variant` with `pt-6 mt-4`.
- Aligned: `flex justify-end`.
- Button: `id="submit_btn"`.
  - Text: `"Generate Intelligent Route"` — `Inter`, `label-caps`, uppercase.
  - Icon: `route` Material Symbol to the left.
  - Background: `primary` (`#aee9ff`), text: `on-primary` (`#003543`).
  - Hover: `bg-primary/90` + `box-shadow: 0px 0px 12px 0px rgba(174, 233, 255, 0.4)`.
  - Padding: `px-6 py-3`, `rounded`.

---

## ✅ 6. Client-Side Validation Rules (Mirror Backend `VoyageCreateRequest`)

These rules must be enforced visually before submission. They mirror the Pydantic `Field(...)` constraints in `schemas.py`:

| Field | Rule | Error Message |
|---|---|---|
| `vessel_id` | Must be selected (non-empty) | `"Please select a vessel"` |
| `start_lat` | Required, `-90 ≤ val ≤ 90` | `"Latitude must be between -90 and 90"` |
| `start_lon` | Required, `-180 ≤ val ≤ 180` | `"Longitude must be between -180 and 180"` |
| `dest_lat` | Required, `-90 ≤ val ≤ 90` | `"Latitude must be between -90 and 90"` |
| `dest_lon` | Required, `-180 ≤ val ≤ 180` | `"Longitude must be between -180 and 180"` |
| `speed_knots` | Required, `> 0`, `≤ 30` (client cap) | `"Speed must be between 0.1 and 30 knots"` |
| `fuel_consumption_lph` | Optional; if provided, `> 0` | `"Fuel rate must be greater than 0"` |
| `fuel_capacity_l` | Optional; if provided, `> 0` | `"Fuel capacity must be greater than 0"` |
| `departure_time` | Required, `≥ now()` | `"Departure must be in the future"` |
| `risk_tolerance` | One of: `Low`, `Medium`, `High` | Auto-set by radio cards, no user error |

### Validation Behavior

#### On Blur (Per Input)
- Validate the individual field when the user tabs away or clicks out.
- **If invalid:** 
  - Add `.error` class to the input (red border via `border-color: #ffb4ab`).
  - Show an inline error message **directly below the input** in `JetBrains Mono`, `10px`, `color: #ffb4ab`.
  - Apply a brief `animation: shake 0.3s ease` horizontal shake on the input.
- **If valid:** 
  - Remove `.error` class, restore normal border.
  - Remove any error message below.

#### On Submit
- Validate **all 10 fields** simultaneously.
- If **any** fail: highlight all offending fields with `.error` class + show all error messages. Scroll the first error into view. Do NOT submit the form.
- If **all** pass:
  - Replace button text with `"COMPUTING ROUTE..."` + animated spinning `sync` icon (`animation: spin 1s linear infinite`).
  - Disable the button (`pointer-events: none`, `opacity: 0.7`) to prevent double-submit.
  - Construct and POST the payload.

### Payload Construction (JavaScript)
```javascript
const payload = {
  vessel_id: document.getElementById('vessel_id').value,
  start_lat: parseFloat(document.getElementById('start_lat').value),
  start_lon: parseFloat(document.getElementById('start_lon').value),
  dest_lat:  parseFloat(document.getElementById('dest_lat').value),
  dest_lon:  parseFloat(document.getElementById('dest_lon').value),
  speed_knots: parseFloat(document.getElementById('speed_knots').value),
  fuel_capacity_l: document.getElementById('fuel_capacity_l').value
    ? parseFloat(document.getElementById('fuel_capacity_l').value) : null,
  fuel_consumption_lph: document.getElementById('fuel_consumption_lph').value
    ? parseFloat(document.getElementById('fuel_consumption_lph').value) : null,
  departure_time: new Date(document.getElementById('departure_time').value).toISOString(),
  risk_tolerance: document.getElementById('risk_tolerance').value
};
```

---

## ⚡ 7. Micro-Interactions & Animations

1. **Background Pan:** The Antarctic satellite image continuously drifts with `animation: bgPan 60s ease-in-out infinite` — slow, cinematic, and immersive. The image is scaled to `200%` so there is room to pan without showing edges.
2. **Glass Panel Fade-In:** On page load, the main form panel fades in with `animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)` — translates from `+20px` to `0` + opacity `0 → 1`.
3. **Input Focus Glow:** `transition: border-color 0.2s ease, box-shadow 0.2s ease`. On focus, border changes to `#aee9ff` with a subtle `box-shadow: 0 0 0 1px #aee9ff, 0 0 12px rgba(174,233,255,0.15)`.
4. **Risk Card Selection:** When a risk card is selected, it glows with `box-shadow: 0px 0px 12px 0px rgba(174, 233, 255, 0.4)` and its border transitions to `primary` with `transition-all 0.2s ease`.
5. **Submit Button Glow:** On hover, the button emits `box-shadow: 0px 0px 12px 0px rgba(174, 233, 255, 0.4)`.
6. **Validation Shake:** On blur with invalid value: `animation: shake 0.3s ease` — a quick left-right jitter (±4px).
7. **Error Message Fade-In:** Error text appears with `animation: fadeIn 0.2s ease`.
8. **Submit Loading:** On click (valid form), button text changes, icon spins, button is disabled — `transition: opacity 0.3s ease`.

### Required Keyframes
```css
@keyframes bgPan {
  0%   { background-position: 0% 0%; }
  25%  { background-position: 30% 20%; }
  50%  { background-position: 60% 40%; }
  75%  { background-position: 30% 60%; }
  100% { background-position: 0% 0%; }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25%      { transform: translateX(-4px); }
  50%      { transform: translateX(4px); }
  75%      { transform: translateX(-4px); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
```

---

## 📋 8. Accessibility & Input Contrast Checklist

- **ALL input text must use `color: #ffffff` or `#e8f4ff`** — never a dull/muted tone. The current design has input text that blends into the dark background; this MUST be fixed.
- Labels use `text-on-surface-variant` (`#bbc9cf`) — acceptable contrast for labels.
- Placeholder text uses `#869398` — intentionally subdued.
- Error messages use `#ffb4ab` (error red) — high visibility against dark backgrounds.
- Focus rings use `#aee9ff` (primary) — clearly visible.
- All inputs must have associated `<label>` elements or `aria-label` attributes.
- All interactive elements must have `cursor: pointer` where appropriate.
