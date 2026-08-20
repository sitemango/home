# SITE MANGO — Premium Interactive Agency Website

A self-contained, production-quality landing page for **Site Mango**, a premium
website design & development agency. Built with vanilla **HTML, CSS and JS** — no
build step, no framework, no heavy WebGL.

## Quick start

Open `index.html` in a browser. That's it.

- **Scroll** — **scroll-snap** forces each section to land fully visible (no
  partial sections from partial scrolls), with full-screen, centered scenes.
  The orbit accelerates as you scroll, the hero parallaxes, and sections reveal
  on entry. No fragile fixed-layer tricks, so navigation always works.
- **Custom cursor** — dot + trailing ring with a morphing contextual label and a
  click "shockwave" that bursts outward on press.
- **Cinematic loader** — a 5-second luxury title sequence (Denis Villeneuve /
  Swiss-editorial feel), strictly B&W: ~1s of pure black → a 1px line cuts the
  darkness while the camera eases in → the line scatters into dozens of geometric
  blueprint fragments → the fragments assemble into **SITE MANGO**, built from
  geometry (never faded in) → the camera passes straight through the wordmark
  into the hero. Spring easing, 60fps GPU transforms, plays on **every** visit,
  respects `prefers-reduced-motion`.
- **Word-by-word heading reveal** — section titles slide and blur in word-by-word.
- **Hero 3D tilt** — the hero follows the cursor with spring-parallax on desktop.
- **Scroll-velocity meter** — a fixed mono "VELOCITY" readout reacts to scroll speed.
- **Grid-reveal light** — a sharp light following the cursor exposes the background
  grid.
- **Command palette** — press `Ctrl/Cmd+K` for a searchable overlay to jump to any
  section, open any project, or run quick actions (back to top, copy email).
- **Project preview tile** — each case study shows a clean click-to-open tile that
  opens the live sample site in a new tab (no heavy iframe or images).
- **Scroll-spy section map** — clickable dots on the right edge track and jump to
  the active section.
- **Keyboard shortcuts** — `1`–`6` jump straight to each section.
- **Light / dark theme toggle** — a nav sun/moon switch inverts the whole
  monochrome palette (whites ↔ blacks), persisted across visits.
- **Random work** — a "Random work" button throws a spin impulse into the orbit,
  aligns a random project, and opens it in a new tab.
- **Typewriter hero** — "WE BUILD ____" cycles through words with a blinking caret.
- **Orbital portfolio** — 5 projects on a 25°-tilted, continuously rotating 3D
  gallery. Scroll to speed it, drag to steer, click to bring a project to the camera
  and open its case study (with highlights and category).
- **Animated counters** — stats count up from 0 to their target when scrolled into view.
- **Background** — film grain, mouse-tracked spotlight, drifting radial light,
  vignette, and a grid revealed only by lighting. Quietly alive, OLED black.
- **Glass UI** — architectural glass panels with reflections, blur and magnetic
  buttons.

## Files

| Path | Purpose |
| --- | --- |
| `index.html` | Markup for all sections |
| `styles.css` | Full design system (colour, type, glass, orbit, responsive) |
| `main.js` | Scroller, cursor, orbit, physics, reveals, form logic |
| `backend/Code.gs` | Google Apps Script backend for the contact form |
| `GOOGLE_SHEETS.md` | Step-by-step Google Sheets wiring guide |

## Contact form → Google Sheets

The form is wired to a Google Apps Script backend so submissions land in a
spreadsheet. Follow **[GOOGLE_SHEETS.md](GOOGLE_SHEETS.md)** to connect it in ~3
minutes. Until then the site runs in demo mode (payload logged to console).

## Design system

- **Palette:** near-monochrome. `#090909` background, `#F5F5F2` text, quiet warm
  white interaction highlights only. No neon, no gradients-for-their-own-sake.
- **Type:** Space Grotesk (geometric sans). Massive editorial hero, tiny supporting
  labels, high contrast.
- **Motion:** everything uses spring easing / inertia — nothing snaps, nothing is
  linear.

## Mobile-first experience
Built for touch, not scaled-down desktop:
- **Fullscreen cinematic menu** — the page content recedes (scale + blur) while links
  reveal sequentially; refined close animation.
- **Touch orbital gallery** — swipe to rotate, flick for momentum, tap to focus, tap
  again to open. The focused project auto-aligns near center and highlights.
- **Tactile feedback** — glass buttons ripple, cards compress on press, service-card
  glass follows your finger while dragging.
- **Fluid responsive type** via `clamp()` at 320–1024px; bottom-sheet case-study panel
  on phones.
- **Performance** — reduced glass blur on touch, simplified background layers, and the
  orbit pauses when scrolled off-screen. Honours `prefers-reduced-motion`.
