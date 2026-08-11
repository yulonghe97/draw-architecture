# Scene format & layout recipe

The template (`assets/template.html`) contains the entire viewer — pan/zoom,
pinch, keyboard, click-to-isolate focus, the readout panel, PNG export, and a
shareable URL hash. You author only a **scene**: a JavaScript fragment defining
nine constants. `scripts/build.js` splices it into the template.

The scene may reference two things the template provides:

- `C` — the fixed dark palette (`C.bg C.boxFill C.boxStroke C.bandFill C.line
  C.sky C.rose C.orange C.slate C.ink C.mut C.dim C.plane C.arrowLbl`)
- `planeColor(id)` — returns the hex colour of a plane

Study `examples/shoply-scene.js` alongside this document — it is the canonical
example of the style.

## The nine constants

```js
const W = 1480, H = 1940;   // world size — W stays 1480, H grows with content
const PLANES = { … };        // the architecture's layers, with one hue each
const BANDS  = [ … ];        // horizontal zones, one per layer (usually)
const BOXES  = [ … ];        // components inside bands
const EDGES  = [ … ];        // orthogonal arrows between boxes/bands
const TEXTS  = [ … ];        // title block, legend text, plane labels, footnotes
const SWATCHES = [ … ];      // the two legend chips (dashed vs solid)
const CHIPS  = [ … ];        // one small colour chip per plane in the legend
```

### PLANES

One entry per architectural layer. `id → { c: '#hex', label: 'Readout label' }`.

```js
const PLANES = {
  humans:    { c: '#94A3B8', label: 'Humans & connected systems' },
  product:   { c: '#7DD3FC', label: 'Product' },
  execution: { c: '#F6821F', label: 'Execution plane' }
};
```

Recommended hues (all tuned for the dark background): slate `#94A3B8`, sky
`#7DD3FC`, violet `#A78BFA`, cyan `#22D3EE`, green `#4ADE80`, rose `#FB7185`,
orange `#F6821F`, amber `#FBBF24`. Push hues furthest apart where columns sit
**side by side** — adjacent hues in adjacent columns is the one combination
that reads badly. 4–7 planes is the sweet spot.

**Planes ≠ bands.** Aim for **5 bands ± 1** even when there are 6–8 planes:
give each *stage* of the story a band, and let one neutral band hold several
related planes as side-by-side columns (the canonical example packs
search/payments/notifications into one "platform services" band). Many thin
bands (7+) make every box small and the poster stringy — if you're about to
stack seven bands, merge the middle ones into a column band instead.

### BANDS

A band is a rounded-rect zone spanning a layer. Fields:

```js
{ id: 'band-product',        // conventionally 'band-<plane>'
  plane: 'product',          // drives border + header colour (null = neutral grey)
  x: 160, y: 440, w: 940, h: 300,
  alpha: 0.45,               // border opacity 0.4–0.6 (1 for a neutral band with stroke:)
  dash: true,                // dashed border = a zone of owned abstractions
  stroke: '#3A4250',         // only for plane:null neutral bands
  hdr:  { x: 184, y: 470, t: 'PRODUCT — apps/web · NEXT.JS' },          // top-left header
  tagr: { x: 1076, y: 470, t: 'OURS — THE PRODUCT', alpha: 0.6 } }      // right-aligned tag
```

`hdr.x = band.x + 24`, `hdr.y = band.y + 30`. `tagr.x = band.x + band.w − 24`,
same y. The right tag is optional — use it for an ownership or purpose note.

A band that holds several planes at once (e.g. three service columns) stays
neutral: `plane: null, stroke: '#3A4250', alpha: 1`, and each column gets a
small centered `plane`-style label from TEXTS instead (see below). Inside a
column, keep the canonical stacking order: the **solid infra box (h 68) on
top, the dashed owned abstraction (h 104) below it** — the eye learns "thin
solid cap = the vendor, tall dashed body = what we built on it" and reads
every column the same way.

### BOXES

```js
{ id: 'orchestrator', plane: 'domain', band: 'band-domain',
  x: 590, y: 770, w: 440, h: 110, r: 10,
  dash: true,                       // dashed = an abstraction you own
  name: 'Order Orchestrator',       // readout panel title
  about: 'Runs checkout as a saga — with compensations on failure.',  // readout
  texts: [ ['bl', 614, 798, 'Order Orchestrator'],
           ['bs', 614, 820, 'saga-based checkout: cart → payment → fulfilment'],
           ['bs', 614, 836, 'compensating steps on failure · idempotent retries'],
           ['bn', 614, 858, 'every state change published to Kafka'] ] }
```

**Ownership semantics carried by line style** — this is the heart of the
visual language: `dash: true` marks an abstraction the team owns; solid marks
swappable infrastructure or an app surface. Keep it honest per box.

**Text baselines inside a box** (text x = box.x + 20…24):

| lines | box h | baselines (offsets from box.y) |
|---|---|---|
| title + 1 body | 68 | bl +28, bs +50 |
| title + 1–2 body | 80–88 | bl +28, bs +50, bs +66 |
| title + 2 body + footnote | 104–110 | bl +26…28, bs +48…50, bs +64…66, bn +86…88 |
| hero box (5+ lines) | 150–176 | bl +28, then bs steps of 16–20, bn last |

Styles: `bl` = 13.5px bold title, `bs` = 11px body, `bn` = 10.5px italic
footnote. Body lines are 16px apart; leave ~20px before a `bn` footnote.

**Fitting text**: JetBrains Mono advances 0.6 × font-size per character, so a
`bs` line is ~6.6px/char and a `bl` title ~8.1px/char. Required box width ≥
24 (left pad) + longest line width + 12 (right pad). The validator estimates
this and errors on overflow — prefer splitting a line over widening past the
band.

