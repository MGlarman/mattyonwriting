/**
 * Best-effort series detection from Open Library edition records.
 * Edition "series" fields mix real series with publisher imprints and translations, so we only
 * accept a name that at least MIN_AGREEMENT English-looking editions agree on.
 */
export type SeriesInfo = { name: string; number: number | null };
const MIN_AGREEMENT = 2;
const PUBLISHER = /\b(books?|classics?|bunko|masterworks?|windmill|puffin|ace|heyne|oscar|library|collection|club|editions?|press|penguin|vintage|pocket|paperbacks?|science fiction|sf|modern|moderni|annotated|readers?)\b/i;
// Trailing "(1)", "#1", ", Book 1", "-- pt. 1" or a bare " 1". Capped at three digits so years and catalogue numbers don't count.
const NUMBER = /(?:\b(?:book|bk|vol|v|no|pt|part)\.?\s*#?|#|\(|--\s*|\s)(\d{1,3})\)?\.?\s*$/i;

function clean(raw: string) {
  let s = raw.split(/\s--\s|\s\/\s/)[0];
  s = s.replace(/[\s,:#]*\b(?:book|bk|vol|v|no|pt|part)\.?\s*#?\d+\.?$/i, "");
  s = s.replace(/[\s,:#]*\(?#?\d+\)?\.?$/, "");
  return s.replace(/^his\s+/i, "").replace(/[\s,;:.=]+$/, "").trim();
}
const keyOf = (name: string) => name.toLowerCase().replace(/^the\s+/, "").replace(/\s+(series|cycle|trilogy|chronicles|saga|quartet|sequence|books?)$/, "").replace(/\s+/g, " ").trim();
const numberOf = (raw: string) => { const match = raw.trim().match(NUMBER); return match ? Number(match[1]) : null; };
const mostCommon = (counts: Map<string, number>) => [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)[0][0];

export function detectSeries(editions: { series?: unknown }[]): SeriesInfo | null {
  const groups = new Map<string, { forms: Map<string, number>; numbers: Map<number, number> }>();
  for (const edition of editions) {
    const seen = new Set<string>();
    for (const raw of Array.isArray(edition.series) ? edition.series : []) {
      if (typeof raw !== "string" || raw.length > 80 || !/^[\x20-\x7E]+$/.test(raw)) continue;
      for (const part of raw.split(";")) {
        const name = clean(part), key = keyOf(name);
        if (key.length < 3 || PUBLISHER.test(name) || seen.has(key)) continue;
        seen.add(key); // count each edition once per series
        const group = groups.get(key) ?? { forms: new Map<string, number>(), numbers: new Map<number, number>() };
        group.forms.set(name, (group.forms.get(name) ?? 0) + 1);
        const number = numberOf(part);
        if (number !== null) group.numbers.set(number, (group.numbers.get(number) ?? 0) + 1);
        groups.set(key, group);
      }
    }
  }
  let best: { group: { forms: Map<string, number>; numbers: Map<number, number> }; total: number } | null = null;
  for (const group of groups.values()) {
    const total = [...group.forms.values()].reduce((sum, n) => sum + n, 0);
    if (total < MIN_AGREEMENT || (best && total <= best.total)) continue;
    best = { group, total };
  }
  if (!best) return null;
  // Only trust a number that a single value wins outright; conflicting editions mean we don't know.
  const ranked = [...best.group.numbers.entries()].sort((a, b) => b[1] - a[1]);
  const number = ranked.length && (ranked.length === 1 || ranked[0][1] > ranked[1][1]) ? ranked[0][0] : null;
  return { name: mostCommon(best.group.forms), number };
}

export const formatSeries = (name: string, number: number | null) => (number === null ? name : `${name} #${number}`);

/** One numbered book in a series, as listed by Hardcover. */
export type SeriesEntry = { number: number; title: string };
export const seriesHref = (name: string) => `/series/${encodeURIComponent(name)}`;
export const searchHref = (title: string, authors: string[]) => `/search?q=${encodeURIComponent(`${title} ${authors[0] ?? ""}`.trim())}`;
/** The first entry numbered after `after`; entries are sorted by number. */
export const nextEntry = (entries: SeriesEntry[], after: number) => entries.find(entry => entry.number > after) ?? null;
