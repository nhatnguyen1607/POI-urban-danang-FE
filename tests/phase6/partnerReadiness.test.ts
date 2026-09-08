import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import {
  availabilityPresentation,
  safePartnerHandoffUrl,
} from '../../src/features/trust/trustPresentation.ts';

test('accommodation availability is explicit for verified, stale, conflict and unverified states', () => {
  assert.match(availabilityPresentation({ availability: { state: 'AVAILABLE', observedAt: '2026-09-08T08:00:00Z' } })?.label || '', /Còn phòng theo đối tác/);
  assert.match(availabilityPresentation({ availability: { state: 'UNVERIFIED' } })?.label || '', /Chưa xác minh/);
  assert.match(availabilityPresentation({ availability: { state: 'STALE' } })?.label || '', /có thể đã thay đổi/);
  assert.match(availabilityPresentation({ availability: { state: 'CONFLICT' } })?.label || '', /chưa thống nhất/);
});

test('frontend accepts only approved HTTPS partner handoff domains', () => {
  assert.equal(safePartnerHandoffUrl('javascript:alert(1)'), null);
  assert.equal(safePartnerHandoffUrl('data:text/plain,no'), null);
  assert.equal(safePartnerHandoffUrl('https://attacker.example/redirect'), null);
  assert.match(safePartnerHandoffUrl('https://secure.booking.com/hotel/verified') || '', /^https:\/\/secure\.booking\.com\//);
});

test('partner UI omits unsafe handoff and communicates external responsibility', () => {
  const source = readFileSync('src/features/trust/PartnerAvailability.tsx', 'utf8');
  assert.match(source, /safePartnerHandoffUrl/);
  assert.match(source, /UrbanAgent chưa xác minh tình trạng phòng trống|Kiểm tra trực tiếp trên nhà cung cấp/);
  assert.match(source, /thanh toán và hủy dịch vụ/);
});

test('text-only feedback path remains available and media billing behavior is untouched', () => {
  const service = readFileSync('src/services/poiExperienceService.ts', 'utf8');
  assert.match(service, /imageFiles\.length\s*\?\s*await uploadReviewImages/);
  assert.match(service, /uploads:\s*\[\]/);
  assert.match(service, /await setDoc\(reviewRef, payload\)/);
});

test('B2B evidence-only semantics remain free of investment advice', () => {
  const rolePage = readFileSync('src/pages/role/RolePages.tsx', 'utf8');
  assert.doesNotMatch(rolePage, /investment score|best place to invest|nên đầu tư|nên mở/i);
});
