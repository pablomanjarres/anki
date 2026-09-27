import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const icon = await readFile(resolve(root, 'public/brand/anki-app-icon.svg'), 'utf8');
const maskable = icon.replace('rx="102.4" ', '');

for (const [file, size, svg] of [
  ['icon-180.png', 180, icon],
  ['icon-192.png', 192, icon],
  ['icon-512.png', 512, icon],
  ['icon-maskable-512.png', 512, maskable],
]) {
  const rendered = spawnSync('rsvg-convert', ['--width', String(size), '--height', String(size)], {
    input: svg, maxBuffer: 4 * 1024 * 1024,
  });
  if (rendered.error) throw new Error('Install librsvg to generate the brand icons.', { cause: rendered.error });
  if (rendered.status !== 0) throw new Error(rendered.stderr.toString());
  await writeFile(resolve(root, 'public', file), rendered.stdout);
}
await writeFile(resolve(root, 'public/favicon.svg'), icon);
console.log('Generated favicon, Apple touch icon, PWA icons, and a full-bleed maskable icon.');
