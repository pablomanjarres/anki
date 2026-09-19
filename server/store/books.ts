import type { DatabaseSync } from 'node:sqlite';
import type { Book, BookInput, Highlight, HighlightInput } from './types.ts';

type Row = Record<string, unknown>;
const bookFromRow = (row: Row): Book => ({
  id: String(row.id), title: String(row.title), currentPage: Number(row.current_page),
  author: row.author == null ? undefined : String(row.author),
  cortexBookId: row.cortex_book_id == null ? undefined : String(row.cortex_book_id),
  currentLocation: row.current_location == null ? undefined : Number(row.current_location),
  totalPages: row.total_pages == null ? undefined : Number(row.total_pages),
  filePath: row.file_path == null ? undefined : String(row.file_path),
  fileName: row.file_name == null ? undefined : String(row.file_name),
  fileType: row.file_type == null ? undefined : row.file_type as 'pdf' | 'epub',
  updatedAt: String(row.updated_at),
});

export function bookMethods(db: DatabaseSync) {
  return {
    upsertBook(input: BookInput): Book {
      if (!input.id.trim() || !input.title.trim()) throw new Error('Book ID and title are required');
      const page = input.currentPage ?? 0;
      if (!Number.isInteger(page) || page < 0 || (input.totalPages != null && page > input.totalPages)) throw new Error('Invalid reading page');
      const now = new Date().toISOString();
      db.prepare(`INSERT INTO books (id,title,current_page,total_pages,file_path,file_type,updated_at,author,cortex_book_id,current_location,file_name)
        VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,
        total_pages=COALESCE(excluded.total_pages,books.total_pages),
        file_path=COALESCE(excluded.file_path,books.file_path),
        file_type=COALESCE(excluded.file_type,books.file_type),
        author=COALESCE(excluded.author,books.author),cortex_book_id=COALESCE(excluded.cortex_book_id,books.cortex_book_id),
        current_location=COALESCE(excluded.current_location,books.current_location),
        file_name=COALESCE(excluded.file_name,books.file_name),updated_at=excluded.updated_at`).run(
        input.id, input.title, page, input.totalPages ?? null, input.filePath ?? null, input.fileType ?? null, now,
        input.author ?? null, input.cortexBookId ?? null, input.currentLocation ?? null, input.fileName ?? null,
      );
      return this.getBook(input.id)!;
    },
    getBook(id: string): Book | null {
      const row = db.prepare('SELECT * FROM books WHERE id=?').get(id) as Row | undefined;
      return row ? bookFromRow(row) : null;
    },
    deleteBook(id: string): boolean {
      return db.prepare('DELETE FROM books WHERE id=?').run(id).changes > 0;
    },
    listBooks(): Book[] {
      return (db.prepare('SELECT * FROM books ORDER BY updated_at DESC').all() as Row[]).map(bookFromRow);
    },
    setReadingProgress(bookId: string, page: number, at = new Date()): Book {
      const book = this.getBook(bookId);
      if (!book) throw new Error('Unknown book');
      if (!Number.isInteger(page) || page < 0 || (book.totalPages != null && page > book.totalPages)) throw new Error('Invalid reading page');
      db.prepare('UPDATE books SET current_page=?,updated_at=? WHERE id=?').run(page, at.toISOString(), bookId);
      return this.getBook(bookId)!;
    },
    setReadingLocation(bookId: string, location: number, at = new Date()): Book {
      if (!this.getBook(bookId)) throw new Error('Unknown book');
      if (!Number.isInteger(location) || location < 0) throw new Error('Invalid reading location');
      db.prepare('UPDATE books SET current_location=?,updated_at=? WHERE id=?').run(location, at.toISOString(), bookId);
      return this.getBook(bookId)!;
    },
    addHighlight(input: HighlightInput): Highlight {
      const book = this.getBook(input.bookId);
      if (!book) throw new Error('Unknown book');
      const pageOK = input.page != null && Number.isInteger(input.page) && input.page >= 1 && input.page <= book.currentPage;
      const locationOK = input.location != null && Number.isInteger(input.location) && input.location >= 1 && input.location <= (book.currentLocation ?? 0);
      if ((!pageOK && !locationOK) || (input.page != null && !pageOK) ||
        (input.location != null && !locationOK) || !input.text.trim()) throw new Error('Highlight must cite a read page or location');
      const value: Highlight = { ...input, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      db.prepare('INSERT INTO highlights (id,book_id,page,location,text,note,created_at) VALUES (?,?,?,?,?,?,?)').run(value.id, value.bookId, value.page ?? 0, value.location ?? null, value.text, value.note ?? null, value.createdAt);
      return value;
    },
    listHighlights(bookId: string): Highlight[] {
      return (db.prepare('SELECT * FROM highlights WHERE book_id=? ORDER BY page,location,id').all(bookId) as Row[]).map(row => ({
        id: String(row.id), bookId: String(row.book_id), page: Number(row.page) || undefined,
        location: row.location == null ? undefined : Number(row.location), text: String(row.text),
        note: row.note == null ? undefined : String(row.note), createdAt: String(row.created_at),
      }));
    },
  };
}
