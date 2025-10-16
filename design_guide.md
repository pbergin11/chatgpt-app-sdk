# Golf.ai — Design Language, UX System, and Component Guide

## 0) Why this system exists

Golf has rhythm. Good UX should, too. This system prioritizes **clarity, calm, and flow** so people can play or watch with less friction. Decisions appear one at a time. Motion is subtle. Visuals feel tactile, not sterile.

---

## 1) Brand & Product Principles

1. **One decision at a time**
   Every surface supports a single, obvious action. Decompose complex choices into linear steps.

2. **Calm surfaces**
   Generous spacing, large tap targets, short labels. Avoid decorative clutter. Texture is used sparingly and intentionally.

3. **Human tactility**
   Screen-print grain, imperfect geometry, and hand-drawn icon accents anchor a human feel.

4. **Earned color**
   Color signals meaning or priority, never just decoration. Use neutrals by default; pull in accent color to shift attention.

5. **Natural motion**
   Motion should feel like breathing, not sliding. Use short durations and soft curves. No bouncy gimmicks.

6. **Accessibility is a constraint, not an afterthought**
   Minimum contrast 4.5:1, keyboardable controls, visible focus, large touch targets.

---

## 2) Visual Language

### 2.1 Color System (tokens)

Core palette (aligned to the screenshots and prior direction):

| Token                 | Hex                | Purpose                                                     |
| --------------------- | ------------------ | ----------------------------------------------------------- |
| `color.primary.red`   | `#D54B3D`          | Primary CTAs, destructive confirm with care, emphasis chips |
| `color.accent.teal`   | `#007F7B`          | Secondary CTAs, highlights, benign info                     |
| `color.accent.coral`  | `#F5855D`          | Warm highlights, “live”/voice hint                          |
| `color.bg.cream`      | `#F6F2E8`          | App base background and card canvas                         |
| `color.ink.black`     | `#101114`          | Primary text on light, icons, dark drawer background        |
| `color.ink.gray`      | `#5C5F66`          | Secondary text                                              |
| `color.ui.line`       | `#E4E1DA`          | Hairlines, input borders on light                           |
| `color.state.success` | `#4BAF73`          | Success                                                     |
| `color.state.error`   | `#C03221`          | Errors and desctructive                                     |
| `color.overlay.dark`  | `rgba(0,0,0,0.52)` | Scrim for drawers/modals                                    |

**Gradients (allowed sparingly, per screenshots):**
Only for **hero tiles** (e.g., “Scorecard” tile), never for small controls.

* `gradient.hero.sky`: `linear(180deg, #B5F0FF 0%, #62D1E7 100%)`
* `gradient.hero.teal`: `linear(180deg, #18AFA8 0%, #007F7B 100%)`

> Rule: Gradient surfaces must still pass contrast with overlaid text and badges.

---

### 2.2 Typography

Use a modern grotesk for clarity. If your brand font is **Neue Haas Grotesk**, keep it. If not, use **Inter** as the implementation font with clear fallbacks.

* **Display / H1–H2:** 700 weight
* **Body / UI:** 400–500 weight
* **Mono (data/system):** IBM Plex Mono 400 for telemetry or code-like readouts

**Scale (desktop / mobile):**

* H1: 40 / 28
* H2: 28 / 22
* H3: 22 / 18
* Body: 16 / 16
* Caption: 14 / 14
* Label: 12 / 12

**Rules**

* Line height: 1.4–1.6
* Max line length: ~65ch
* Uppercase only for tiny labels or meta, never for full sentences

**CSS stack example**

```css
:root {
  --font-sans: "Inter", "Neue Haas Grotesk Text", "Helvetica Neue", Arial, system-ui, -apple-system, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
```

---

### 2.3 Spacing, Radius, Elevation, Grid

**Spacing scale (8-pt with 4-pt micro):** 4, 8, 12, 16, 24, 32, 40, 56, 72
Primary rhythm uses 8, 16, 24, 32.

**Radii:**

* Inputs/Buttons: 8
* Cards: 12
* **Bento tiles:** 20–24 (screens show generous, friendly corners)

**Elevation (keep subtle):**

* Card: `0 2px 6px rgba(0,0,0,0.06)`
* Hover Elevate: translateY(-1px), shadow +10% opacity
* Drawer scrim: `rgba(0,0,0,0.52)` with 8–12px blur on background content if supported

**Grid & Breakpoints**

* 12-column grid, 1200 content max
* Gutters: 24 desktop, 16 mobile
* Breakpoints: 360, 390, 768, 1024, 1280, 1440

**Bento grid rules (from screenshots):**

* Mobile: 2-column masonry; tiles snap to a 4-pt grid.
* Tablet: 2–3 columns depending on viewport; keep balanced whitespace.
* Desktop: 3–4 columns; **hero tiles** get 2× height or 2× width when present.

---

## 3) Core Patterns Seen in Screens

### 3.1 “Bento” Action Tiles

Used for entry points like **Book a tee time**, **Golf Rules Questions**, **Let’s play golf**, **Today in golf**, **Scorecards**, **World Rankings**.

