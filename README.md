# draw-architecture

A Claude skill that turns **any system architecture** — a codebase, an
architecture doc, or a plain-English description — into an **interactive,
explorable canvas diagram**: dark, monospaced, organized into colour-coded
planes, with pan/zoom, click-to-isolate focus, and PNG export. One
self-contained HTML file, ready to share or publish.

**▶ [Try the live demo](https://artifact.cafe/a/shoply-architecture-canvas-demo-enxjqx)** —
pan around, zoom in, click any component to isolate it and read what it does.

![Shoply e-commerce platform rendered as an architecture canvas](https://raw.githubusercontent.com/yulonghe97/draw-architecture/main/docs/shoply.png)

## What you get

Every diagram is a single `index.html` with a full viewer built in:

- **Pan / zoom / pinch** — drag to pan, scroll to zoom, cursor-anchored;
  keyboard shortcuts (`0` fit, `1` actual size, `+`/`−`, arrows, `Esc`).
- **Click-to-isolate** — click any component to dim everything unrelated,
  light up its connections, and open a readout panel describing it.
- **Shareable views** — the pan/zoom state lives in the URL hash, so you can
  link someone to an exact spot.
- **PNG export** — one click renders the full diagram at 2× to a PNG.

And a consistent visual language that makes every diagram read the same way:

- **Bands** — horizontal zones, one per architectural layer, stacked in
  causal order so the story reads top-to-bottom.
- **Ownership in line style** — dashed borders mark abstractions you own;
  solid borders mark swappable vendors, infra, and app surfaces. The
  distinction is the diagram's argument.
- **One hue per plane** — colour says where a component belongs; long
  feedback loops travel the side gutters with rotated labels.

![Meridian ML platform — closed retraining loop routed through the side gutter](https://raw.githubusercontent.com/yulonghe97/draw-architecture/main/docs/meridian.png)

Click any box to isolate it and see what it does:

![Click-to-isolate focus mode with readout panel](https://raw.githubusercontent.com/yulonghe97/draw-architecture/main/docs/focus-mode.png)

## How it works

The skill never writes viewer code. The entire viewer ships as a fixed
template ([`assets/template.html`](assets/template.html)); Claude authors only
a **scene** — pure data describing planes, bands, boxes, and edges — and two
small scripts do the rest:

```
understand the architecture → write scene.js → validate → build → (publish)
```

- [`scripts/validate.js`](scripts/validate.js) lints the layout before it's
  built: dangling references, boxes outside their band, overlaps, text
  overflow (real font metrics), diagonal edges, misplaced arrowheads, and
  composition drift (too many thin bands, under-filled bands, cramped boxes).
- [`scripts/build.js`](scripts/build.js) splices the validated scene into the
  template and emits the final `index.html`.

Because outputs share one template, every diagram you generate looks like it
came from the same design system — the model can't drift on typography,
palette, or interaction design, only on content.

## Install

```bash
npx draw-architecture
```

It asks where to put the skill — your Claude Code skills directory
(`~/.claude/skills`), a shared `~/.agents/skills` directory symlinked into
Claude Code, the current project (`./.claude/skills`), or a path you name.
Pass `--global`, `--agents`, `--project`, or `--dir <path>` to skip the
question, and `npx draw-architecture uninstall` to remove it again.

The npm package is `draw-architecture`; the skill it installs is
`architecture-canvas` — that's the name Claude matches against, and the name
of the directory on disk.

Or install it by hand — the skill is just this repo's contents:

```bash
git clone https://github.com/yulonghe97/draw-architecture.git
ln -s "$(pwd)/draw-architecture" ~/.claude/skills/architecture-canvas
```

Either way, Claude Code picks it up at the start of the next session. It
triggers on requests like:

> - "Create an interactive architecture canvas for our platform — here's how it works: …"
> - "Turn `docs/architecture.md` into an explorable diagram"
> - "Map this codebase's architecture as a canvas I can pan around"

Requirements: Node.js (for the build/validate scripts). The generated HTML
has no dependencies beyond a Google Fonts request for JetBrains Mono.

## Try it without Claude

The [live demo](https://artifact.cafe/a/shoply-architecture-canvas-demo-enxjqx)
is this repo's example, published as-is. Or open
[`examples/shoply-canvas.html`](examples/shoply-canvas.html) in a browser
locally — it's the canvas from the first screenshot, built from
[`examples/shoply-scene.js`](examples/shoply-scene.js), which doubles as the
canonical example of the scene format. To rebuild it yourself:

```bash
node scripts/build.js --scene examples/shoply-scene.js --out /tmp/demo/index.html \
  --title "Shoply — platform architecture" \
  --kicker "SHOPLY — PLATFORM ARCHITECTURE" \
  --sub "<b>browse</b> → <b>price</b> → <b>order</b> → <b>fulfil</b> → <b>learn</b>" \
  --slug shoply-architecture
```

## The scene format

A scene is ~250 lines of declarative data — nine constants (`W, H, PLANES,
BANDS, BOXES, EDGES, TEXTS, SWATCHES, CHIPS`) in world coordinates. The full
data model, layout recipe (band stacking math, text baselines, gutter
routing), and design guidance live in
[`references/scene-format.md`](references/scene-format.md).

```js
{ id: 'orchestrator', plane: 'domain', band: 'band-domain',
  x: 590, y: 770, w: 440, h: 110, r: 10,
  dash: true,                     // dashed = an abstraction you own
  name: 'Order Orchestrator',
  about: 'Runs checkout as a saga — with compensations on failure.',
  texts: [ ['bl', 614, 798, 'Order Orchestrator'],
           ['bs', 614, 820, 'saga-based checkout: cart → payment → fulfilment'],
           ['bn', 614, 858, 'every state change published to Kafka'] ] }
```

## Publishing

The skill can optionally hand the finished folder to the
[artifact.cafe](https://artifact.cafe) skill to publish a no-login review URL
reviewers can comment on. Any static host works too — the output is just a
folder with an `index.html`.

## Repository layout

```
SKILL.md                  the skill definition Claude follows
bin/cli.js                the `npx draw-architecture` installer
assets/template.html      the complete viewer (scene injected at build time)
scripts/build.js          scene + template → index.html
scripts/validate.js       layout linter for scenes
references/scene-format.md   data model + layout recipe
examples/shoply-scene.js  canonical example scene (fictional e-commerce platform)
examples/shoply-canvas.html  the built demo — open in a browser
evals/evals.json          test prompts + assertions used to develop the skill
```

## License

MIT
