import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const orange = '#B7673F';
const plum = '#433449';
const wordmarkOnly = process.argv.includes('--wordmark-only');

// The two approved tapered forms are drawn with a few intentional Bézier curves.
// These paths are the single source for the header, favicon, and install icons.
const symbol = `
  <path d="M50 269C19 253 0 215 0 172c0-39 18-74 53-94L185 10c42-21 77-12 100 20 26 36 17 87-15 113-6 5-12 9-20 13L72 250c-14 7-19 13-22 19Z"/>
  <path d="M80 263 226 185c23-13 40-13 59-5l52 23c49 22 75 57 75 105 0 62-41 97-88 97-20 0-38-4-56-13L74 285c-11-6-10-15 6-22Z"/>`;

// Approved type B: Fraunces italic 700, SOFT 40, WONK 1, optical size 48.
// These shaped outlines include the selected tracking and pair spacing.
const wordmarkShape = JSON.parse(await readFile(resolve(root, 'ops/brand/wordmark.json'), 'utf8'));
const wordmark = `<path d="${wordmarkShape.d}"/>`;

function svg(width, height, content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${content}\n</svg>\n`;
}

const symbolSvg = svg(412, 405, `<g fill="currentColor">${symbol}</g>`);
const wordmarkSvg = svg(wordmarkShape.width, wordmarkShape.height, `<g fill="${plum}">${wordmark}</g>`);
const symbolHeight = 120;
const symbolScale = symbolHeight / 405;
const wordmarkX = 412 * symbolScale + 35;
const logoWidth = wordmarkX + wordmarkShape.width;
const lockupArt = `<g fill="${orange}" transform="scale(${symbolScale})">${symbol}</g>\n<g fill="${plum}" transform="translate(${wordmarkX} 10)">${wordmark}</g>`;
const lockupSvg = svg(logoWidth, symbolHeight, lockupArt);
const readmeLogoSvg = svg(logoWidth, symbolHeight, `<rect width="${logoWidth}" height="${symbolHeight}" fill="#FFFDF9"/>\n${lockupArt}`);
const icon = (maskable = false) => svg(512, 512,
  `<rect width="512" height="512"${maskable ? '' : ' rx="102.4"'} fill="${orange}"/>\n<g fill="#FFFFFF" transform="translate(97.28 99.97669902912622) scale(0.7704854368932039)">${symbol}</g>`);

for (const [name, content] of [
  ['brand/anki-wordmark.svg', wordmarkSvg],
  ['brand/anki-logo.svg', lockupSvg],
  ...wordmarkOnly ? [] : [
    ['brand/anki-symbol.svg', symbolSvg],
    ['brand/anki-app-icon.svg', icon()],
    ['favicon.svg', icon()],
  ],
]) {
  await writeFile(resolve(root, 'public', name), content);
}
await writeFile(resolve(root, '.github/logo.svg'), readmeLogoSvg);

if (!wordmarkOnly) for (const [file, size, source] of [
  ['icon-180.png', 180, icon()],
  ['icon-192.png', 192, icon()],
  ['icon-512.png', 512, icon()],
  ['icon-maskable-512.png', 512, icon(true)],
]) {
  const rendered = spawnSync('rsvg-convert', ['--width', String(size), '--height', String(size)], {
    input: source, maxBuffer: 4 * 1024 * 1024,
  });
  if (rendered.error) throw new Error('Install librsvg to generate the brand icons.', { cause: rendered.error });
  if (rendered.status !== 0) throw new Error(rendered.stderr.toString());
  await writeFile(resolve(root, 'public', file), rendered.stdout);
}
console.log(wordmarkOnly ? 'Generated Anki type B wordmark and lockups.' : 'Generated Anki SVGs, README logo, favicon, Apple touch icon, and PWA icons.');
