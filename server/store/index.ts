import { openDatabase } from './schema.ts';
import { bookMethods } from './books.ts';
import { cardMethods } from './cards.ts';
import { reviewMethods } from './reviews.ts';

export * from './types.ts';

export function openStudyStore(path = ':memory:', clock: () => Date = () => new Date()) {
  const db = openDatabase(path);
  return {
    ...bookMethods(db),
    ...cardMethods(db, clock),
    ...reviewMethods(db),
    close: () => db.close(),
  };
}

export type StudyStore = ReturnType<typeof openStudyStore>;
