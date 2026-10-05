# Design System: ~/.alanmmolina

_A living spec for the visual language of alanmmolina.com. Single source of truth for any restyle, new component, or plugin addition. Built on Quartz 5 — this file documents what exists today and encodes the intent behind it._

---

## 1. Visual Theme & Atmosphere

A quiet, terminal-adjacent digital garden. The mood is "personal zettelkasten, opened in a warm-lit room": restrained, monochrome, and text-first, where the content does the talking and the chrome stays out of the way. Think of the site title — `~/.alanmmolina` — as the aesthetic contract: a developer's home directory, but livable.

- **Density:** Art-Gallery Airy (2–3). Generous whitespace, one column of prose flanked by side panels. No dashboard cramming.
- **Variance:** Predictable Symmetric (2–3). A stable three-column grid. Deliberate — this is a reading surface, not a portfolio splash. Asymmetry lives inside the articles (diagrams, code, notes), never in the chrome.
- **Motion:** Static Restrained (2–3). Transitions are short (0.2s ease), functional, and silent. No choreography. The only living element is the graph view.

The site must feel **engineered, not decorated**. Every visual element — the highlight-tinted internal links, the bordered code blocks, the 1px hairlines — reads like a deliberate typographic decision, not a theme default.

### The Core Tension: Engineered Chrome, Handmade Content

The site's identity is a deliberate contrast between two surfaces:

1. **The chrome** (layout, navigation, typography, code) — machine-precise, monochrome, grid-aligned, terminal-adjacent. This is the engineer speaking.
2. **The diagrams** — hand-drawn Excalidraw sketches in the Excalifont hand, wobbly strokes, imperfect alignment, honest scrawl. This is the person at the desk speaking.

The tension is the brand. A polished, symmetrical article frame holding a slightly sloppy sketch says: _the thinking is rigorous, but the person is still there_. The sloppiness is not a bug or a shortcut — it is a deliberate, artisanal choice that makes complex data engineering feel like it was explained on a whiteboard by someone who actually fought the problem.

The rule that follows from this: **never let the chrome become sketchy, and never let the sketches become polished.** Both surfaces must stay true to their nature.

---

## 2. Color Palette & Roles

**Zero accent colors. Monochrome, two modes only.** Saturation is banned by absence: everything is neutral grays on warm paper (light) or zinc night (dark). Contrast does the hierarchy work. The single sanctioned exception is the callout palette (below), where color is semantic — it marks _what kind_ of note you're reading — and is always applied at translucent strength.

### Light Mode

- **Warm Paper** `#FAF8F8` — Primary canvas. Slightly warm off-white; never pure white, never cold blue-white.
- **Hairline** `#E5E5E5` — Borders, code block outlines, table rules, horizontal rules. 1px structural lines.
- **Quiet Gray** `#B8B8B8` — Muted/disabled text, checked task items, line-through decoration.
- **Secondary Ink** `#4E4E4E` — Body copy, metadata, secondary text. (Body copy deliberately sits one step below headline ink.)
- **Primary Ink** `#2B2B2B` — Headlines, strong text, primary navigation, active states. Off-black charcoal, never `#000000`.
- **Whisper Highlight** `rgba(100, 100, 100, 0.1)` — Internal wikilink backgrounds, selected text, highlighted code lines.
- **Inverted Highlight** `#FAFAFA88` — Text highlight (mark) fill.

### Dark Mode

- **Zinc Night** `#09090B` — Primary canvas. Zinc-950 depth, never pure black.
- **Night Hairline** `#292929` — Borders, code block outlines, rules.
- **Night Gray** `#727272` — Muted/disabled text.
- **Night Secondary** `#EAEAEA` — Body copy, metadata.
- **Night Ink** `#FAFAFA` — Headlines, strong text, navigation.
- **Whisper Highlight** `rgba(100, 100, 100, 0.1)` — Same role as light mode; the shared token that ties both modes together.

### Rules

- **Night is the canonical theme.** The site's true home is Zinc Night. Every design decision — tokens, diagram stroke colors, screenshots, covers — is made in dark mode first, and light mode is the derived adaptation. New components are judged on how they read on `#09090B`; if something only looks right in light mode, it's wrong.
- Both modes share the same structural contrast steps: canvas → hairline → gray → secondary → ink.
- `textHighlight` is the only "colored" token and stays translucent white.
- OG images (CustomOgImages) are generated in `darkMode` — they inherit this palette, so article covers always look like the site at night.
- Syntax highlighting: `github-light` / `github-dark`, `keepBackground: false` — code never gets a background fill, only the hairline border.

