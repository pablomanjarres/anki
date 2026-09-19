import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { extractEpub, extractPdf, type ExtractedPassage } from './extract.ts';

const MAX_BOOK_BYTES = 50 * 1024 * 1024;
function safeBookId(id: string): string {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) throw new Error('Invalid book ID');
  return id;
}

export async function saveBookFile(dataDir: string, bookId: string, fileName: string, bytes: Buffer) {
  const id = safeBookId(bookId);
  const ext = path.extname(fileName).toLowerCase();
  if (!['.pdf', '.epub'].includes(ext)) throw new Error('Use a PDF or EPUB file');
  if (!bytes.length || bytes.length > MAX_BOOK_BYTES) throw new Error('Book file must be between 1 byte and 50 MB');
  const dir = path.join(dataDir, 'books');
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const storedPath = path.join(dir, `${id}${ext}`);
  const tempPath = `${storedPath}.upload`;
  try {
    await writeFile(tempPath, bytes, { mode: 0o600 });
    const passages = ext === '.pdf' ? await extractPdf(tempPath) : await extractEpub(bytes);
    if (!passages.length) throw new Error('No selectable text was found in this book');
    await writeFile(`${storedPath}.json.upload`, JSON.stringify(passages), { mode: 0o600 });
    await rename(tempPath, storedPath);
    await rename(`${storedPath}.json.upload`, `${storedPath}.json`);
    return { fileName, storedPath, format: ext.slice(1), passages: passages.length };
  } catch (error) {
    await Promise.allSettled([rm(tempPath, { force: true }), rm(`${storedPath}.json.upload`, { force: true })]);
    throw error;
  }
}

export async function readBookPassages(dataDir: string, bookId: string): Promise<ExtractedPassage[]> {
  const id = safeBookId(bookId);
  const dir = path.join(dataDir, 'books');
  for (const ext of ['.pdf', '.epub']) {
    try { return JSON.parse(await readFile(path.join(dir, `${id}${ext}.json`), 'utf8')) as ExtractedPassage[]; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  return [];
}

export async function removeBookFile(dataDir: string, bookId: string): Promise<void> {
  const id = safeBookId(bookId);
  const dir = path.join(dataDir, 'books');
  for (const ext of ['.pdf', '.epub']) {
    await Promise.all([rm(path.join(dir, `${id}${ext}`), { force: true }), rm(path.join(dir, `${id}${ext}.json`), { force: true })]);
  }
}
