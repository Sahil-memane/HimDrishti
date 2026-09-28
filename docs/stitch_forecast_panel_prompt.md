# Stitch / UI Generation Prompt: ForecastPanel Component

*Based on the HimDrishti design system and Architecture. This component acts as a timeline scrubber for predictive map data.*

---

## 🧭 1. Context & Role

The Forecast Panel is a dedicated UI control docked at the bottom of the map view. Its primary purpose is to allow the user to scrub back and forth through a 7-day predictive forecast.

**Behavioral Contract:** 
The panel manages a selected day state (an integer from 1 to 7). When the user changes this day via the slider, the application must fetch updated data for that specific day from the sea-ice and icebergs APIs. As the day increases, the API returns lower confidence scores, which the map visually translates into fading heatmaps and expanding iceberg circles.

---

## 🎨 2. Design System & Aesthetics

- **Theme:** The panel must match the Antarctic Liquid Glass aesthetic. It should look like a premium, floating aerospace console.
- **Background:** Use a frosted glass effect with a heavy backdrop blur, a semi-transparent deep navy background, and a subtle glowing border.
- **Colors:** The slider track should be a muted, semi-transparent line. The slider thumb should be a bright, glowing cyan. Text should be a high-contrast light silver, with muted tones for secondary labels.
- **Typography:** Use a technical sans-serif for the title and a monospace font for the day labels.

---

## 🖼️ 3. DOM Structure & Layout

### Main Container
Create a wide, horizontal container positioned absolutely at the bottom center of the screen, floating slightly above the map canvas. Give it rounded corners, padding on all sides, and a prominent drop shadow.

### Header Row
Inside the container, create a top row with a flexbox layout.
- On the left, place the title "7-Day Forecast Timeline" in a small, bold, uppercase font with wide letter spacing. Use the primary cyan color.
- On the right, place an "Auto-Play" button featuring a play icon and text.

### The Timeline Slider
Below the header, implement the main interactive scrubber using a range input element.
- It should have a minimum value of 1, a maximum of 7, and a step of 1.
- Style the default range input heavily using CSS to hide the default browser appearance.
- The track should look like a thin, sophisticated progress bar.
- The thumb should be a perfectly round circle that emits a cyan glow. When hovered, the thumb should slightly scale up to provide tactile feedback.

### Tick Marks & Labels
Directly below the slider track, create a row of 7 evenly spaced labels corresponding to the 7 days (e.g., "DAY 1", "DAY 2").
Ensure these labels perfectly align with the 7 steps of the slider. 
The label corresponding to the currently selected day should be highlighted (bright cyan, bold text), while the others remain muted.

---

## ⚡ 4. Logic & Micro-Interactions

Instruct the component to handle the following logic:

- **State Management:** Bind the range slider to a state variable. Whenever the slider moves, update the active day label to highlight the correct day and trigger a mock update function that would typically refresh the map layers.
- **Auto-Play Feature:** When the Auto-Play button is clicked, start an interval timer that advances the slider by one day every 2 seconds. When it reaches day 7, it should loop back to day 1. 
- **Play/Pause Toggle:** While playing, change the Auto-Play button's icon to a pause symbol and update its text to "PAUSE". Clicking it again should stop the timer and revert the text and icon.
- **Smooth Transitions:** Add smooth CSS transitions to the slider thumb and the color changes of the day labels so the interface feels fluid and responsive.