### The Callout Palette (the sanctioned color exception)

Callouts are the one place color enters the site. Each Obsidian callout type gets three tokens from its hue: **full strength for icon + title text**, **27% alpha for the 1px border**, **6% alpha for the background wash**. The title tint is the accent; the panel itself stays a whisper of color.

| Callout              | Icon + Title       | Border             | Background           |
| -------------------- | ------------------ | ------------------ | -------------------- |
| note                 | `#448aff`          | `#448aff44`        | `#448aff10`          |
| abstract             | `#00b0ff`          | `#00b0ff44`        | `#00b0ff10`          |
| info, todo           | `#00b8d4`          | `#00b8d444`        | `#00b8d410`          |
| tip                  | `#00bfa5`          | `#00bfa544`        | `#00bfa510`          |
| success              | `#09ad7a`          | `#09ad7144`        | `#09ad7110`          |
| question             | `#dba642`          | `#dba64244`        | `#dba64210`          |
| warning              | `#db8942`          | `#db894244`        | `#db894210`          |
| failure, danger, bug | `#db4242`          | `#db424244`        | `#db424210`          |
| example              | `#7a43b5`          | `#7a43b544`        | `#7a43b510`          |
| quote                | `var(--secondary)` | `var(--lightgray)` | none — fully neutral |

**Rules:**

- Same hexes in both modes. The low-alpha treatment is what lets these hues survive on Warm Paper _and_ Zinc Night without adjustment — the night-first rule is baked into the alphas, not per-theme overrides.
- Color is semantic, never decorative: it signals note type (caution = amber/orange, failure = red, example = violet). The hue carries meaning; don't recolor callouts for mood.
- Callout colors never leak into the rest of the UI. No tinted links, no tinted tags, no tinted headings. The chrome stays monochrome.
- No new callout colors without updating this table.
- Full saturation only on the icon glyph and the title line — never on borders, backgrounds, or body text inside the callout.

---

## 3. Typography Rules

- **Header/Display:** Roboto, weights 400–700. Hierarchy comes from weight and color (Primary Ink), not size theatrics. Headlines are track-tight and modest: h1 = 1.75rem (2rem inside articles), h2 = 1.4rem, h3 = 1.12rem, h4–h6 = 1rem.
- **Body:** Roboto, 1rem with 1.6rem line-height. Max ~65 characters per line in the center column. Relaxed, unhurried reading.
- **Code/Mono:** Fira Code — code blocks, inline code, line numbers, and (as small, hidden-until-hover) anchor links `#`. Mono is the site's only ornament; it appears exactly where a developer would expect it.
- **Metadata:** small, Quiet Gray, often mixed with mono for dates and paths.

### Banned

- Inter. Also banned: generic system stacks and any serif (`Times New Roman`, `Georgia`, `Garamond`) — this is a software UI, serifs have no place in the chrome.

---

## 4. Component Stylings

