/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const entry = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const meta = (name: string) => entry.match(new RegExp(`<meta\\s+name="${name}"\\s+content="([^"]+)"`))?.[1];

test('installed iOS app extends its canvas behind the status area', () => {
  assert.equal(meta('apple-mobile-web-app-capable'), 'yes');
  assert.equal(meta('apple-mobile-web-app-status-bar-style'), 'black-translucent');
  assert.match(meta('viewport') ?? '', /(?:^|,\s*)viewport-fit=cover(?:,|$)/);
});
