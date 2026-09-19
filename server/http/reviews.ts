import type { Hono } from 'hono';
import type { Rating, StudyStore } from '../store/index.ts';
import { object, required } from './input.ts';

const ratings = new Set<Rating>(['again', 'hard', 'mid', 'easy', 'ez']);

export function registerReviews(app: Hono, store: StudyStore) {
  app.post('/api/reviews', async c => {
    const body = object(await c.req.json());
    const cardId = required(body.cardId, 'Card ID');
    const rating = required(body.rating, 'Rating') as Rating;
    if (!ratings.has(rating)) throw new Error('Unknown rating');
    const queue = store.getDailyQueue();
    if (!queue.cards.some(card => card.id === cardId)) throw new Error('Card is not due in today’s queue');
    const result = store.gradeCard(cardId, rating);
    return c.json({ reviewId: String(result.reviewId), nextDue: result.card.dueAt });
  });
  app.post('/api/reviews/undo', async c => {
    const body = object(await c.req.json());
    const reviewId = Number(required(body.reviewId, 'Review ID'));
    if (!Number.isInteger(reviewId)) throw new Error('Invalid review ID');
    const card = store.undoLastGrade(new Date(), reviewId);
    if (!card) return c.json({ error: 'Only the latest review today can be undone' }, 409);
    return c.body(null, 204);
  });
}