- **Internal wikilinks:** no underline; filled with Whisper Highlight, 5px radius, 0.1rem horizontal padding. This is the signature treatment — links read as "tinted terms," Obsidian-style. Hover: color shifts one step toward muted. Broken links render at 0.5 opacity.
- **External links:** semibold, no decoration, with a small external-path icon at 1ex height.
- **Tag links:** prefixed with a literal `#` glyph via `::before`.
- **Code blocks:** hairline border (1px), 5px radius, no background fill. Line numbers in a dimmed slate `rgba(115, 138, 148, 0.6)` right-aligned column. Highlighted lines: Whisper Highlight fill + 3px Primary Ink left border. Optional title bar: mono, 0.9rem, bordered, sitting flush above the block.
- **Inline code:** 0.9em Fira Code, Quiet background (lightgray), 5px radius, 0.1rem padding.
- **Blockquotes:** 3px Primary Ink left border, 1rem left padding, no fill, no italic.
- **Tables:** hairline row separators, 2px gray rule under `th`, generous 0.4–0.7rem cell padding. Horizontal scroll container on overflow; never squish.
- **Images:** 5px radius, full-width with 1rem vertical margin. Captions (em directly after img) sit 1rem above the image's bottom edge. Diagram style inside content follows the mono/monochrome language — Mermaid and Excalidraw must not introduce loud colors.
- **Callouts:** Obsidian-style tinted panels — hairline border, 5px radius, 1rem side padding, icon + semibold title. Full color spec (hues, alphas, and the no-leak rules) lives in section 2. Collapsible via fold icon (0.15s rotation on collapse); content grid animates at 0.1s. They are typographic, never glowy.
- **Checkboxes:** 16px squares, hairline border, Primary Ink fill when checked with a white check glyph.
- **Socials bar:** the icon row under the site title (GitHub, LinkedIn), then a 1px hairline vertical rule (16px, Light Gray) before the two action buttons, the theme toggle and the focus toggle — 20px stroke icons, same weight and hover shift for every member. Both are bare buttons (lightbulb for theme, eye for focus; the slashed variant reads as "off" — dark mode, focus disengaged), actions among links, styled to read as one row.
- **Buttons/controls (Search):** flat, no shadows, no glows. Active feedback = color/tint shift only. Touch targets never below 44px. Spans the full sidebar column — its edges aligned with the hairline rules above it.
- **No cards anywhere.** Elevation is communicated with borders and whitespace, not shadows. This is a hard rule of the design.
- **Loaders/Empty states:** the site is static — the only async states are the graph and search. Search shows composed empty results; the graph draws in place. No spinners.

---

## 5. Layout Principles

- **Grid:** CSS Grid, three areas — left sidebar (320px) / center / right sidebar (320px). Areas: sidebar-left, header, center, footer, sidebar-right. Gaps 5px between tracks.
  - **Desktop (≥1200px):** three columns, both sidebars sticky (left: full-height column, top 6rem padding).
  - **Tablet (800–1200px):** left sidebar + content; right sidebar content flattens below the article as a row.
  - **Mobile (<800px):** single column, no exceptions. Order: header → center → footer; sidebar content (search) collapses to a horizontal control row on top. The theme and focus toggles live in the socials bar and travel with the site title.
- **Containment:** page max-width = 1500px (desktop breakpoint + 300px), centered. No full-bleed chrome.
- **Sticky left sidebar** is the only "floating" element — everything else occupies its own clean zone. No overlapping content, no absolute-positioned stacking.
- **Spacing rhythm:** 6rem top spacing on desktop, collapsing proportionally; 2rem footer margin; article headings carry their own vertical rhythm (h1: 2.25rem top / 1rem bottom).
- **CSS Grid over flexbox math.** No `calc()` percentage hacks in custom code.
- **Full-height sections:** if ever used, `min-h-[100dvh]`, never `h-screen`.

---

## 6. Motion & Interaction

