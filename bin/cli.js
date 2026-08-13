#!/usr/bin/env node
// draw-architecture — installs the architecture-canvas skill into an agent
// skills directory.
//
// The npm package is named after the repo (draw-architecture); the skill it
// installs is named architecture-canvas, which is what SKILL.md declares and
// what the directory on disk must be called.
//
// Zero dependencies on purpose: npx should be a fast cold start.

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const VERSION = require('../package.json').version;
const ROOT = path.join(__dirname, '..');
const SKILL = 'architecture-canvas';
const MARKER = '.draw-architecture.json';

// Everything the skill needs at runtime. build.js resolves the template as
// __dirname/../assets/template.html, so scripts/ and assets/ must stay
// siblings — copying whole top-level entries preserves that.
const PAYLOAD = [
  { name: 'SKILL.md', required: true },
  { name: 'assets', required: true },
  { name: 'scripts', required: true },
  { name: 'references', required: true },
  { name: 'examples', required: false }
];

const claudeSkills = () => path.join(os.homedir(), '.claude', 'skills');
const agentSkills = () => path.join(os.homedir(), '.agents', 'skills');
const projectSkills = () => path.join(process.cwd(), '.claude', 'skills');

const TARGETS = {
  global: { label: 'Claude Code (global)', parent: claudeSkills },
  agents: { label: 'Shared agent skills', parent: agentSkills },
  project: { label: 'This project', parent: projectSkills }
};

// ---- small helpers ---------------------------------------------------------

function die(msg) {
  console.error('error: ' + msg);
  process.exit(1);
}

function tilde(p) {
  const home = os.homedir();
  return p === home || p.startsWith(home + path.sep) ? '~' + p.slice(home.length) : p;
}

let _rl = null;
function rl() {
  if (!_rl) {
    _rl = require('node:readline/promises').createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }
  return _rl;
}
function closeRl() {
  if (_rl) { _rl.close(); _rl = null; }
}

// Returned instead of an answer when stdin closes mid-prompt (Ctrl-D). The
// promise from readline's question() never settles in that case, so race it
// against the interface's own close event.
const ABORTED = Symbol('aborted');

function ask(question) {
  const iface = rl();
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      iface.off('close', onClose);
      resolve(value);
    };
    const onClose = () => finish(ABORTED);
    iface.once('close', onClose);
    iface.question(question).then(
      (answer) => finish(typeof answer === 'string' ? answer.trim() : ABORTED),
      () => finish(ABORTED)
    );
  });
}

function cancel() {
  console.log('\ncancelled');
  closeRl();
  process.exit(1);
}

