import assert from 'node:assert/strict';
import { test } from 'node:test';
import { swipeRating } from './reviewGesture';

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
