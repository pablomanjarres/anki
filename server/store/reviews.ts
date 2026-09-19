import type { DatabaseSync } from 'node:sqlite';
import { fsrs, Rating as FsrsRating, type Card as FsrsCard, type Grade } from 'ts-fsrs';
import { cardFromRow, localDay } from './cards.ts';
import type { GradeResult, Queue, Rating, ReviewEvent, StudyCard } from './types.ts';

type Row = Record<string, unknown>;
const scheduler = fsrs({ enable_fuzz: false });
const fsrsRating: Record<Rating, Grade> = {
  again: FsrsRating.Again, hard: FsrsRating.Hard, mid: FsrsRating.Good,
  easy: FsrsRating.Easy, ez: FsrsRating.Easy,
};
const toFsrs = (value: string): FsrsCard => {
  const card = JSON.parse(value) as FsrsCard;
  card.due = new Date(card.due);
  if (card.last_review) card.last_review = new Date(card.last_review);
  return card;
};
const shiftDay = (day: string, amount: number): string => {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
};
const readCard = (db: DatabaseSync, id: string): StudyCard => {
  const row = db.prepare('SELECT * FROM cards WHERE id=?').get(id) as Row | undefined;
  if (!row) throw new Error('Unknown card');
  return cardFromRow(row);
};

