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

export function reviewSwipeAction(dx: number, dy: number, revealed: boolean, allowVertical: boolean): Rating | 'reveal' | null {
  if (revealed) return swipeRating(dx, dy, allowVertical);
  return allowVertical && dy <= -76 && -dy > Math.abs(dx) * 1.35 ? 'reveal' : null;
}

export function flipAngle(dy: number): number {
  return Math.min(78, Math.max(0, -dy * 0.5));
}

export function frontDragScrolls(dy: number, scrollTop: number, maxScroll: number): boolean {
  if (maxScroll <= 24) return false;
  return dy < 0 ? scrollTop < maxScroll - 2 : dy > 0 && scrollTop > 2;
}

export function answerDragCanRateVertically(inAnswer: boolean, scrollHeight: number, clientHeight: number): boolean {
  return !inAnswer || scrollHeight <= clientHeight + 2;
}