**Visual spec**

* Container: radius 20–24, padding 24 (mobile 16)
* Background: solid accent or approved gradient
* Icon/emblem top-left; short label beneath
* Optional media on right (e.g., golfer cutout) must not crowd the label
* Max two typographic elements: label + tiny meta (avoid paragraphs)

**States**

* Hover: +1px elevate, subtle shadow increase
* Focus: high-contrast focus ring (2px)
* Active: compress by 1px translateY

**Do**

* Keep labels short, concrete (“Let’s book a tee time”)
* Use one icon; do not stack multiple

**Don’t**

* Don’t mix gradients with photo textures on the same tile
* Don’t center long text

---

### 3.2 News Cards (image + overlay + badge)

Small rectangular cards with thumb, badge (e.g., “AGV”), title, timestamp.

**Spec**

* Image radius: 12
* Overlay gradient (bottom 40%) for text legibility
* Title max 2 lines; timestamp below in secondary color
* Tap target covers card; no nested links

**States**

* Hover: image zoom 1.02, elevate +1
* Loading: skeleton with shimmer, 12 radius blocks

**Badges**

* Badge tokens: `badge.news`, `badge.live`
* Height 20–24, 6 radius, 12px horizontal padding

---

### 3.3 Dark Drawer / Side Navigation

Full-bleed black panel over content with high-contrast icons.

**Spec**

* Background: `#101114`
* Top area: Home + identity
* List items: 52–56 height, chevron affordance
* Bottom action: **Sign up or Login** (prominent) or **Log out** when authenticated

**Motion**

* Enter: 200ms ease-in-out, from right by 24–32px
* Scrim: fade 150ms

**Accessibility**

* Trap focus; Escape closes
* Maintain scroll position when drawer closes

---

### 3.4 Voice / Prompt Bar (“Let’s talk tee times”)

Floating or docked input with mic affordance.

**Spec**

* Height 48–56, radius 24–28
* Left placeholder becomes typed query; mic on right
* Send/stop affordance toggles on speak
* **Never hide** a keyboard path; voice is additive

**States**

* Idle → Focus: expand 4–8px width, elevate slightly
* Listening: gentle pulsing glow using `color.accent.coral` at 8% opacity

**Microcopy**

* Idle: “Let’s talk tee times” or context-aware (“Find me 9 holes near me”)
* Error: “Couldn’t hear that. Try again or type it.”

---

### 3.5 Course Cards & Rails

Horizontal cards with photo, flags, rating, CTA.

**Card spec**

* Radius 12, image top with same radius
* Title on two lines max
* Meta row: Location + flag + rating pill (85%)
* CTA: “View Tee Times” full-width button in card

**Rail behavior**

* Arrows at row edges only when overflow exists
* Momentum drag on touch; snap to card edges
* Skeleton at rail level (3–4 placeholders)

---

## 4) Components (expanded)

### Buttons

| Variant     | Background          | Text  | Border              | Use                                   |
| ----------- | ------------------- | ----- | ------------------- | ------------------------------------- |
| Primary     | `color.primary.red` | Cream | none                | Main action                           |
| Secondary   | transparent         | Red   | 1px Red             | Less critical action                  |
| Tertiary    | transparent         | Black | 1px `color.ui.line` | Utility actions                       |
| Ghost       | transparent         | Teal  | none                | Inline, minimal emphasis              |
| Destructive | `color.state.error` | Cream | none                | Delete/cancel (confirm step required) |

Common properties: radius 8, padding 12×20, font-weight 500.

**States**

* Hover: 5–7% darken; no heavy shadows
* Focus: 2px focus ring at high contrast
* Disabled: 60% opacity, pointer disabled

---

### Inputs

* Border: 1px `color.ui.line`
* Radius 8, padding 12
* Label above field, 12 size, 500 weight
* Helper/error text below, 12 size

**Focus**

* Border changes to `color.accent.teal`; optional inner glow 1px

**Validation**

* Inline on blur; never block typing
* Error persists until resolved or user navigates away

---

### Cards

* Background: `color.bg.cream`
* Radius 12 (24 for bento tiles)
* Padding: 16–24
* Optional shadow per elevation spec
* Title + meta + CTA region pattern

---

### Chips / Filters

* Height 28–32, 16px horizontal padding
* Selected: fill `color.accent.teal`, text cream
* Unselected: border `color.ui.line`, text black

---

### Tooltips

* No shadows; 2px radius
* Delay 250ms; fade 120ms
* Accessible via `aria-describedby`

---

## 5) Motion Language

**Durations**

* Button/hover: 120–150ms
* Drawer/modal: 180–220ms
* Bento tile hover lift: 120ms
* Rail snap: 180ms

**Easing**

* `cubic-bezier(0.2, 0.0, 0.2, 1)` for most UI
* `ease-out` for entry emphasis, `ease-in` for exit

**Choreography**

* Entrance > Content > CTAs; never all at once
* Avoid Y-overshoot; keep movements small and grounded

---

## 6) Accessibility Rules