async function confirm(question, assumeYes) {
  if (assumeYes) return true;
  if (!process.stdin.isTTY) return false;
  const answer = await ask(question + ' [y/N] ');
  if (answer === ABORTED) return false;
  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

// ---- inspecting an install site --------------------------------------------

// Classifies whatever currently sits at `dest`, so we never delete a directory
// we can't positively identify as this skill.
//
//   none        nothing there
//   broken      a dangling symlink — safe to replace
//   ours        installed by this CLI (has our marker file)
//   skill       a hand-installed architecture-canvas (SKILL.md matches)
//   foreign     something else — leave it alone
function inspect(dest) {
  let stat;
  try {
    stat = fs.lstatSync(dest);
  } catch {
    return { kind: 'none' };
  }
  const symlink = stat.isSymbolicLink();
  if (symlink && !fs.existsSync(dest)) return { kind: 'broken', symlink };

  try {
    const marker = JSON.parse(fs.readFileSync(path.join(dest, MARKER), 'utf8'));
    if (marker && marker.skill === SKILL) {
      return { kind: 'ours', version: marker.version, mode: marker.mode, symlink };
    }
  } catch { /* fall through */ }

  try {
    const skillMd = fs.readFileSync(path.join(dest, 'SKILL.md'), 'utf8');
    if (/^name:[ \t]*architecture-canvas[ \t]*$/m.test(skillMd)) return { kind: 'skill', symlink };
  } catch { /* fall through */ }

  return { kind: 'foreign', symlink };
}

function remove(dest) {
  const stat = fs.lstatSync(dest);
  if (stat.isSymbolicLink() || stat.isFile()) fs.unlinkSync(dest);
  else fs.rmSync(dest, { recursive: true, force: true });
}

// Asks for permission to replace whatever is at `dest`. Returns false when the
// caller should skip this location.
async function clearSite(dest, { force, assumeYes }) {
  const found = inspect(dest);

  if (found.kind === 'none') return true;

  if (found.kind === 'foreign') {
    if (!force) {
      console.error(`error: ${tilde(dest)} exists but is not an architecture-canvas skill.`);
      console.error('       Pass --force to overwrite it, or pick another location.');
      return false;
    }
    if (!(await confirm(`  overwrite ${tilde(dest)} (unrecognised contents)?`, assumeYes))) return false;
  } else if (found.kind === 'ours') {
    const what = found.version === VERSION
      ? `reinstalling ${VERSION}`
      : `upgrading ${found.version} → ${VERSION}`;
    console.log(`  found an existing install at ${tilde(dest)} — ${what}`);
    if (!(await confirm('  replace it?', assumeYes || force))) return false;
  } else if (found.kind === 'skill') {
    console.log(`  found a hand-installed architecture-canvas at ${tilde(dest)}`);
    if (!(await confirm('  replace it?', assumeYes || force))) return false;
  }
  // 'broken' — a dangling symlink, replace silently

  remove(dest);
  return true;
}

// ---- install ---------------------------------------------------------------

function copyPayload(dest, mode) {
  fs.mkdirSync(dest, { recursive: true });
  for (const item of PAYLOAD) {
    const src = path.join(ROOT, item.name);
    if (!fs.existsSync(src)) {
      if (item.required) die(`package is incomplete — ${item.name} is missing from ${ROOT}`);
      continue;
    }
    fs.cpSync(src, path.join(dest, item.name), { recursive: true });
  }
  fs.writeFileSync(
    path.join(dest, MARKER),
    JSON.stringify(
      { skill: SKILL, package: 'draw-architecture', version: VERSION, mode, installedAt: new Date().toISOString() },
      null,
      2
    ) + '\n'
  );
}

// Mirrors the shared-skills convention: the real directory lives under
// ~/.agents/skills and each agent gets a relative symlink to it.
async function linkIntoClaude(realDest, opts) {
  const parent = claudeSkills();
  const link = path.join(parent, SKILL);
  fs.mkdirSync(parent, { recursive: true });

  const found = inspect(link);
  if (found.symlink && found.kind !== 'broken') {
    try {
      if (fs.realpathSync(link) === fs.realpathSync(realDest)) {
        console.log(`  ✓ already linked from ${tilde(link)}`);
        return;
      }
    } catch { /* fall through to the normal replace path */ }
  }

  if (!(await clearSite(link, opts))) {
    console.warn(`  ! left ${tilde(link)} alone — Claude Code will not see this skill`);
    return;
  }

  const rel = path.relative(parent, realDest);
  try {
    fs.symlinkSync(rel, link, 'dir');
    console.log(`  ✓ linked ${tilde(link)} → ${rel}`);
  } catch (e) {
    // Windows without developer mode, or a filesystem that refuses symlinks.
    console.warn(`  ! symlink failed (${e.code || e.message}) — copying instead`);
    copyPayload(link, 'agents-copy');
    console.log(`  ✓ copied to ${tilde(link)}`);
  }
}

function menu() {
  console.log(`\ndraw-architecture v${VERSION} — install the ${SKILL} skill\n`);
  console.log(`  1) ${TARGETS.global.label.padEnd(22)} ${tilde(path.join(claudeSkills(), SKILL))}`);
  console.log(`  2) ${TARGETS.agents.label.padEnd(22)} ${tilde(path.join(agentSkills(), SKILL))}`);
  console.log(`     ${''.padEnd(22)} + symlink into ${tilde(claudeSkills())}`);
  console.log(`  3) ${TARGETS.project.label.padEnd(22)} ${path.join('.claude', 'skills', SKILL)}`);
  console.log('  4) Custom path…');
  console.log('');
}

async function promptTarget() {
  menu();
  for (;;) {
    const answer = await ask('  select [1]: ');
    if (answer === ABORTED) cancel();

    const choice = answer || '1';
    if (choice === '1') return { mode: 'global', parent: claudeSkills() };
    if (choice === '2') return { mode: 'agents', parent: agentSkills() };
    if (choice === '3') return { mode: 'project', parent: projectSkills() };
    if (choice === '4') {
      const dir = await ask(`  skills directory (the skill goes into <dir>/${SKILL}): `);
      if (dir === ABORTED) cancel();
      if (dir) return { mode: 'custom', parent: path.resolve(dir) };
      console.log('  a path is required');
      continue;
    }
    console.log('  please enter 1, 2, 3 or 4');
  }
}

async function install(opts) {
  let mode = opts.target;
  let parent;

  if (!mode) {
    if (process.stdin.isTTY && !opts.yes) {
      ({ mode, parent } = await promptTarget());
    } else {
      mode = 'global';
      console.log(`no target given and not a TTY — installing to ${tilde(claudeSkills())}`);
    }
  }
  if (!parent) {
    parent = mode === 'custom' ? path.resolve(opts.dir) : TARGETS[mode].parent();
  }

  const dest = path.join(parent, SKILL);
  const gate = { force: opts.force, assumeYes: opts.yes || opts.force };

  console.log('');
  if (!(await clearSite(dest, gate))) process.exit(1);

  copyPayload(dest, mode);
  console.log(`  ✓ installed ${SKILL} ${VERSION}`);
  console.log(`    ${tilde(dest)}`);

  if (mode === 'agents') await linkIntoClaude(dest, gate);

  console.log('\nStart a new Claude Code session (skills are discovered at startup), then ask for');
  console.log('an architecture canvas — e.g. "turn docs/architecture.md into an explorable diagram".\n');
}

// ---- uninstall -------------------------------------------------------------

async function uninstall(opts) {
  const parents = opts.target
    ? [opts.target === 'custom' ? path.resolve(opts.dir) : TARGETS[opts.target].parent()]
    : [claudeSkills(), agentSkills(), projectSkills()];

  const found = [];
  const skipped = [];
  for (const parent of [...new Set(parents)]) {
    const dest = path.join(parent, SKILL);
    const info = inspect(dest);
    if (info.kind === 'ours' || info.kind === 'skill' || info.kind === 'broken') found.push({ dest, info });
    else if (info.kind === 'foreign') skipped.push(dest);
  }

  for (const dest of skipped) {
    console.warn(`! ${tilde(dest)} is not an architecture-canvas skill — leaving it alone`);
  }

  if (!found.length) {
    console.log(`no ${SKILL} install found${opts.target ? '' : ' in the standard locations'}`);
    return;
  }

  console.log('\nwill remove:');
  for (const { dest, info } of found) {
    console.log(`  ${tilde(dest)}${info.symlink ? ' (symlink)' : ''}`);
  }
  console.log('');

  if (!(await confirm('remove these?', opts.yes || opts.force))) {
    console.log('cancelled');
    return;
  }

  // Symlinks first, so removing a real directory never leaves a dangling link
  // behind if something fails partway through.
  found.sort((a, b) => Number(b.info.symlink) - Number(a.info.symlink));
  for (const { dest } of found) {
    remove(dest);
    console.log(`  ✓ removed ${tilde(dest)}`);
  }
  console.log('');
}

// ---- cli -------------------------------------------------------------------

const HELP = `draw-architecture v${VERSION}

  Installs the ${SKILL} skill — turns any system architecture into an
  interactive, pannable/zoomable canvas diagram.

Usage
  npx draw-architecture [command] [options]

Commands
  install          install the skill (default)
  uninstall        remove an installed skill

Options
  --global         install to ${tilde(claudeSkills())}
  --agents         install to ${tilde(agentSkills())}, symlinked into ${tilde(claudeSkills())}
  --project        install to ./.claude/skills
  --dir <path>     install into <path>/${SKILL}
  -f, --force      overwrite without asking
  -y, --yes        assume yes; never prompt
  -v, --version    print the version
  -h, --help       print this help

With no target flag on a TTY, install asks where to put the skill.
`;

function parseArgs(argv) {
  const opts = { command: 'install', target: null, dir: null, force: false, yes: false };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === 'install' || a === 'uninstall') opts.command = a;
    else if (a === '--global') opts.target = 'global';
    else if (a === '--agents') opts.target = 'agents';
    else if (a === '--project') opts.target = 'project';
    else if (a === '--dir' || a.startsWith('--dir=')) {
      const value = a.startsWith('--dir=') ? a.slice('--dir='.length) : argv[++i];
      if (!value) die('--dir requires a path');
      opts.target = 'custom';
      opts.dir = value;
    } else if (a === '-f' || a === '--force') opts.force = true;
    else if (a === '-y' || a === '--yes') opts.yes = true;
    else if (a === '-h' || a === '--help') opts.command = 'help';
    else if (a === '-v' || a === '--version') opts.command = 'version';
    else die(`unknown argument: ${a}\nrun with --help to see the available options`);
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.command === 'help') return void process.stdout.write(HELP);
  if (opts.command === 'version') return void console.log(VERSION);
  if (opts.command === 'uninstall') return uninstall(opts);
  return install(opts);
}

main()
  .then(() => closeRl())
  .catch((e) => {
    closeRl();
    die(e && e.message ? e.message : String(e));
  });
