import assert from 'node:assert/strict';
import { test } from 'node:test';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const lockups = ['public/brand/anki-wordmark.svg', 'public/brand/anki-logo.svg', '.github/logo.svg'];
const symbols = ['public/brand/anki-symbol.svg', 'public/brand/anki-app-icon.svg', 'public/favicon.svg',
  'public/icon-180.png', 'public/icon-192.png', 'public/icon-512.png', 'public/icon-maskable-512.png'];

test('wordmark-only generation reproduces committed type B assets and preserves symbol assets', async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'anki-brand-'));
  try {
    for (const directory of ['ops/brand', 'public/brand', '.github']) {
      await mkdir(join(fixture, directory), { recursive: true });
    }
    for (const file of ['ops/generate_brand_icons.mjs', 'ops/brand/wordmark.json']) {
      await copyFile(join(root, file), join(fixture, file));
    }
    for (const file of symbols) await writeFile(join(fixture, file), `preserve:${file}`);

    const generated = spawnSync(process.execPath, [join(fixture, 'ops/generate_brand_icons.mjs'), '--wordmark-only']);
    assert.equal(generated.status, 0, generated.stderr.toString());
    for (const file of lockups) {
      assert.deepEqual(await readFile(join(fixture, file)), await readFile(join(root, file)), `${file} drifted from its source`);
    }
    for (const file of symbols) {
      assert.equal(await readFile(join(fixture, file), 'utf8'), `preserve:${file}`, `${file} was overwritten`);
    }
    const logo = await readFile(join(fixture, 'public/brand/anki-logo.svg'), 'utf8');
    assert.doesNotMatch(logo, /<(?:image|text|foreignObject)\b/);
    assert.match(logo, /fill="#B7673F"/);
    assert.match(logo, /fill="#433449"/);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
