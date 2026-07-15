/**
 * Lightweight, dependency-free fuzzy ranking for small lists that are already
 * loaded in memory (e.g. pick-list comboboxes, admin filters). For large,
 * server-side lists (recipes, shopping-list recommendations) the backend does
 * the ranking via Postgres pg_trgm instead — this helper is deliberately only
 * used where a per-keystroke round-trip would add latency for no memory benefit.
 *
 * Ranking, best first:
 *   1. exact match
 *   2. prefix match
 *   3. substring match
 *   4. subsequence match (characters appear in order — tolerates missing letters)
 *   5. small typo (single edit away from a substring — tolerates a wrong letter)
 * Non-matches are dropped.
 */

const SCORE_EXACT = 1000;
const SCORE_PREFIX = 500;
const SCORE_SUBSTRING = 250;
const SCORE_SUBSEQUENCE = 100;
const SCORE_TYPO = 60;
const NO_MATCH = -1;

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/** True if every char of `needle` appears in `haystack` in order (gaps allowed). */
function isSubsequence(needle: string, haystack: string): boolean {
  let i = 0;
  for (let j = 0; j < haystack.length && i < needle.length; j++) {
    if (haystack[j] === needle[i]) i++;
  }
  return i === needle.length;
}

/**
 * Optimal string alignment (Damerau) edit distance — like Levenshtein but an
 * adjacent transposition (e.g. "mlik" -> "milk", the most common typo) costs 1
 * edit rather than 2. Small strings only; uses a full matrix for clarity.
 */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));

  for (let i = 0; i < rows; i++) d[i][0] = i;
  for (let j = 0; j < cols; j++) d[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/**
 * True if `query` is within `maxEdits` of any substring of `text` of the same
 * length (so a single mistyped letter still matches). Cheap because it only
 * compares equal-length windows.
 */
function isNearSubstring(query: string, text: string, maxEdits: number): boolean {
  if (query.length > text.length) {
    return editDistance(query, text) <= maxEdits;
  }
  for (let start = 0; start + query.length <= text.length; start++) {
    const window = text.slice(start, start + query.length);
    if (editDistance(query, window) <= maxEdits) return true;
  }
  return false;
}

/** Relevance score for a single candidate; `NO_MATCH` when it should be dropped. */
export function fuzzyScore(query: string, text: string): number {
  const q = normalize(query);
  const t = normalize(text);
  if (q.length === 0) return SCORE_SUBSTRING;
  if (t === q) return SCORE_EXACT;
  if (t.startsWith(q)) return SCORE_PREFIX;
  if (t.includes(q)) return SCORE_SUBSTRING;
  if (isSubsequence(q, t)) return SCORE_SUBSEQUENCE;
  // Edit-distance (typo) matching only kicks in for queries long enough that a
  // single edit is still discriminating — for 1-3 char queries almost anything
  // is one edit away (e.g. "c" -> "kg"), which would defeat the filter.
  if (q.length >= 4) {
    const maxEdits = q.length <= 6 ? 1 : 2;
    if (isNearSubstring(q, t, maxEdits)) return SCORE_TYPO;
  }
  return NO_MATCH;
}

/**
 * Returns `items` that match `query`, ordered most-relevant first. When `query`
 * is blank every item is returned in its original order (stable).
 */
export function fuzzyRank<T>(items: T[], query: string, getText: (item: T) => string): T[] {
  const q = normalize(query);
  if (q.length === 0) return [...items];

  return items
    .map((item, index) => ({ item, index, score: fuzzyScore(q, getText(item)) }))
    .filter((entry) => entry.score !== NO_MATCH)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((entry) => entry.item);
}