* Contrast ≥ 4.5:1 (text) and 3:1 (icons, large text)
* Focus ring must be visible on all interactive elements
* Tap target ≥ 44×44
* Respect OS reduced motion; disable nonessential animations
* Voice bar: always provide keyboard alternative

---

## 7) Content & Microcopy

**Voice:** direct, calm, assured.
**Tone:** helpful, never hype.

**Patterns**

* Primary action phrasing: verbs first (“Book a tee time”, “See today’s news”)
* Time: “2 min ago”, never “2 minutes before”
* Errors: say what happened and what fixes it. “Payment failed. Try another card or contact your bank.”

**Examples**

* Empty course search: “No tee times match your filters. Try changing the time or location.”
* Rules prompt: “Ask a rules question. We’ll answer fast. A rules official confirms the edge cases.”

---

## 8) Layout Patterns

**Home**

* Top row: two bento hero tiles side by side (Book / Rules)
* Second row: Weather mini + “Let’s play golf”
* News strip: 2–3 cards per row on mobile; 4–6 desktop
* Scorecard tiles: hero gradient tiles, two across on desktop
* Voice bar docked bottom right on desktop; docked bottom on mobile

**List pages**

* Filters above content as chips; “Near you” persists
* Rail cards snap; arrows only when overflow exists

**Details pages**

* Hero image with 12 radius; content grid below
* Persistent CTA (e.g., “View Tee Times”) pinned on mobile

---

## 9) Empty/Loading/Error States

**Loading**

* Skeletons for bento, rails, and article cards
* Avoid spinners where skeletons suffice

**Empty**

* Use friendly illustration or icon; 1–2 lines of guidance; one primary action

**Error**

* Inline card with `color.state.error` icon, precise message, retry

---

## 10) Iconography & Imagery

* Icons: simple, slightly imperfect geometry; 24px default, 32px hero
* Do not mix outline and fill styles in the same context
* Imagery: prefer clear subject with breathing space; crop for motion and directionality (subject looking into the content, not off the canvas)

---

## 11) Implementation: Tokens & Mappings

**CSS variables (example)**

```css
:root {
  /* colors */
  --color-primary-red: #D54B3D;
  --color-accent-teal: #007F7B;
  --color-accent-coral: #F5855D;
  --color-bg-cream: #F6F2E8;
  --color-ink-black: #101114;
  --color-ink-gray: #5C5F66;
  --color-ui-line: #E4E1DA;
  --color-success: #4BAF73;
  --color-error: #C03221;

  /* spacing */
  --space-4: 4px; --space-8: 8px; --space-12: 12px; --space-16: 16px;
  --space-24: 24px; --space-32: 32px; --space-40: 40px;

  /* radii */
  --radius-8: 8px; --radius-12: 12px; --radius-20: 20px; --radius-24: 24px;

  /* elevation */
  --shadow-card: 0 2px 6px rgba(0,0,0,0.06);

  /* typography */
  --font-sans: "Inter", "Neue Haas Grotesk Text", "Helvetica Neue", Arial, system-ui, -apple-system, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
```

**Design token JSON (excerpt)**

```json
{
  "color": {
    "primary": { "red": "#D54B3D" },
    "accent": { "teal": "#007F7B", "coral": "#F5855D" },
    "bg": { "cream": "#F6F2E8" },
    "ink": { "black": "#101114", "gray": "#5C5F66" },
    "ui": { "line": "#E4E1DA" },
    "state": { "success": "#4BAF73", "error": "#C03221" }
  },
  "radius": { "sm": 8, "md": 12, "lg": 20, "xl": 24 },
  "space": { "xs": 4, "sm": 8, "md": 16, "lg": 24, "xl": 32, "xxl": 40 },
  "shadow": { "card": "0 2px 6px rgba(0,0,0,0.06)" }
}
```

Map Figma Variables → code variables one-to-one. Keep naming flat and predictable.

---

## 12) QA Heuristics (use this to police builds)

* Does each surface clearly promote a single primary action?
* Do bento tiles keep labels short and unambiguous?
* Are gradients limited to hero tiles and still accessible?
* Is the drawer accessible (focus trapping, Escape to close)?
* Do rails only show arrows when overflow exists?
* Are motion durations ≤ 220ms and curves non-bouncy?
* Do all components pass tap target and contrast checks?
* Can the flow be completed with keyboard only?

---

## 13) Known Divergences & Adjustments from Earlier Draft

* **Gradients:** Allowed on hero tiles (observed in “Scorecard”); prior rule “avoid gradients” updated to “use gradients only on hero tiles, not controls.”
* **Bento radii:** Increased to 20–24 to match screenshots.
* **Voice bar:** Added pulsing “listening” state using coral accent; ensure keyboard parity.

---

## 14) What to build next (design ops)

1. **Figma Variables** for color/typography/space and a Tokens export.
2. **Component library pages**: Buttons, Inputs, Cards, Bento, Drawer, Chips, Rail.
3. **Documentation frames**: “Do/Don’t” with redlines and spacing callouts.
4. **Responsive spec** tables for bento layout across breakpoints.
5. **Accessibility checklist** as a frame with pass/fail examples.