- **Transition standard:** `0.2s ease` on color and opacity only. Applies to links, anchor reveals, footnote backrefs, checkbox states, the 3px reading-progress bar.
- **Scroll:** smooth (`scroll-behavior: smooth`), with `scroll-padding-top: 4rem` on mobile so headings don't hide under controls.
- **Graph view:** the one sanctioned living component — force-directed, springs, repositions on drag. Its motion is physics, not decoration; it never obstructs reading.
- **Popovers:** hover-preview of internal notes, fade-in, dismiss on leave.
- **Performance rules:** animate `transform`/`opacity` exclusively (progress bar animates `width` only because it's a 3px fixed strip — no layout thrash). No parallax, no scroll-jacking, no grain/noise overlays.
- **No perpetual micro-loops.** A reading site does not pulse. If something moves forever, it gets deleted.

---

## 7. Anti-Patterns (Banned)

- No emojis in chrome or generated UI (commit history shows backref emojis were actively removed — keep it that way).
- No Inter font. No generic serifs. No system-font fallbacks in premium surfaces.
- No pure black `#000000` and no pure white — warm paper and zinc night only.
- No accent colors outside the callout palette. No neon, no purple/blue glows, no gradient text, no gradient buttons, no oversaturated anything.
- No card components, no shadows, no rounded floating panels. Borders only.
- No centered hero sections, no landing-page theatrics, no "scroll to explore" filler, no bouncing chevrons.
- No AI copywriting clichés ("elevate", "seamless", "unleash", "next-gen", "game-changer") — in UI strings or article prose.
- No 3-column equal-card feature grids.
- No custom mouse cursors, no confetti, no celebratory micro-interactions.
- No broken image links, no Unsplash placeholders — diagrams are Mermaid/Excalidraw or real screenshots.
- No horizontal scroll at any viewport. Multi-column layouts collapse to one column below 800px, always.
- No clean-font diagrams. Excalidraw sketches must always render in Excalifont — a hand-drawn stroke with a polished font breaks the core tension.
- No diagram-tool polish: no draw.io/Visio/Lucidchart aesthetics, no perfect grid snapping, no clip-art icons, no emoji stickers inside sketches.
- No white diagram boxes in dark mode — transparent canvases only.

---

## 8. Visual-Content Language (Diagrams & Covers)

Articles are where the aesthetic gets physical:

### The Handmade Diagram Language (Excalidraw + Excalifont)

Excalidraw diagrams are **the** signature visual of the site. They are not illustrations — they are sketches: artifacts of thinking rather than polished infographics. Every diagram must obey the handwriting law:

- **Excalifont always.** All text inside diagrams renders in the Excalifont hand (`fontFamily: 2` is enforced at render time — see `quartz/components/scripts/excalidraw.inline.ts`). A diagram with a clean font is a violation, even if the author forgets to set it. The wobbly letterforms are the point.
- **Sketchy strokes, never perfect geometry.** Arrows slightly overshoot their targets, boxes are a hair off-square, alignment is close but never grid-snapped. If a diagram starts looking like draw.io, Visio, or a Lucidchart export, it has lost its soul and must be redrawn by hand.
- **One stroke, one intent.** Keep the element count low: boxes, arrows, labels, an occasional container. Every shape must earn its place. A diagram that needs a legend is a diagram that needs splitting.
- **Hand annotations welcome.** Small arrows with short mono-style labels, circled words, margin scribbles, "NOTE:" markers — the marks of a person explaining to a friend. This is where the warmth lives.
- **Consistent vocabulary per article.** For open table formats: `architecture`, `read-path`, `write-path` are the recurring triad. Reuse the same box shapes, naming, and arrow language across an article series so the sketches feel like pages from one notebook.
- **Transparent canvas, always.** Diagrams render with `viewBackgroundColor: transparent` so the paper is the site's own Warm Paper or Zinc Night. No white boxes inside the dark mode.
- **Theme pairs.** Every diagram ships as `*.light.excalidraw` / `*.dark.excalidraw` with a base `*.excalidraw` fallback (the render script picks the right variant from the saved theme). Stroke and text colors must be tuned per variant so contrast survives in both modes.
- **No color noise.** Stick to charcoal inks, the site's grays, and at most one muted differentiation tint if a diagram truly demands it. Hand-drawn does not mean crayon.

### Mermaid Diagrams

- Used sparingly, when the content demands a cleaner, more formal rendering than a sketch.
- Monochrome node/edge styling inherited from the palette; arrows and labels in Primary/Night Ink, container strokes in hairline. A diagram that needs color is a diagram that needs splitting.

### Covers & Screenshots

- **OG images:** generated in dark mode — Zinc Night canvas, Fira Code accents, Primary Ink typography, title + date. Every article cover looks like a terminal screen.
- **Screenshots:** bordered, 5px radius, no drop shadows, no browser-chrome mockup frames.

---

## 9. Change Checklist

Before merging any visual change, verify:

1. Does it use only tokens from section 2? (No new colors without updating this file.)
2. Does it respect the no-cards, no-shadows, borders-only rule?
3. Does it collapse to one column below 800px with no horizontal scroll?
4. Is every new animation `0.2s ease` on color/opacity, or the graph view?
5. Does it introduce an accent color, emoji, or Inter? If yes, stop.
6. Would it still look right with the terminal-first identity of `~/.alanmmolina`?
7. Do any new or edited diagrams still render in Excalifont with transparent canvas, a theme pair, and honest hand-drawn strokes? If a sketch got "cleaned up," it's wrong.
8. Was it designed in dark mode first? Night is the canonical theme — verify on Zinc Night before even checking light mode.
