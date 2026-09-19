import { DatabaseSync } from 'node:sqlite';

export function openDatabase(path: string) {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS decks (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, kind TEXT NOT NULL,
      cortex_id TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, current_page INTEGER NOT NULL DEFAULT 0,
      total_pages INTEGER, file_path TEXT, file_type TEXT, updated_at TEXT NOT NULL,
      author TEXT, cortex_book_id TEXT, current_location INTEGER, file_name TEXT
    );
    CREATE TABLE IF NOT EXISTS highlights (
      id TEXT PRIMARY KEY, book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      page INTEGER NOT NULL, text TEXT NOT NULL, note TEXT, created_at TEXT NOT NULL,
      location INTEGER
    );
    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY, deck_id TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
      type TEXT NOT NULL, front TEXT NOT NULL, back TEXT NOT NULL, cloze_text TEXT,
      source_json TEXT NOT NULL, tags_json TEXT NOT NULL, fingerprint TEXT NOT NULL UNIQUE,
      fsrs_json TEXT NOT NULL, due_at TEXT NOT NULL, eligible_on TEXT,
      review_count INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      generated_on TEXT
    );
    CREATE INDEX IF NOT EXISTS cards_due ON cards(due_at);
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT, card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
      rating TEXT NOT NULL, reviewed_at TEXT NOT NULL, local_day TEXT NOT NULL,
      previous_fsrs_json TEXT NOT NULL, previous_due_at TEXT NOT NULL,
      previous_review_count INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS reviews_day ON reviews(local_day, card_id);
    CREATE TABLE IF NOT EXISTS generation_runs (
      run_key TEXT PRIMARY KEY, date TEXT NOT NULL, status TEXT NOT NULL,
      result_json TEXT, error TEXT, created_at TEXT NOT NULL
    );
  `);
  for (const [table, column, definition] of [
    ['books', 'author', 'TEXT'], ['books', 'cortex_book_id', 'TEXT'],
    ['books', 'current_location', 'INTEGER'], ['books', 'file_name', 'TEXT'],
    ['cards', 'generated_on', 'TEXT'],
    ['highlights', 'location', 'INTEGER'],
  ]) {
    const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    if (!columns.some(item => item.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
  return db;
}
