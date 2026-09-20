/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flipAngle, keyboardRating, reviewSwipeAction, swipeRating } from './reviewGesture';

test('an upward swipe reveals the question side before any rating is possible', () => {
  assert.equal(reviewSwipeAction(2, -84, false, true), 'reveal');
  assert.equal(reviewSwipeAction(2, -84, true, true), 'ez');
  assert.equal(reviewSwipeAction(-100, 0, false, true), null);
  assert.equal(reviewSwipeAction(0, 100, false, true), null);
  assert.equal(reviewSwipeAction(0, -64, false, true), null);
  assert.equal(reviewSwipeAction(78, -82, false, true), null);
});

test('the front face follows upward finger travel and stops before exposing the back', () => {
  assert.equal(flipAngle(12), 0);
  assert.equal(flipAngle(-40), 60);
  assert.equal(flipAngle(-150), 165);
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
