import { writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const orange = '#B7673F';
const plum = '#433449';

// The two approved tapered forms are drawn with a few intentional Bézier curves.
// These paths are the single source for the header, favicon, and install icons.
const symbol = `
  <path d="M50 269C19 253 0 215 0 172c0-39 18-74 53-94L185 10c42-21 77-12 100 20 26 36 17 87-15 113-6 5-12 9-20 13L72 250c-14 7-19 13-22 19Z"/>
  <path d="M80 263 226 185c23-13 40-13 59-5l52 23c49 22 75 57 75 105 0 62-41 97-88 97-20 0-38-4-56-13L74 285c-11-6-10-15 6-22Z"/>`;

// Outlined, geometric lettering keeps the approved rounded italic rhythm.
// The counter in the a is a deliberate negative shape, not an image trace.
const wordmark = `
  <path fill-rule="evenodd" d="M284 84c-1 39-17 65-43 81 18 11 24 27 22 49l-6 48c-3 16 3 22 13 16l24-27 44 20c-19 34-49 45-85 45h-33c-31 0-44-11-48-39-24 27-55 39-96 39-48 0-76-30-76-75 0-61 40-108 103-132 46-17 81-12 111-6 23 4 50-3 74-19ZM179 170c-18-8-49 1-72 20-22 18-35 41-32 54 2 11 19 12 38 6 37-13 68-50 66-80Z"/>
  <path d="M305 128c9-21 28-29 51-27 28 2 42 16 45 43 26-30 53-44 90-44 50 0 78 31 72 79l-17 84c-3 15 2 23 13 19l35-61 28 39c-28 45-52 56-102 56-50 0-69-23-62-68l10-54c6-31 1-42-15-43-25-2-48 22-58 58l-17 61c-9 33-34 46-76 46h-56c27-20 36-43 43-75l16-113Z"/>
  <path d="M537 262c4 20 14 29 28 29 14 0 26-13 34-31l18-41 24 26-17 37c-12 27-35 34-65 34h-45l-19-30Z"/>
  <path d="M649 1c19-2 42-1 55 5 7 3 9 10 7 20l-35 159c22-11 41-35 62-62 17-22 38-24 67-24h27c18 0 25 11 18 24-24 34-67 65-113 86 26 5 41 19 58 40 21 26 35 35 50 38 12 3 9 14-8 21-38 18-73 10-96-18l-62-76c-13 60-34 86-75 97-38 10-67 4-83-17l24-41c19 25 33 27 43 8 15-29 33-145 44-202 7-38 11-56 17-58Z"/>
  <path d="M902 16c29-7 63-2 75 12 12 14 5 34-10 44-22 15-67 16-86 4-24-16-11-52 21-60Z"/>
  <path d="M918 101c36-4 56 8 50 39l-27 125c-8 37-34 52-69 51-33-1-38-20-30-55l27-120c6-25 23-37 49-40Z"/>`;

function svg(width, height, content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${content}\n</svg>\n`;
}

const symbolSvg = svg(412, 405, `<g fill="currentColor">${symbol}</g>`);
const wordmarkSvg = svg(982, 316, `<g fill="${plum}">${wordmark}</g>`);
const lockupSvg = svg(1398, 320,
  `<g fill="${orange}" transform="scale(0.7901234567901234)">${symbol}</g>\n<g fill="${plum}" transform="translate(416 2)">${wordmark}</g>`);
const icon = (maskable = false) => svg(512, 512,
  `<rect width="512" height="512"${maskable ? '' : ' rx="102.4"'} fill="${orange}"/>\n<g fill="#FFFFFF" transform="translate(97.28 99.97669902912622) scale(0.7704854368932039)">${symbol}</g>`);

for (const [name, content] of [
  ['brand/anki-symbol.svg', symbolSvg],
  ['brand/anki-wordmark.svg', wordmarkSvg],
  ['brand/anki-logo.svg', lockupSvg],
  ['brand/anki-app-icon.svg', icon()],
  ['favicon.svg', icon()],
]) {
  await writeFile(resolve(root, 'public', name), content);
}

for (const [file, size, source] of [
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
console.log('Generated geometric Anki SVGs, favicon, Apple touch icon, and PWA icons.');
