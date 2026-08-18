---
name: architecture-canvas
description: >
  Turn any system architecture into an interactive, pannable/zoomable canvas
  diagram (dark by default with a light switcher, JetBrains Mono,
  plane-coloured bands, click-to-isolate focus, PNG export) — the "architecture
  canvas" style — and optionally publish it to artifact.cafe for review. Use
  whenever the user asks for an architecture diagram, system overview, "canvas"
  of a codebase or platform, a visual map of services/layers/planes, or wants a
  diagram "in the architecture-canvas style" — whether the input is a codebase
  to explore, an architecture doc, or a verbal description. Prefer this over
  hand-writing SVG/HTML diagrams or Mermaid when the result should be an
  explorable, publishable artifact.
---

# Architecture Canvas

Produce an interactive architecture diagram as a single self-contained
`index.html`: a canvas viewer with pan/zoom/pinch, click-to-isolate focus with
a readout panel, keyboard shortcuts, shareable view URLs, a dark/light
switcher, and 2× PNG export.
You never write viewer code — you author a **scene** (pure data: planes,
bands, boxes, edges, labels) and the bundled scripts assemble and check it.

The pipeline:

```
understand the architecture → write scene.js → validate → build → (publish)
```

## Step 1 — Understand the architecture first

The diagram is only as good as the analysis. Before any drawing, produce a
short **architecture brief** (in your working notes, or shown to the user if
they should confirm it):

- **Planes/layers** (4–7), in causal top-to-bottom order — who acts, through
  what surface, on what abstractions, executed where. Name each plane and its
  one-line role.
- **Components** (15–25 total): for each — its plane, whether it's an *owned
  abstraction* (dashed) or *swappable infra / app surface* (solid), 1–2 facts,
  and the one non-obvious thing about it (this becomes the italic footnote).
- **Flows** (10–20 meaningful edges): the main pipeline, plus feedback loops
  and cross-cutting flows.
- **The thesis**: a 3–5 word pipeline strapline (e.g. `browse → price →
  order → fulfil → learn`) and a one-sentence subtitle.

Where the architecture comes from depends on what you're given:

- **A codebase** — explore it (package layout, entry points, deploy configs,
  existing docs/READMEs). Spawn an Explore agent for large repos.
- **An architecture doc** — read it, but verify surprising claims against the
  code when both exist.
- **A description** — use it as-is; ask only if the layering is genuinely
  ambiguous.

## Step 2 — Author the scene

Read `references/scene-format.md` (data model, coordinate math, layout
recipe) and skim `examples/shoply-scene.js` (the canonical example scene). Then write a `scene.js` next to your intended output defining the
nine constants: `W, H, PLANES, BANDS, BOXES, EDGES, TEXTS, SWATCHES, CHIPS`.

Layout mechanically, top to bottom, using the recipe's numbers — title block
at the top, ~5 bands (merge related planes into a neutral multi-column band
rather than stacking 7 thin ones), generous boxes that fill their band's
width, edges routed orthogonally with long feedback flows in the side
gutters, footnotes at the bottom, then set `H`.

Write `scene.js` inside the artifact folder (next to the future
`index.html`) so nothing strays outside the publishable directory, and write
its comments about *this* architecture — don't carry over the example's
Shoply-specific commentary.

## Step 3 — Validate, then build

```bash
node <skill-dir>/scripts/validate.js scene.js
```

Fix every ERROR (dangling ids, boxes outside bands, overlaps, text overflow)
and take WARNings seriously — they're usually real. Re-run until clean, then:

```bash
node <skill-dir>/scripts/build.js --scene scene.js --out <slug>/index.html \
  --title "Acme — platform architecture" \
  --kicker "ACME — PLATFORM ARCHITECTURE" \
  --sub "<b>ingest</b> → <b>process</b> → <b>serve</b>" \
  --slug acme-architecture
```

`--sub` is the plate strapline (small HTML, `<b>` for the stage names).
Output into its own folder with `index.html` at the root — that folder is the
publishable artifact.

If browser tooling is available (Playwright MCP, `open`), load the file once
and screenshot it — check nothing collides and the story reads top-to-bottom.
Don't skip validation in favour of eyeballing; do both when you can.

## Step 4 — Publish to artifact.cafe (when the user wants it shared)

If the user asked to publish/share/review the canvas, invoke the
`artifact-cafe` skill and follow it — it handles login/workspace choice,
`--title`/`--notes`, and returns the review URL. Point it at the folder
containing `index.html`. If the user didn't ask, offer it as a follow-up
instead of publishing unprompted.

## Quality bar

- Ownership semantics stay honest: dashed = owned abstraction, solid =
  swappable infra or app surface. This distinction is the diagram's argument.
- Adjacent columns get well-separated hues; every plane colour comes from the
  recommended list in the reference.
- Readout `about` text is written for a newcomer — one crisp sentence per box.
- The diagram is an orientation map, not an inventory: fewer, better boxes.
