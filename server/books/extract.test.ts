import assert from 'node:assert/strict';
import test from 'node:test';
import JSZip from 'jszip';
import { extractEpub } from './extract.ts';

test('EPUB extraction follows spine order and assigns reading locations', async () => {
  const zip = new JSZip();
  zip.file('META-INF/container.xml', '<container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>');
  zip.file('OEBPS/content.opf', '<package><manifest><item id="a" href="a.xhtml"/><item id="b" href="b.xhtml"/></manifest><spine><itemref idref="b"/><itemref idref="a"/></spine></package>');
  zip.file('OEBPS/a.xhtml', '<html><body><h1>Second section</h1><p>This is the second chapter paragraph and it has enough text to become a passage.</p></body></html>');
  zip.file('OEBPS/b.xhtml', '<html><body><h1>First section</h1><p>This is the first chapter paragraph and it has enough text to become a passage.</p></body></html>');
  const passages = await extractEpub(await zip.generateAsync({ type: 'nodebuffer' }));
  assert.equal(passages.length, 2);
  assert.deepEqual(passages.map(p => [p.location, p.section]), [[1, 'First section'], [2, 'Second section']]);
  assert.match(passages[0].text, /first chapter/);
});
