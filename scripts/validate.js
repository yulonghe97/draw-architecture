#!/usr/bin/env node
// Validates a scene.js file before it is built into the canvas template.
// Catches the layout mistakes that are hard to see without opening a browser:
// dangling ids, boxes outside their band, overlapping boxes/bands, text that
// overflows its box, non-orthogonal edges, and content outside the world.
//
// Usage: node validate.js scene.js
// Exit 0 = clean (warnings allowed), exit 1 = errors.

'use strict';
const fs = require('fs');

const scenePath = process.argv[2];
if (!scenePath) { console.error('usage: node validate.js scene.js'); process.exit(1); }
const src = fs.readFileSync(scenePath, 'utf8');

// Same palette the template fixes; scenes may reference C.* freely.
const C = {
  bg: '#0E1217', boxFill: '#161B23', boxStroke: '#2A3240',
  bandFill: 'rgba(255,255,255,0.02)', line: '#8B93A1', sky: '#7DD3FC',
  rose: '#FB7185', orange: '#F6821F', slate: '#94A3B8', ink: '#E7EAEE',
  mut: '#9AA4B2', dim: '#6E7A88', plane: '#5B6673', arrowLbl: '#98A2B0'
};

let scene;
try {
  scene = new Function('C', `
    function planeColor(id) { return (PLANES[id] || { c: C.slate }).c; }
    ${src}
    return { W, H, PLANES, BANDS, BOXES, EDGES, TEXTS, SWATCHES, CHIPS };
  `)(C);
} catch (e) {
  console.error('ERROR scene.js failed to evaluate: ' + e.message);
  console.error('The scene must define: W, H, PLANES, BANDS, BOXES, EDGES, TEXTS, SWATCHES, CHIPS');
  process.exit(1);
}

const { W, H, PLANES, BANDS, BOXES, EDGES, TEXTS } = scene;
const errors = [], warnings = [];
const err = (m) => errors.push(m);
const warn = (m) => warnings.push(m);

// Approximate JetBrains Mono advance width: 0.6em per glyph, plus letter-spacing.
const STYLE = {
  title: { size: 28, ls: 0 }, sub: { size: 14, ls: 0 }, tag: { size: 13, ls: 0 },
  hdr: { size: 11, ls: 2.5 }, tagr: { size: 10, ls: 2 }, plane: { size: 9.5, ls: 2 },
  bl: { size: 13.5, ls: 0 }, bs: { size: 11, ls: 0 }, bn: { size: 10.5, ls: 0 },
  al: { size: 10.5, ls: 0 }, legend: { size: 11, ls: 0 }
};
function textWidth(styleId, t) {
  const st = STYLE[styleId] || { size: 11, ls: 0 };
  return t.length * (st.size * 0.6 + st.ls);
}

// ---- ids -------------------------------------------------------------------
const bandIds = new Set(), boxIds = new Set();
for (const b of BANDS) {
  if (bandIds.has(b.id)) err(`duplicate band id "${b.id}"`);
  bandIds.add(b.id);
}
for (const b of BOXES) {
  if (boxIds.has(b.id)) err(`duplicate box id "${b.id}"`);
  if (bandIds.has(b.id)) err(`box id "${b.id}" collides with a band id`);
  boxIds.add(b.id);
}

// ---- planes ----------------------------------------------------------------
for (const b of BANDS) {
  if (b.plane != null && !PLANES[b.plane]) err(`band "${b.id}" references unknown plane "${b.plane}"`);
}
for (const b of BOXES) {
  if (!PLANES[b.plane]) err(`box "${b.id}" references unknown plane "${b.plane}"`);
  if (!bandIds.has(b.band)) err(`box "${b.id}" references unknown band "${b.band}"`);
  if (!b.name) warn(`box "${b.id}" has no name (readout title will be empty)`);
  if (!b.about) warn(`box "${b.id}" has no about (readout description will be empty)`);
}

// ---- composition -----------------------------------------------------------
if (BANDS.length > 6)
  warn(`${BANDS.length} bands — the canonical style uses ~5. Many thin bands make every box ` +
       `small and the poster stringy; consider merging related stages into one neutral ` +
       `multi-column band (like the canonical "platform services" band)`);

// ---- geometry: bands -------------------------------------------------------
for (const b of BANDS) {
  if (b.x < 0 || b.y < 0 || b.x + b.w > W || b.y + b.h > H)
    err(`band "${b.id}" extends outside the ${W}×${H} world`);
}
for (let i = 0; i < BANDS.length; i++) for (let j = i + 1; j < BANDS.length; j++) {
  const a = BANDS[i], b = BANDS[j];
  if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h)
    err(`bands "${a.id}" and "${b.id}" overlap`);
}

// ---- geometry: boxes -------------------------------------------------------
const boxesByBand = new Map();
for (const b of BOXES) {
  const band = BANDS.find(x => x.id === b.band);
  if (band) {
    if (b.x < band.x || b.y < band.y || b.x + b.w > band.x + band.w || b.y + b.h > band.y + band.h)
      err(`box "${b.id}" sticks out of its band "${band.id}" ` +
          `(box ${b.x},${b.y} ${b.w}×${b.h}; band ${band.x},${band.y} ${band.w}×${band.h})`);
    if (band.hdr && b.y < band.y + 44)
      warn(`box "${b.id}" starts less than 44px below its band top — may collide with the band header`);
  }
  if (!boxesByBand.has(b.band)) boxesByBand.set(b.band, []);
  boxesByBand.get(b.band).push(b);
}
for (const [, list] of boxesByBand) {
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    const a = list[i], b = list[j];
    if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h)
      err(`boxes "${a.id}" and "${b.id}" overlap`);
  }
}

