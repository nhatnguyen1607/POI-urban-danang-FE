import assert from 'node:assert/strict';
import test from 'node:test';
import { trustPresentation } from '../../src/features/trust/trustPresentation.ts';

test('only fresh verified OPEN evidence is presented as verified', () => {
  assert.equal(trustPresentation({ status: 'OPEN', currentStatusVerified: true }).tone, 'positive');
  assert.notEqual(trustPresentation({ status: 'OPEN', currentStatusVerified: false }).tone, 'positive');
});

test('conflict, stale and hotel availability are transparent', () => {
  assert.equal(trustPresentation({ status: 'CONFLICT', conflict: true }).tone, 'warning');
  assert.equal(trustPresentation({ freshnessState: 'EXPIRED' }).tone, 'warning');
  assert.match(trustPresentation({ availability: { state: 'UNVERIFIED' } }).label, /Phòng trống/);
});
