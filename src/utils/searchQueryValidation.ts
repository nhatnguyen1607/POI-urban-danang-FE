export interface SearchQueryValidation {
  valid: boolean;
  query: string;
  reason: 'length' | 'content' | null;
}

export function validatePlaceSearchQuery(value: string): SearchQueryValidation {
  const query = String(value || '').trim();
  if (query.length < 3 || query.length > 160) {
    return { valid: false, query, reason: 'length' };
  }
  const compact = query.replace(/\s/gu, '');
  const meaningful = compact.match(/[\p{L}\p{N}]/gu) || [];
  const letters = compact.match(/\p{L}/gu) || [];
  const hasExcessiveSymbolRun = /[^\p{L}\p{N}\s]{3,}/u.test(query);
  const meaningfulRatio = compact.length ? meaningful.length / compact.length : 0;
  const valid = meaningful.length >= 2
    && letters.length >= 2
    && meaningfulRatio >= 0.55
    && !hasExcessiveSymbolRun;
  return { valid, query, reason: valid ? null : 'content' };
}
