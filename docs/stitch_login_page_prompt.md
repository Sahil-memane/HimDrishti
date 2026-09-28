# Stitch / UI Generation Prompt: "Authentication Gateway" (Login Page)

*Based on the provided reference image of the dark, tactical, glassmorphic login screen.*

---

## 🌌 1. Global Context & Atmosphere
The login screen should feel like a high-tech terminal aboard a premium polar research vessel.
- **Background Image/Video:** A dark, moody, icy ocean environment with glaciers or mountains in the background. 
- **Depth of Field:** Apply a heavy blur to the background to ensure the central login modal is the absolute focal point.
- **Secondary HUD (Left Side):** Add a heavily blurred, semi-transparent data panel on the left side of the screen (showing mock metrics like "OPERATIONAL", temperature graphs, etc.). This should be pushed into the background to add a "command center" depth without distracting from the login.

---

## 🎛️ 2. The Login Modal (Container Aesthetics)
The central login box uses a dark, tactical premium glassmorphism style.
- **Placement:** Perfectly centered on the screen.
- **Background:** Dark frosted glass (`rgba(10, 25, 40, 0.65)`).
- **Backdrop Blur:** Strong blur effect (`backdrop-filter: blur(24px)`).
- **Border & Glow:** `1px` solid border using a very subtle cyan (`rgba(0, 229, 255, 0.2)`). Add a very soft, wide outer box-shadow glow (`box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 229, 255, 0.05)`).
- **Border Radius:** `16px` for a modern, sleek edge.
- **Padding:** Spacious inner padding (e.g., `40px` all around).

---

## 👑 3. Header Section
- **Logo Area:** Centered. A glowing 3D cyan/white geometric prism (or iceberg) icon.
- **Brand Name:** **"HimDrishti"** (Pure white, `Inter` or `Montserrat` Bold, `28px` to `32px`).
- **Subtitle:** `AUTHENTICATION GATEWAY` (Monospace font, uppercase, light cyan-gray, tracking/letter-spacing of `2px`, size `12px`).
- **Divider:** A subtle horizontal line below the header (`border-bottom: 1px solid rgba(255, 255, 255, 0.1)`).

---

## 🔄 4. Segmented Toggle (Login / Register)
- **Container:** Full width, pill-shaped or rounded rectangle, dark inset background (`rgba(0, 0, 0, 0.3)`).
- **Active State ("Login"):** A rounded pill overlay taking up 50% of the width. Background is a lighter frosted glass (`rgba(255, 255, 255, 0.15)`). Text is pure white.
- **Inactive State ("Register"):** Transparent background. Text is a muted gray/cyan (`rgba(255, 255, 255, 0.5)`).

---

## ⌨️ 5. Form Inputs (Tactical Style)
- **Labels:** `Secure Email` and `Access Key`. 
  - Font: Monospace or tech-styled sans-serif, size `12px`.
  - Color: Muted cyan-gray (`#8ba5b5`).
- **Input Fields:**
  - Background: Dark inset (`rgba(0, 0, 0, 0.4)`).
  - Border: Invisible by default, transitioning to a `1px solid #00e5ff` (Cyan) on focus/active state.
  - Text Color: White.
  - Padding: Left-padded to accommodate icons.
- **Input Icons:** 
  - Left side: A mail icon for email, a lock icon for the password.
  - Right side (Password only): An 'eye' icon to toggle visibility.
- **Placeholders:** e.g., `operative@command.net` and `........` (styled slightly darker than input text).

---

## 🚀 6. Links & Primary Call-to-Action
- **Forgot Password Link:** 
  - Text: `Forgot Access Key?`
  - Alignment: Right-aligned above the login button.
  - Style: Bright Cyan (`#00e5ff`), small text, no underline until hover.
- **Submit Button:**
  - Background Color: Solid, extremely vibrant Cyan (`#00e5ff`).
  - Text: **`INITIATE UPLINK`**
  - Text Style: Dark Navy/Black (`#05101a`), Bold, uppercase.
  - Icon: A right-facing arrow or "login" bracket icon `→]` next to the text.
  - Hover Effect: Intense cyan box-shadow glow to make it feel like a glowing terminal button.

---

## 🟢 7. Status Footer
- **Placement:** Centered at the very bottom of the modal, below the CTA button.
- **Indicator:** A small, animated pulsing cyan dot `●`.
- **Text:** `GATEWAY: STABLE` (Monospace, size `10px`, uppercase, muted cyan-gray).
