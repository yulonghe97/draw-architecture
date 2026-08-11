#!/usr/bin/env node
// Assembles a canvas HTML file from the bundled template + a scene.js data file.
//
// Usage:
//   node build.js --scene scene.js --out out/index.html \
//     --title "Acme — platform architecture" \
//     --kicker "ACME — PLATFORM ARCHITECTURE" \
//     --sub "<b>ingest</b> → <b>process</b> → <b>serve</b>" \
//     --slug acme-architecture

'use strict';
const fs = require('fs');
const path = require('path');

function arg(name, fallback) {
  const i = process.argv.indexOf('--' + name);
  if (i === -1 || i === process.argv.length - 1) {
    if (fallback !== undefined) return fallback;
    console.error('missing required argument: --' + name);
    process.exit(1);
  }
  return process.argv[i + 1];
}

const scenePath = arg('scene');
const outPath = arg('out');
const title = arg('title');
const kicker = arg('kicker', title.toUpperCase());
const sub = arg('sub', '');
const slug = arg('slug', title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));

const template = fs.readFileSync(path.join(__dirname, '..', 'assets', 'template.html'), 'utf8');
const scene = fs.readFileSync(scenePath, 'utf8');

const html = template
  .replace('{{TITLE}}', title)
  .replace('{{KICKER}}', kicker)
  .replace('{{SUB_HTML}}', sub)
  .replace('{{SLUG}}', slug)
  .replace('{{SCENE}}', scene.replace(/\$/g, '$$$$'));

fs.mkdirSync(path.dirname(path.resolve(outPath)), { recursive: true });
fs.writeFileSync(outPath, html);
console.log('wrote ' + outPath + ' (' + html.length + ' bytes)');
