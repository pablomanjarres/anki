import { createHash, randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { createEmptyCard } from 'ts-fsrs';
import type { CardInput, Deck, DeckInput, GenerationRun, GenerationRunInput, Source, StudyCard, Submission, SubmissionResult } from './types.ts';

type Row = Record<string, unknown>;
const sqlCard = `SELECT id,deck_id,type,front,back,cloze_text,source_json,tags_json,due_at,review_count,created_at FROM cards`;
export const localDay = (at: Date): string => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(at);
const normalized = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();
const fingerprint = (card: CardInput) => createHash('sha256').update([
  card.deckId, normalized(card.front), card.source.type, card.source.id,
  card.source.section ?? '', card.source.page ?? '', card.source.location ?? '',
].join('|')).digest('hex');
export const cardFromRow = (row: Row): StudyCard => ({
  id: String(row.id), deckId: String(row.deck_id), type: row.type as StudyCard['type'],
  front: String(row.front), back: String(row.back),
  clozeText: row.cloze_text == null ? undefined : String(row.cloze_text),
  source: JSON.parse(String(row.source_json)) as Source,
  tags: JSON.parse(String(row.tags_json)) as string[],
  dueAt: String(row.due_at), reviewCount: Number(row.review_count), createdAt: String(row.created_at),
});

function validateSource(db: DatabaseSync, source: Source, date?: string): void {
  if (!source?.id?.trim() || !source.title?.trim()) throw new Error('A source is required');
  if (source.type === 'manual') {
    if (date || !source.section?.trim()) throw new Error('Manual source needs a locator and cannot be generated');
    return;
  }
  if (!source.excerpt?.trim()) throw new Error('A cited source passage is required');
  if (source.type === 'course') {
    if (!source.section?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(source.eligibleOn ?? '')) throw new Error('Course source needs section and eligible date');
    const eligibleDate = new Date(`${source.eligibleOn}T00:00:00Z`);
    if (Number.isNaN(eligibleDate.getTime()) || eligibleDate.toISOString().slice(0, 10) !== source.eligibleOn) throw new Error('Invalid course date');
    if (date && source.eligibleOn! > date) throw new Error('Future course passage');
  } else if (source.type === 'book') {
    const hasPage = Number.isInteger(source.page) && source.page! >= 1;
    const hasLocation = Number.isInteger(source.location) && source.location! >= 1;
    if (!hasPage && !hasLocation) throw new Error('Book source needs a page or location');
    const book = db.prepare('SELECT current_page,current_location FROM books WHERE id=?').get(source.id) as Row | undefined;
    if (!book || (hasPage && source.page! > Number(book.current_page)) ||
      (hasLocation && source.location! > Number(book.current_location))) throw new Error('Unread book passage');
  } else throw new Error('Unknown source type');
}

export function cardMethods(db: DatabaseSync) {
  function createCard(input: CardInput, date?: string): StudyCard {
    if (!db.prepare('SELECT id FROM decks WHERE id=?').get(input.deckId)) throw new Error('Unknown deck');
    if (!['basic', 'cloze'].includes(input.type) || !input.front?.trim() || !input.back?.trim()) throw new Error('Question and answer required');
    if (input.type === 'cloze' && !input.clozeText?.includes('{{c')) throw new Error('Cloze notation required');
    validateSource(db, input.source, date);
    const hash = fingerprint(input);
    const prior = db.prepare(`${sqlCard} WHERE fingerprint=?`).get(hash) as Row | undefined;
    if (prior) return cardFromRow(prior);
    const id = randomUUID();
    const now = new Date().toISOString();
    const state = createEmptyCard(new Date());
    db.prepare(`INSERT INTO cards (id,deck_id,type,front,back,cloze_text,source_json,tags_json,fingerprint,
      fsrs_json,due_at,eligible_on,created_at,updated_at,generated_on) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      id, input.deckId, input.type, input.front.trim(), input.back.trim(), input.clozeText ?? null,
      JSON.stringify(input.source), JSON.stringify(input.tags ?? []), hash,
      JSON.stringify(state), state.due.toISOString(), input.source.eligibleOn ?? null, now, now, date ?? null,
    );
    return cardFromRow(db.prepare(`${sqlCard} WHERE id=?`).get(id) as Row);
  }
  function getRun(runKey: string): GenerationRun | null {
    const row = db.prepare('SELECT * FROM generation_runs WHERE run_key=?').get(runKey) as Row | undefined;
    return row ? { runKey: String(row.run_key), date: String(row.date), status: row.status as GenerationRun['status'],
      result: row.result_json ? JSON.parse(String(row.result_json)) as SubmissionResult : undefined,
      error: row.error == null ? undefined : String(row.error), createdAt: String(row.created_at) } : null;
  }
  return {
    createDeck(input: DeckInput): Deck {
      if (!input.name.trim()) throw new Error('Deck name required');
      const deck: Deck = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
      db.prepare('INSERT INTO decks (id,name,kind,cortex_id,created_at) VALUES (?,?,?,?,?)').run(deck.id, deck.name, deck.kind, deck.cortexId ?? null, deck.createdAt);
      return deck;
    },
    listDecks(): Deck[] {
      return (db.prepare('SELECT * FROM decks ORDER BY name').all() as Row[]).map(row => ({
        id: String(row.id), name: String(row.name), kind: row.kind as Deck['kind'],
        cortexId: row.cortex_id == null ? undefined : String(row.cortex_id), createdAt: String(row.created_at),
      }));
    },
    updateDeck(id: string, patch: Partial<DeckInput>): Deck {
      const row = db.prepare('SELECT * FROM decks WHERE id=?').get(id) as Row | undefined;
      if (!row) throw new Error('Unknown deck');
      const next = { name: patch.name ?? String(row.name), kind: patch.kind ?? String(row.kind), cortexId: patch.cortexId ?? (row.cortex_id == null ? null : String(row.cortex_id)) };
      if (!next.name.trim()) throw new Error('Deck name required');
      db.prepare('UPDATE decks SET name=?,kind=?,cortex_id=? WHERE id=?').run(next.name, next.kind, next.cortexId ?? null, id);
      return { id, name: next.name, kind: next.kind as Deck['kind'], cortexId: next.cortexId == null ? undefined : String(next.cortexId), createdAt: String(row.created_at) };
    },
    deleteDeck(id: string): boolean {
      return db.prepare('DELETE FROM decks WHERE id=?').run(id).changes > 0;
    },
    createCard,
    getCard(id: string): StudyCard | null {
      const row = db.prepare(`${sqlCard} WHERE id=?`).get(id) as Row | undefined;
      return row ? cardFromRow(row) : null;
    },
    listCards(deckId?: string): StudyCard[] {
      const rows = deckId
        ? db.prepare(`${sqlCard} WHERE deck_id=? ORDER BY created_at DESC`).all(deckId)
        : db.prepare(`${sqlCard} ORDER BY created_at DESC`).all();
      return (rows as Row[]).map(cardFromRow);
    },
    updateCard(id: string, patch: Partial<CardInput>): StudyCard {
      const row = db.prepare('SELECT * FROM cards WHERE id=?').get(id) as Row | undefined;
      if (!row) throw new Error('Unknown card');
      const prior = cardFromRow(row);
      const next: CardInput = {
        deckId: patch.deckId ?? prior.deckId, type: patch.type ?? prior.type,
        front: patch.front ?? prior.front, back: patch.back ?? prior.back,
        clozeText: patch.clozeText ?? prior.clozeText, source: patch.source ?? prior.source,
        tags: patch.tags ?? prior.tags,
      };
      if (!db.prepare('SELECT id FROM decks WHERE id=?').get(next.deckId)) throw new Error('Unknown deck');
      if (!next.front.trim() || !next.back.trim()) throw new Error('Question and answer required');
      if (next.type === 'cloze' && !next.clozeText?.includes('{{c')) throw new Error('Cloze notation required');
      validateSource(db, next.source);
      db.prepare(`UPDATE cards SET deck_id=?,type=?,front=?,back=?,cloze_text=?,source_json=?,tags_json=?,
        fingerprint=?,eligible_on=?,updated_at=? WHERE id=?`).run(next.deckId, next.type, next.front.trim(),
        next.back.trim(), next.clozeText ?? null, JSON.stringify(next.source), JSON.stringify(next.tags ?? []),
        fingerprint(next), next.source.eligibleOn ?? null, new Date().toISOString(), id);
      return cardFromRow(db.prepare(`${sqlCard} WHERE id=?`).get(id) as Row);
    },
    deleteCard(id: string): boolean {
      return db.prepare('DELETE FROM cards WHERE id=?').run(id).changes > 0;
    },
    searchCards(query: string): StudyCard[] {
      const like = `%${query.replace(/[\\%_]/g, '\\$&')}%`;
      return (db.prepare(`${sqlCard} WHERE front LIKE ? ESCAPE '\\' OR back LIKE ? ESCAPE '\\' ORDER BY created_at DESC LIMIT 100`).all(like, like) as Row[]).map(cardFromRow);
    },
    submitGeneratedCards(input: Submission, at = new Date()): SubmissionResult {
      const prior = getRun(input.runKey);
      if (prior?.result) return prior.result;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error('Invalid generation date');
      if (input.date > localDay(at)) throw new Error('Future generation date');
      const result: SubmissionResult = { created: 0, duplicates: 0, rejected: 0, paused: false, cardIds: [] };
      db.exec('BEGIN IMMEDIATE');
      try {
        for (const card of input.cards) {
          const pool = (db.prepare('SELECT count(*) AS n FROM cards WHERE review_count=0').get() as { n: number }).n;
          const generatedToday = (db.prepare('SELECT count(*) AS n FROM cards WHERE generated_on=?').get(input.date) as { n: number }).n;
          if (pool >= 30 || generatedToday >= 5) { result.paused = true; break; }
          try {
            const hash = fingerprint(card);
            if (db.prepare('SELECT id FROM cards WHERE fingerprint=?').get(hash)) { result.duplicates++; continue; }
            const created = createCard(card, input.date);
            result.created++;
            result.cardIds.push(created.id);
          } catch { result.rejected++; }
        }
        db.prepare('INSERT INTO generation_runs (run_key,date,status,result_json,created_at) VALUES (?,?,?,?,?)').run(
          input.runKey, input.date, result.created ? 'success' : 'zero', JSON.stringify(result), new Date().toISOString(),
        );
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
      return result;
    },
    recordGenerationRun(input: GenerationRunInput): GenerationRun {
      db.prepare(`INSERT INTO generation_runs (run_key,date,status,result_json,error,created_at) VALUES (?,?,?,?,?,?)
        ON CONFLICT(run_key) DO UPDATE SET status=excluded.status,result_json=excluded.result_json,error=excluded.error`).run(
        input.runKey, input.date, input.status, input.result ? JSON.stringify(input.result) : null,
        input.error ?? null, new Date().toISOString(),
      );
      return getRun(input.runKey)!;
    },
    getGenerationRun: getRun,
  };
}
