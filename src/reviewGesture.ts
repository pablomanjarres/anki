import type { Rating } from './api';

const numberKeyRatings: Record<string, Rating> = {
  '1': 'again', '2': 'hard', '3': 'mid', '4': 'easy', '5': 'ez',
};

export function keyboardRating(key: string): Rating | null {
  return numberKeyRatings[key] ?? null;
}

export function swipeRating(dx: number, dy: number, allowVertical = true): Rating | null {
  const horizontal = Math.abs(dx);
  const vertical = Math.abs(dy);
  const threshold = 76;
  const dominance = 1.35;
  if (horizontal < threshold && vertical < threshold) return null;
  if (horizontal > vertical * dominance) return dx < 0 ? 'again' : 'easy';
  if (allowVertical && vertical > horizontal * dominance) return dy < 0 ? 'ez' : 'hard';
  return null;
}