### EDGES

Orthogonal polylines drawn under the boxes; the arrowhead sits at the **last**
point. `from`/`to` reference box or band ids and power the focus model (click
a box → its edges stay lit).

```js
{ from: 'orchestrator', to: 'paygw',
  pts: [[810,880],[810,994]],          // stops at the platform band border
  label: { s: 'al', x: 824, y: 952, t: 'authorize · capture' } }
```

Routing rules:

- Every segment is horizontal or vertical. Elbows are auto-rounded.
- Start ~0–6px outside the source border; end ~4–6px before the target border
  so the arrowhead touches, not stabs. An edge wired to a box may stop at the
  box's band border when it enters from another zone.
- Short neighbour-to-neighbour links are a single straight segment through the
  gap between them.
- **Long feedback/cross-cutting flows travel in the gutters** — the margins
  outside the content area (x ≈ 84–116 on the left, x ≈ 1436+ on the right).
  Route down/up the gutter with a vertical run, and label it with a rotated
  label: `label: { s:'al', x: gutterX−16, y: midY, t:'…', rot:-90, anchor:'center' }`.
- Horizontal labels sit 8–14px above/beside their line: `{ s:'al', x, y, t }`,
  optional `anchor:'right'|'center'`.
- Draw a handful of *meaningful* flows (10–20), not every possible call.

### TEXTS — title block, legend, column labels, footnotes

Fixed positions that make every diagram in this style look related:

```js
const TEXTS = [
  // title block, top-left
  { s: 'title', x: 160, y: 86,  t: 'Acme — platform architecture' },
  { s: 'sub',   x: 160, y: 118, t: 'One-line thesis of the system: ingest → process → serve' },
  { s: 'tag',   x: 160, y: 146, runs: [                 // optional multi-colour strapline
      { t: 'Api',        fill: C.sky },
      { t: ' → talks to ', fill: '#4A5462' },
      { t: 'Engine',     fill: '#C9D2DC' } ] },

  // legend captions, top-right (pair with SWATCHES/CHIPS below)
  { s: 'legend', x: 1082, y: 86,  t: 'dashed — an abstraction we own' },
  { s: 'legend', x: 1082, y: 110, t: 'solid — swappable infra & app surfaces' },
  { s: 'legend', x: 1143, y: 134, t: 'colour — the plane it belongs to' },

  // centered column labels inside a neutral multi-plane band
  { s: 'plane', x: 335, y: 1124, t: 'INTERACTION PLANE', anchor: 'center', fill: planeColor('interaction') },

  // footnotes — 1-3 invariants/notes at the bottom, 20px apart
  { s: 'bn', x: 160, y: H - 74, t: 'invariant: …' },
  { s: 'bn', x: 160, y: H - 54, t: 'first deployment: …' }
];

const SWATCHES = [
  { x: 1046, y: 75, w: 26, h: 13, stroke: '#8B93A1',   alpha: 0.8, dash: true },
  { x: 1046, y: 99, w: 26, h: 13, stroke: C.boxStroke, alpha: 1, fill: C.boxFill }
];

// One chip per plane, pipeline order, 13px apart.
const CHIPS = ['humans', 'product', 'execution']
  .map((id, i) => ({ x: 1046 + i * 13, y: 123, w: 9, h: 13, fill: planeColor(id) }));
```

Legend caption x-positions assume ~30-char captions right of the swatches at
x=1046; nudge so captions end near x=1420.

## Vertical layout math

Work top to bottom; W is fixed at 1480, H is derived.

1. **Title block** occupies y 0–160.
2. **First band** starts at y = 200.
3. Band height = 44 (header zone) + tallest box stack + 36 bottom padding.
   A single row of 80–88px boxes → band h ≈ 150–170; two rows → ≈ 300;
   a stacked pair (68px infra over 104px service + 32 gap) → ≈ 320.
4. **Gap between bands = 60–100** — more where a labelled edge passes through
   (a label needs ~24px of clear air).
5. Content x runs 160 → 1420. Full-width bands: x:160 w:1260. A band can be
   narrower (the example's product band is w:940) to leave room for a
   right-column box or gutter.
6. Boxes inside a band: first row starts at band.y + 60; side-by-side boxes
   get 20–40px gaps; center a short row rather than left-cramming it.
7. **Fill the band.** This is the single biggest fidelity lever: in the
   canonical scene a row's box widths + gaps span nearly the whole band
   (sum ≈ band.w − 80). Boxes are *generous* — 280–400 wide for normal
   components, 480+ for hero boxes, never under ~200. If a band has only two
   or three tenants, widen them (more `bs` facts per line) rather than
   leaving a runway of empty band on the right. Deliberate exceptions exist —
   a band may anchor one tenant far right so a gutter edge can reach it
   cleanly — but empty space should be a routing decision, not a leftover.
8. **Footnotes** go ~70–90px below the last band, then H = last footnote y + ~34.
9. Columns that talk to each other vertically should share an x-center so
   their connecting edges are straight drops.

## Design judgement (what makes these diagrams good)

- **Bands = layers of the pipeline, top-to-bottom in causal order**: actors on
  top, surfaces next, core abstractions in the middle, execution at the bottom.
  A reader should be able to follow the story by reading downward.
- Every box earns its place: name + 1–2 facts + (optionally) an italic
  footnote stating the *non-obvious* thing about it. Put the insight in the
  footnote, not a fourth bullet.
- `about` fields power the readout on hover/click — write them as one crisp
  sentence a newcomer would thank you for, not a repeat of the box body.
- The kicker/plate and `sub` line: distill the system into a 3–5 word
  pipeline (`browse → price → order → fulfil → learn`).
- 15–25 boxes total. If you have more components than that, merge or drop —
  this is an orientation map, not an inventory.
