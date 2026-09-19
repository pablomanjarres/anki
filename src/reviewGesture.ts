import type { Rating } from './api';

export function canStartRatingGesture(revealed: boolean, targetIsScrollableAnswer: boolean, inFlight: boolean): boolean {
  return revealed && !targetIsScrollableAnswer && !inFlight;
}

export function swipeRating(dx: number, dy: number): Rating | null {
  const horizontal = Math.abs(dx);
  const vertical = Math.abs(dy);
  const threshold = 76;
  const dominance = 1.35;
  if (horizontal < threshold && vertical < threshold) return null;
  if (horizontal > vertical * dominance) return dx < 0 ? 'again' : 'easy';
  if (vertical > horizontal * dominance) return dy < 0 ? 'ez' : 'hard';
  return null;
}
