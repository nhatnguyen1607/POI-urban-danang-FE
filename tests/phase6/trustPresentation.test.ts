import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
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

test('trust indicator renders expandable source and verification details', () => {
  const source = readFileSync('src/features/trust/PoiTrustIndicator.tsx', 'utf8');
  assert.match(source, /<details/);
  assert.match(source, /sourceName/);
  assert.match(source, /formatVerificationTime/);
});

test('B2B surfaces avoid investment score and recommendation semantics', () => {
  const rolePage = readFileSync('src/pages/role/RolePages.tsx', 'utf8');
  const landing = readFileSync('src/pages/landing/LandingPage.tsx', 'utf8');
  assert.doesNotMatch(rolePage, /Opportunity Score Gauge|\/ 100|candidate areas scored|recommend areas|Suggested areas|Khu vực tiềm năng|gợi ý khu vực/i);
  assert.match(rolePage, /Verification checklist|Checklist xác minh/);
  assert.doesNotMatch(landing, /Nên mở study café/);
  assert.match(landing, /Dữ liệu cần xác minh/);
});
