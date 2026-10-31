# DESIGN.md — Triage Visual & UX Spec

This is a review-dashboard tool for a working rescuer/coordinator under real time pressure, not
a flashy hackathon-demo landing page. Every rule here is written to make the interface look and
feel like genuine operations software — closer to an air-traffic or logistics dashboard than a
consumer AI app — and to explicitly rule out the visual patterns that make a project look like
an unreviewed AI-generated mockup rather than a considered product. `PLAN.md` Phase 7 implements
this; read this file in full before building any component, not just the first one.

---

## 1. Core Design Principles

1. **Information density over decoration.** A reviewer scanning a long queue needs to process
   many rows quickly — clarity and scanability beat visual flourish everywhere in this product.
2. **Confidence is communicated honestly, not decorated.** A low-confidence flag should look
   *calmer*, not grayed-out-and-ignorable and not alarmingly styled either — see Section 4.
3. **Nothing in this interface should look like it is trying to seem more impressive than the
   system actually is.** This principle exists because of this project's core constraint (never
   overclaim detection certainty) — the visual design must reinforce that honesty, not undercut
   it with confident-looking UI chrome around uncertain data.
4. **Every tab earns its place functionally** (per `PLAN.md` Phase 7's five tabs) — no tab exists
   purely for visual completeness.

---

## 2. Explicitly Banned Patterns ("AI slop" — do not do any of this, anywhere)

This section is deliberately explicit because these patterns are the generic, default output of
many AI coding tools when not told otherwise, and they read as unpolished/unconsidered to anyone
evaluating a serious product:

- **No glowing borders, no glowing text, no neon drop-shadows.**
- **No colorful "pill" badges used decoratively** — a status/label badge is fine as a small,
  flat, low-saturation tag, but not as a bright gradient-filled pill shape.
- **No gradient backgrounds on cards, buttons, or section headers** "just because."
- **No decorative animated particles, floating shapes, or background motion** of any kind.
- **No emoji used as functional UI icons** — use a proper icon set (see Section 5) instead of
  emoji for anything that conveys status or meaning.
- **No center-aligned marketing-style hero sections** anywhere in this product — it is a working
  tool, it opens directly into the functional dashboard, not a landing page.
- **No more than one accent color used for emphasis** anywhere on a single screen — pick one
  functional accent (Section 3) and use neutral tones for everything else.
- **No rounded-corner-on-everything, shadow-on-everything default styling** without a specific
  reason — flat, clean surfaces are the default; elevation (a subtle shadow) is reserved
  specifically for the one or two things per screen that are genuinely meant to feel "on top"
  (e.g. a modal), not applied uniformly to every card.

If a generated component includes any of the above, it should be revised before being considered
done — this is a concrete, checkable item in Phase 7's resumability check, not a vague aesthetic
preference.

---

## 3. Color System

- A neutral, desaturated base palette (grays/near-blacks for dark mode, grays/near-whites for
  light mode) for all structural chrome — backgrounds, borders, dividers, body text.
- **One single functional accent color**, used sparingly and consistently, exclusively for
  primary interactive elements (the main action button, the active tab indicator, links).
- **Confidence levels use a restrained, low-saturation three-step scale** — not bright
  traffic-light red/yellow/green, which reads as alarm-styling and undercuts Principle 2 in
  Section 1. A muted, desaturated warm tone for higher confidence and a cooler, quieter tone for
  lower confidence communicates the distinction without visual alarm.
- Theme-aware: define color tokens as variables, support both light and dark mode, respect
  system preference by default.
- All text/background combinations meet **WCAG AA contrast (4.5:1) minimum**.

---

## 4. Confidence Presentation (Section 1, Principle 2 in practice)

Per `PLAN.md` Phase 1.2's locked vocabulary rules, every candidate in the Priority Queue and
Clip Review tabs must show its confidence label using only the approved terms
(`possible-high`/`possible-medium`/`possible-low`, or whatever final labels Phase 1.2 settles
on) — never a bare percentage presented as if it were precise, and never hidden behind a generic
icon with no text label next to it.

- Each confidence level gets: a short text label (always visible, never icon-only), and a small,
  low-saturation color + shape distinction (e.g. a different small marker shape per level, not
  just color, so the distinction also works for color-blind users).
- Low-confidence items remain **fully visible and reviewable** in the queue — per `PLAN.md`
  Phase 1.2, nothing is ever hidden or auto-dismissed — they are simply styled slightly more
  quietly (e.g. lower-emphasis text weight) than higher-confidence items, never removed from
  view.

---

## 5. Typography & Iconography

- A clean, highly legible sans-serif throughout — no decorative or display fonts anywhere in
  this product.
- Clear type-scale hierarchy: page titles, section headers, row/body text, and metadata
  (timestamps, IDs) should each be visually distinct in size/weight, applied consistently across
  all five tabs.
- Use a proper icon library (e.g. a standard outline icon set) for all functional icons —
  navigation, status indicators, action buttons. Icons are always paired with a text label in
  this product; this is operations software for a focused user under pressure, not a consumer
  app where icon-only UI is acceptable.

---

## 6. Layout — Shell & Navigation

```
┌───────────────────────────────────────────────────────────┐
│  Triage                              [Settings] [Account]  │  ← thin top bar
├───┬───────────────────────────────────────────────────────┤
│ I │                                                         │
│ n │                                                         │
│ g │                                                         │
│ e │              < active tab's content >                  │  ← left rail tab
│ s │                                                         │     navigation,
│ t │                                                         │     not top-tabs —
│───│                                                         │     gives more
│ Q │                                                         │     horizontal room
│ u │                                                         │     for dense tables
│ e │                                                         │
│ u │                                                         │
│ e │                                                         │
│───│                                                         │
│ C │                                                         │
│ l │                                                         │
│ i │                                                         │
│ p │                                                         │
│───│                                                         │
│ O │                                                         │
│ v │                                                         │
│ e │                                                         │
│ r │                                                         │
└───┴───────────────────────────────────────────────────────┘
```

- A left-side vertical tab rail (not horizontal top-tabs) — this is the standard pattern for
  dense operations dashboards (logistics, ops monitoring, air-traffic-style tools) because it
  leaves the full width available for data-dense tables and the Clip Review detail view.
  - Tabs, in order: **Ingest**, **Priority Queue**, **Clip Review** (only active/reachable when a
    candidate is selected from the Queue), **Overview**, **Settings**.
- Top bar is minimal — product name, a settings shortcut, nothing decorative.

---

## 7. Tab-Specific Layout Notes

### 7.1 Ingest
- A simple, clear upload/selection area and a visible job-progress indicator once a job starts
  (the actual state-machine stages from `SYSTEM_DESIGN.md` Section 3 — `queued → ingesting →
  detecting → ranking → complete` — shown as a simple labeled step indicator, not a vague
  spinner with no information).

### 7.2 Priority Queue
- A dense, sortable table/list — rank, thumbnail, confidence label, one-line reasoning summary,
  timestamp/source. This is the single most information-dense screen in the product and should
  be designed as such: compact row height, clear column alignment, no wasted whitespace between
  rows.

### 7.3 Clip Review
- A two-column detail layout: source frame/image with the mask overlay on the left, full
  reasoning text + evidence citation list + reviewer action controls on the right. The overlay
  itself (drawn from SAM 3.1's mask/box data) should use the **single accent color** from
  Section 3, not a decorative rainbow of overlay colors.

### 7.4 Overview
- A handful of simple, honest summary numbers (total candidates, breakdown by confidence level,
  review progress) — presented as plain stat blocks, not as an elaborate chart-heavy analytics
  page. This tab exists to be genuinely useful at a glance, not to demonstrate charting ability.

### 7.5 Settings
- Models in use, link to the ethical/scope framing document, current API usage/cost — presented
  as a simple, readable settings/info page, consistent with the rest of the product's restrained
  visual language.

---

## 8. Responsive Behavior

- The primary target is a desktop/laptop browser (this is a coordinator working at a station, not
  a mobile field app) — design and test for that first.
- At minimum, confirm the layout degrades gracefully (left rail collapses to icons-only or a
  simple top selector) on a tablet-width viewport, since a demo may be shown on varied hardware.

---

## 9. Design-Review Checklist (used in `PLAN.md` Phase 7's resumability check)

- [ ] No item from Section 2's banned-patterns list appears anywhere in the built UI.
- [ ] Only one accent color is used for emphasis on any given screen.
- [ ] Confidence levels are distinguishable by label text, not color/icon alone.
- [ ] Low-confidence items remain fully visible in the Priority Queue, never hidden.
- [ ] All text/background contrast meets WCAG AA.
- [ ] Left-rail navigation is used, not top-tabs, and all five `PLAN.md` Phase 7 tabs are present
      and reachable.
- [ ] Priority Queue table is dense and scannable, not padded with excess whitespace.
- [ ] Clip Review's mask overlay uses the single defined accent color, not multiple decorative
      colors.
- [ ] No emoji used as functional icons anywhere in the product.