// Density: generous, band-filling boxes are the style's signature. The
// canonical scene's bands sit at 37–55% area fill with no box under 200 wide.
for (const b of BOXES) {
  if (b.w < 180)
    warn(`box "${b.id}" is only ${b.w} wide — canonical boxes are 200+ (usually 280–400); ` +
         `widen it and let its text breathe`);
}
for (const band of BANDS) {
  const list = boxesByBand.get(band.id) || [];
  if (!list.length) { warn(`band "${band.id}" holds no boxes`); continue; }
  const fill = list.reduce((a, x) => a + x.w * x.h, 0) / (band.w * band.h);
  if (fill < 0.28)
    warn(`band "${band.id}" is only ${Math.round(fill * 100)}% filled by its boxes ` +
         `(canonical bands run 37–55%) — widen the boxes toward sum-of-widths ≈ band width − 80, ` +
         `or narrow the band`);
}

// ---- box texts -------------------------------------------------------------
for (const b of BOXES) {
  for (const [s, x, y, t] of b.texts || []) {
    if (!STYLE[s]) warn(`box "${b.id}" text uses unknown style "${s}"`);
    if (x < b.x || y < b.y || y > b.y + b.h)
      err(`box "${b.id}" text "${t}" positioned outside the box`);
    // The width estimate is ±5% (letter-spacing, midpoints); only hard-fail
    // when the text clearly runs past the border.
    const overflow = x + textWidth(s, t) - (b.x + b.w);
    if (overflow > 8)
      err(`box "${b.id}" text "${t}" overflows the box by ~${Math.round(overflow)}px — ` +
          `widen the box, shorten the text, or split the line`);
    else if (overflow > -4)
      warn(`box "${b.id}" text "${t}" is tight against the right border (~${Math.round(overflow)}px) — ` +
           `consider a wider box or shorter line`);
  }
  if (!b.texts || !b.texts.length) warn(`box "${b.id}" has no text lines`);
}

// ---- edges -----------------------------------------------------------------
for (const e of EDGES) {
  const known = id => boxIds.has(id) || bandIds.has(id);
  if (!known(e.from)) err(`edge ${e.from} → ${e.to}: unknown "from" id`);
  if (!known(e.to)) err(`edge ${e.from} → ${e.to}: unknown "to" id`);
  if (!e.pts || e.pts.length < 2) { err(`edge ${e.from} → ${e.to}: needs at least 2 points`); continue; }
  for (let i = 1; i < e.pts.length; i++) {
    const [x0, y0] = e.pts[i - 1], [x1, y1] = e.pts[i];
    if (x0 !== x1 && y0 !== y1)
      warn(`edge ${e.from} → ${e.to}: segment ${i} is diagonal (${x0},${y0} → ${x1},${y1}) — ` +
           `the style uses orthogonal routing`);
    if (x0 === x1 && y0 === y1)
      warn(`edge ${e.from} → ${e.to}: segment ${i} has zero length`);
  }
  for (const [x, y] of e.pts) {
    if (x < 0 || y < 0 || x > W || y > H) err(`edge ${e.from} → ${e.to}: point ${x},${y} outside world`);
  }
  // The arrow should land near (not deep inside) the target. An edge wired to
  // a box may legitimately stop at that box's band border instead, so measure
  // against whichever of the two the arrowhead is closest to.
  const targetBox = BOXES.find(b => b.id === e.to);
  const targetBand = BANDS.find(b => b.id === e.to) ||
                     (targetBox && BANDS.find(b => b.id === targetBox.band));
  const [tx, ty] = e.pts[e.pts.length - 1];
  const distTo = r => r ? Math.max(r.x - tx, tx - (r.x + r.w), r.y - ty, ty - (r.y + r.h)) : Infinity;
  const d = Math.min(distTo(targetBox), distTo(targetBand));
  if (d !== Infinity) {
    if (d > 20) warn(`edge ${e.from} → ${e.to}: arrowhead lands ${Math.round(d)}px away from the target edge`);
    if (d < -24 && distTo(targetBox) < -24)
      warn(`edge ${e.from} → ${e.to}: arrowhead lands deep inside the target — stop at its border`);
  }
}

// ---- free texts ------------------------------------------------------------
for (const t of TEXTS || []) {
  const str = t.t || (t.runs || []).map(r => r.t).join('');
  if (t.x < 0 || t.y < 0 || t.x > W || t.y > H) err(`free text "${str}" outside world`);
  if (!t.rot && !t.anchor && t.x + textWidth(t.s, str) > W)
    warn(`free text "${str}" may run past the right edge of the world`);
}

// ---- report ----------------------------------------------------------------
for (const w of warnings) console.log('WARN  ' + w);
for (const e of errors) console.log('ERROR ' + e);
console.log(`\n${BANDS.length} bands · ${BOXES.length} boxes · ${EDGES.length} edges · ` +
            `${errors.length} errors · ${warnings.length} warnings`);
process.exit(errors.length ? 1 : 0);
