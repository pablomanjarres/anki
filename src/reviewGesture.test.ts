/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flipAngle, frontDragScrolls, keyboardRating, reviewSwipeAction, swipeRating } from './reviewGesture';

test('an upward swipe reveals the question side before any rating is possible', () => {
  assert.equal(reviewSwipeAction(2, -84, false, true), 'reveal');
  assert.equal(reviewSwipeAction(2, -84, true, true), 'ez');
  assert.equal(reviewSwipeAction(-100, 0, false, true), null);
  assert.equal(reviewSwipeAction(0, 100, false, true), null);
  assert.equal(reviewSwipeAction(0, -64, false, true), null);
  assert.equal(reviewSwipeAction(78, -82, false, true), null);
});

test('drag previews a tilted front without exposing the answer before release', () => {
  assert.equal(flipAngle(12), 0);
  assert.equal(flipAngle(-40), 20);
  assert.equal(flipAngle(-150), 75);
  assert.equal(flipAngle(-300), 78);
});

test('a long question scrolls to its end before an upward drag flips it', () => {
  assert.equal(frontDragScrolls(-100, 0, 600), true);
  assert.equal(frontDragScrolls(-100, 598, 600), false);
  assert.equal(frontDragScrolls(100, 598, 600), true);
  assert.equal(frontDragScrolls(-100, 0, 0), false);
  assert.equal(frontDragScrolls(-100, 0, 3), false);
});

test('four deliberate directions map to their review ratings', () => {
  assert.equal(swipeRating(-90, 2), 'again');
  assert.equal(swipeRating(2, 90), 'hard');
  assert.equal(swipeRating(90, -2), 'easy');
  assert.equal(swipeRating(-2, -90), 'ez');
});

test('short and diagonal movement never submits a rating', () => {
  assert.equal(swipeRating(70, 0), null);
  assert.equal(swipeRating(0, -70), null);
  assert.equal(swipeRating(95, 80), null);
  assert.equal(swipeRating(-80, -95), null);
});

test('scrolling content can only submit horizontal swipes', () => {
  assert.equal(swipeRating(0, 95, false), null);
  assert.equal(swipeRating(0, -95, false), null);
  assert.equal(swipeRating(-95, 0, false), 'again');
  assert.equal(swipeRating(95, 0, false), 'easy');
});

test('number keys rate cards but arrow keys stay available for scrolling', () => {
  assert.deepEqual(['1', '2', '3', '4', '5'].map(keyboardRating), ['again', 'hard', 'mid', 'easy', 'ez']);
  assert.equal(keyboardRating('ArrowUp'), null);
  assert.equal(keyboardRating('ArrowDown'), null);
});
