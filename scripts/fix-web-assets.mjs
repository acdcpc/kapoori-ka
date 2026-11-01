#!/usr/bin/env node
/**
 * fix-web-assets.mjs - post-export repair for the Expo web bundle.
 *
 * Problem this solves:
 *   `expo export -p web` emits every dependency-owned asset (the @expo/vector-icons
 *   icon fonts, React Navigation's back-arrow images, ...) under
 *   /assets/node_modules/.pnpm/<pkg>/...
 *   That path contains a dot-directory (.pnpm) plus @ and + characters, and it does
 *   not survive the trip to the static host: the files are missing on the server,
 *   _redirects turns the miss into index.html with a 200, so the browser parses HTML
 *   as a font/image. On the PWA every icon painted as an empty box and the back
 *   arrow was blank, while the Android APK looked correct.
 *
 * What it does:
 *   1. Copies each file from dist/assets/node_modules/** to a flat, clean name under
 *      dist/assets/vendor/ (content-addressed by source path so names stay unique).
 *   2. Rewrites every reference to the old URL across the exported JS/HTML/CSS.
 *   3. Deletes the undeployable tree.
 *   4. Injects @font-face rules so the icon family exists even if expo-font's async
 *      loader loses the race on a cold load.
 *
 * Exits non-zero if any reference survives.
 */
import { existsSync, readdirSync, mkdirSync, copyFileSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, basename, extname, sep } from 'node:path';
import { createHash } from 'node:crypto';

const DIST = 'dist';
const OLD_ROOT = join(DIST, 'assets', 'node_modules');
const NEW_ROOT = join(DIST, 'assets', 'vendor');
const OLD_URL_PREFIX = '/assets/node_modules/';
const NEW_URL_PREFIX = '/assets/vendor/';
const REWRITABLE = new Set(['.js', '.mjs', '.css', '.html', '.json', '.map']);
const FONT_EXT = new Set(['.ttf', '.otf', '.woff', '.woff2']);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.isFile()) out.push(p);
  }
  return out;
}

function cleanName(relPath, fileName) {
  const digest = createHash('sha1').update(relPath).digest('hex').slice(0, 10);
  const safe = fileName.replace(/[^A-Za-z0-9._-]/g, '_');
  return digest + '-' + safe;
}

function familyOf(file) {
  const stem = file.replace(/\.(ttf|otf|woff2?)$/i, '');
  return stem.split('.')[0];
}

if (!existsSync(DIST)) {
  console.error('[web-assets] dist/ not found - run `npx expo export -p web` first.');
  process.exit(1);
}
if (!existsSync(OLD_ROOT)) {
  console.log('[web-assets] no dist/assets/node_modules tree - nothing to relocate.');
  process.exit(0);
}

const files = walk(OLD_ROOT);
if (!files.length) {
  rmSync(OLD_ROOT, { recursive: true, force: true });
  console.log('[web-assets] tree was empty - removed.');
  process.exit(0);
}

mkdirSync(NEW_ROOT, { recursive: true });

const mapping = new Map();
const fonts = [];
for (const abs of files) {
  const rel = relative(OLD_ROOT, abs).split(sep).join('/');
  const oldUrl = OLD_URL_PREFIX + rel;
  const newName = cleanName(rel, basename(abs));
  const newUrl = NEW_URL_PREFIX + newName;
  copyFileSync(abs, join(NEW_ROOT, newName));
  mapping.set(oldUrl, newUrl);
  if (FONT_EXT.has(extname(abs).toLowerCase())) fonts.push({ url: newUrl, file: basename(abs) });
}

const ordered = [...mapping.entries()].sort((a, b) => b[0].length - a[0].length);
let touched = 0;
for (const abs of walk(DIST)) {
  if (abs.startsWith(OLD_ROOT + sep)) continue;
  if (!REWRITABLE.has(extname(abs).toLowerCase())) continue;
  let text = readFileSync(abs, 'utf8');
  let changed = false;
  for (const [oldUrl, newUrl] of ordered) {
    if (text.includes(oldUrl)) { text = text.split(oldUrl).join(newUrl); changed = true; }
  }
  if (changed) { writeFileSync(abs, text); touched += 1; }
}

const styleTag = fonts.length
  ? '<style id="kk-icon-fonts">' + fonts.map((f) =>
      "@font-face{font-family:'" + familyOf(f.file) + "';src:url('" + f.url + "') format('" +
      (f.file.toLowerCase().endsWith('.ttf') ? 'truetype' : 'woff2') +
      "');font-display:block;font-style:normal;font-weight:normal;}"
    ).join('') + '</style>'
  : '';

const indexPath = join(DIST, 'index.html');
if (styleTag && existsSync(indexPath)) {
  let html = readFileSync(indexPath, 'utf8');
  if (!html.includes('kk-icon-fonts')) {
    html = html.includes('</head>') ? html.replace('</head>', '  ' + styleTag + '\n</head>') : styleTag + html;
    writeFileSync(indexPath, html);
  }
}

rmSync(OLD_ROOT, { recursive: true, force: true });

let leftovers = 0;
for (const abs of walk(DIST)) {
  if (!REWRITABLE.has(extname(abs).toLowerCase())) continue;
  if (readFileSync(abs, 'utf8').includes(OLD_URL_PREFIX)) {
    console.error('[web-assets] stale reference still in ' + relative(DIST, abs));
    leftovers += 1;
  }
}

console.log('[web-assets] relocated ' + mapping.size + ' asset(s) to ' + NEW_URL_PREFIX +
  ', rewrote ' + touched + ' file(s), injected ' + fonts.length + ' @font-face rule(s).');
if (fonts.length) console.log('[web-assets] fonts: ' + fonts.map((f) => familyOf(f.file)).join(', '));
if (leftovers) process.exit(1);