export function reviewMethods(db: DatabaseSync) {
  return {
    getDailyQueue(at = new Date()): Queue {
      const day = localDay(at);
      const reviewedDistinct = Number((db.prepare('SELECT count(DISTINCT card_id) AS n FROM reviews WHERE local_day=?').get(day) as Row).n);
      const remaining = Math.max(0, 30 - reviewedDistinct);
      const eligible = 'AND (eligible_on IS NULL OR eligible_on <= ?)';
      const reviewedToday = new Set((db.prepare('SELECT DISTINCT card_id FROM reviews WHERE local_day=?').all(day) as Row[]).map(row => String(row.card_id)));
      const due = db.prepare(`SELECT * FROM cards WHERE review_count>0 AND due_at<=? ${eligible} ORDER BY due_at,id`).all(at.toISOString(), day) as Row[];
      const chosenDue: StudyCard[] = [];
      const backlog: StudyCard[] = [];
      let distinctSlots = remaining;
      for (const row of due) {
        if (reviewedToday.has(String(row.id))) chosenDue.push(cardFromRow(row));
        else if (distinctSlots > 0) { chosenDue.push(cardFromRow(row)); distinctSlots--; }
        else backlog.push(cardFromRow(row));
      }
      const newReviewed = Number((db.prepare(`SELECT count(DISTINCT r.card_id) AS n FROM reviews r
        WHERE r.local_day=? AND r.previous_review_count=0`).get(day) as Row).n);
      const newAllowance = Math.max(0, Math.min(5 - newReviewed, distinctSlots));
      const fresh = db.prepare(`SELECT * FROM cards WHERE review_count=0 ${eligible} ORDER BY created_at,id LIMIT ?`).all(day, newAllowance) as Row[];
      return {
        cards: [...chosenDue, ...fresh.map(cardFromRow)], dueCount: due.length,
        backlogCount: backlog.length, newCount: fresh.length, backlog,
        reviewedDistinct, remaining, cap: 30,
      };
    },
    gradeCard(cardId: string, rating: Rating, at = new Date()): GradeResult {
      if (!(rating in fsrsRating)) throw new Error('Unknown rating');
      const day = localDay(at);
      const prior = db.prepare('SELECT * FROM cards WHERE id=?').get(cardId) as Row | undefined;
      if (!prior) throw new Error('Unknown card');
      if (prior.eligible_on && String(prior.eligible_on) > day) throw new Error('Card is not eligible yet');
      const reviewedToday = Boolean(db.prepare('SELECT id FROM reviews WHERE card_id=? AND local_day=?').get(cardId, day));
      if (reviewedToday && String(prior.due_at) > at.toISOString()) throw new Error('Card is not due yet');
      const reviewed = Number((db.prepare('SELECT count(DISTINCT card_id) AS n FROM reviews WHERE local_day=?').get(day) as Row).n);
      if (!reviewedToday && reviewed >= 30) throw new Error('Daily review limit reached');
      const next = scheduler.next(toFsrs(String(prior.fsrs_json)), at, fsrsRating[rating]).card;
      if (rating === 'ez') {
        const easyMs = next.due.getTime() - at.getTime();
        next.due = new Date(at.getTime() + Math.max(easyMs * 1.5, easyMs + 24 * 60 * 60_000));
        next.scheduled_days = Math.ceil((next.due.getTime() - at.getTime()) / 86_400_000);
      }
      let reviewId = 0;
      db.exec('BEGIN IMMEDIATE');
      try {
        const inserted = db.prepare(`INSERT INTO reviews (card_id,rating,reviewed_at,local_day,previous_fsrs_json,
          previous_due_at,previous_review_count) VALUES (?,?,?,?,?,?,?)`).run(
          cardId, rating, at.toISOString(), day, prior.fsrs_json as string,
          prior.due_at as string, Number(prior.review_count),
        );
        reviewId = Number(inserted.lastInsertRowid);
        db.prepare('UPDATE cards SET fsrs_json=?,due_at=?,review_count=review_count+1,updated_at=? WHERE id=?').run(
          JSON.stringify(next), next.due.toISOString(), at.toISOString(), cardId,
        );
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
      return { card: readCard(db, cardId), rating, reviewedAt: at.toISOString(), reviewId };
    },
    undoLastGrade(at = new Date(), reviewId?: number): StudyCard | null {
      const row = db.prepare('SELECT * FROM reviews ORDER BY id DESC LIMIT 1').get() as Row | undefined;
      if (!row || row.local_day !== localDay(at) || (reviewId != null && Number(row.id) !== reviewId)) return null;
      db.exec('BEGIN IMMEDIATE');
      try {
        db.prepare('UPDATE cards SET fsrs_json=?,due_at=?,review_count=?,updated_at=? WHERE id=?').run(
          row.previous_fsrs_json as string, row.previous_due_at as string,
          Number(row.previous_review_count), at.toISOString(), row.card_id as string,
        );
        db.prepare('DELETE FROM reviews WHERE id=?').run(Number(row.id));
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
      return readCard(db, String(row.card_id));
    },
    getReviewHistory(cardId?: string, limit = 100): ReviewEvent[] {
      const safeLimit = Math.max(1, Math.min(500, Math.trunc(limit)));
      const rows = cardId
        ? db.prepare('SELECT id,card_id,rating,reviewed_at,local_day FROM reviews WHERE card_id=? ORDER BY id DESC LIMIT ?').all(cardId, safeLimit)
        : db.prepare('SELECT id,card_id,rating,reviewed_at,local_day FROM reviews ORDER BY id DESC LIMIT ?').all(safeLimit);
      return (rows as Row[]).map(row => ({ id: Number(row.id), cardId: String(row.card_id),
        rating: row.rating as Rating, reviewedAt: String(row.reviewed_at), localDay: String(row.local_day) }));
    },
    getReviewStats(at = new Date()) {
      const day = localDay(at);
      const today = Number((db.prepare('SELECT count(DISTINCT card_id) AS n FROM reviews WHERE local_day=?').get(day) as Row).n);
      const total = Number((db.prepare('SELECT count(*) AS n FROM reviews').get() as Row).n);
      const cards = Number((db.prepare('SELECT count(*) AS n FROM cards').get() as Row).n);
      const weekStart = shiftDay(day, -6);
      const week = Number((db.prepare('SELECT count(*) AS n FROM reviews WHERE local_day BETWEEN ? AND ?').get(weekStart, day) as Row).n);
      const activeDays = new Set((db.prepare('SELECT DISTINCT local_day FROM reviews WHERE local_day<=? ORDER BY local_day DESC').all(day) as Row[]).map(row => String(row.local_day)));
      let streak = 0;
      let cursor = activeDays.has(day) ? day : shiftDay(day, -1);
      while (activeDays.has(cursor)) { streak++; cursor = shiftDay(cursor, -1); }
      const dueByDay = Array.from({ length: 7 }, (_, i) => ({ date: shiftDay(day, i), count: 0 }));
      for (const row of db.prepare('SELECT due_at FROM cards WHERE review_count>0').all() as Row[]) {
        const dueDay = localDay(new Date(String(row.due_at)));
        const index = dueDay <= day ? 0 : dueByDay.findIndex(item => item.date === dueDay);
        if (index >= 0) dueByDay[index]!.count++;
      }
      return { today, total, cards, remaining: Math.max(0, 30 - today), week, streak, dueByDay };
    },
  };
}
