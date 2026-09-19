import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promisify } from 'node:util';
import path from 'node:path';
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import { load } from 'cheerio';

const execFileAsync = promisify(execFile);
const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
export type ExtractedPassage = { id: string; text: string; page?: number; location?: number; section?: string };

function chunks(text: string, limit = 1000): string[] {
  const cleaned = text.replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (!cleaned) return [];
  const units = cleaned.split(/(?<=[.!?])\s+|\n\n+/).filter(Boolean);
  const result: string[] = [];
  let current = '';
  for (const unit of units) {
    if (current && current.length + unit.length + 1 > limit) { result.push(current); current = ''; }
    if (unit.length > limit) {
      if (current) { result.push(current); current = ''; }
      for (let i = 0; i < unit.length; i += limit) result.push(unit.slice(i, i + limit));
    } else current = current ? `${current} ${unit}` : unit;
  }
  if (current) result.push(current);
  return result;
}

function passage(text: string, locator: { page?: number; location?: number; section?: string }): ExtractedPassage {
  const id = createHash('sha256').update(JSON.stringify(locator)).update(text).digest('hex').slice(0, 20);
  return { id, text, ...locator };
}

export async function extractPdf(filePath: string): Promise<ExtractedPassage[]> {
  const { stdout } = await execFileAsync('/opt/homebrew/bin/pdftotext', ['-layout', '-enc', 'UTF-8', filePath, '-'], { maxBuffer: 80 * 1024 * 1024 });
  return stdout.split('\f').flatMap((pageText, index) => chunks(pageText).map(text => passage(text, { page: index + 1 })));
}

function asArray<T>(value: T | T[] | undefined): T[] { return value == null ? [] : Array.isArray(value) ? value : [value]; }

export async function extractEpub(bytes: Buffer): Promise<ExtractedPassage[]> {
  const zip = await JSZip.loadAsync(bytes);
  const container = await zip.file('META-INF/container.xml')?.async('string');
  if (!container) throw new Error('EPUB has no container.xml');
  const rootfiles = asArray<{ '@_full-path'?: string }>(xml.parse(container)?.container?.rootfiles?.rootfile);
  const opfPath = rootfiles[0]?.['@_full-path'];
  if (!opfPath) throw new Error('EPUB has no package path');
  const opf = await zip.file(opfPath)?.async('string');
  if (!opf) throw new Error('EPUB package is missing');
  const book = xml.parse(opf)?.package;
  const manifest = new Map<string, string>(asArray<{ '@_id'?: string; '@_href'?: string }>(book?.manifest?.item)
    .filter(item => item['@_id'] && item['@_href']).map(item => [item['@_id']!, item['@_href']!]));
  const spine = asArray<{ '@_idref'?: string }>(book?.spine?.itemref);
  const passages: ExtractedPassage[] = [];
  let location = 0;
  for (const item of spine) {
    const href = item['@_idref'] && manifest.get(item['@_idref']);
    if (!href) continue;
    const chapterPath = path.posix.normalize(path.posix.join(path.posix.dirname(opfPath), decodeURIComponent(href.split('#')[0])));
    const xhtml = await zip.file(chapterPath)?.async('string');
    if (!xhtml) continue;
    const $ = load(xhtml, { xmlMode: true });
    $('script,style,nav').remove();
    let section = path.posix.basename(chapterPath);
    $('body h1, body h2, body h3, body p, body li, body blockquote').each((_, node) => {
      const text = $(node).text().replace(/\s+/g, ' ').trim();
      if (/^h[1-3]$/.test(node.tagName)) { if (text) section = text; return; }
      if (text.length < 25) return;
      for (const part of chunks(text)) passages.push(passage(part, { location: ++location, section }));
    });
  }
  return passages;
}
