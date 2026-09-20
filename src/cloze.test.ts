/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clozeDisplay } from './cloze';

test('hides every cloze index in a preview, including hints', () => {
  const sentence = 'A {{c1::container}} holds {{c2::components::what?}} and {{c10::code}}.';
  assert.equal(clozeDisplay(sentence, false), 'A […] holds [what?] and […].');
  assert.equal(clozeDisplay(sentence, true), 'A container holds components and code.');
});
