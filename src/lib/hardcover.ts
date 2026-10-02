import { z } from "zod";
import type { SeriesEntry, SeriesInfo } from "./series";

const ENDPOINT = "https://api.hardcover.app/v1/graphql";
const BOOK_QUERY = `query BookSeries($title: String!) {
  books(where: { title: { _eq: $title } }, order_by: { users_count: desc }, limit: 10) {
    cached_contributors
    book_series { position series { name } }
  }
}`;
// Translations, box sets and "(1 of 2)" splits all carry decimal or duplicate positions, so only whole numbers are kept.
const SERIES_QUERY = `query SeriesBooks($name: String!) {
  series(where: { name: { _eq: $name } }, order_by: { books_count: desc }, limit: 3) {
    author { name }
    book_series(order_by: { position: asc }, where: { position: { _gte: 1 }, book: { canonical_id: { _is_null: true }, compilation: { _eq: false } } }) {
      position book { title users_count }
    }
  }
}`;
const bookResponse = z.object({
  data: z.object({
    books: z.array(z.object({
      cached_contributors: z.unknown(),
      book_series: z.array(z.object({ position: z.number().nullable(), series: z.object({ name: z.string() }).nullable() })),
    })),
  }),
});
const seriesResponse = z.object({
  data: z.object({
    series: z.array(z.object({
      author: z.object({ name: z.string() }).nullable(),
      book_series: z.array(z.object({ position: z.number().nullable(), book: z.object({ title: z.string(), users_count: z.number().nullable() }).nullable() })),
    })),
  }),
});
const norm = (name: string) => name.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

function contributorNames(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap(entry => {
    const name = (entry as { author?: { name?: unknown } } | null)?.author?.name;
    return typeof name === "string" ? [norm(name)] : [];
  });
}

/** Returns the parsed JSON body, or null on a missing token, HTTP error, timeout or network failure. */
async function request(query: string, variables: Record<string, string>, cache: { cache?: "no-store"; next?: { revalidate: number } }) {
  const token = process.env.HARDCOVER_API_TOKEN?.trim();
  if (!token) return null;
  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: /^bearer\s/i.test(token) ? token : `Bearer ${token}`, "User-Agent": "BookReviews" },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(10000), ...cache,
    });
    return response.ok ? await response.json() : null;
  } catch { return null; }
}

/** Looks up series membership and position on Hardcover. Needs HARDCOVER_API_TOKEN; any failure means "unknown". */
export async function fetchHardcoverSeries(title: string, authors: string[]): Promise<SeriesInfo | null> {
  // Hardcover rejects _ilike, so the title must match exactly (as Open Library spells it).
  const parsed = bookResponse.safeParse(await request(BOOK_QUERY, { title }, { cache: "no-store" }));
  if (!parsed.success) return null;
  const wanted = new Set(authors.map(norm));
  for (const book of parsed.data.data.books) {
    // Titles repeat across authors, so only accept a book whose contributors include ours.
    if (!contributorNames(book.cached_contributors).some(name => wanted.has(name))) continue;
    const memberships = book.book_series.filter(entry => entry.series?.name);
    const entry = memberships.find(m => m.position !== null) ?? memberships[0];
    if (entry?.series) return { name: entry.series.name, number: entry.position };
  }
  return null;
}

/** Picks the matching series (by author, else the biggest) and keeps the most-read book at each whole position. */
export function parseSeriesEntries(json: unknown, authors: string[]): SeriesEntry[] {
  const parsed = seriesResponse.safeParse(json);
  if (!parsed.success) return [];
  const wanted = new Set(authors.map(norm));
  const candidates = parsed.data.data.series.filter(s => s.book_series.length);
  const series = candidates.find(s => s.author && wanted.has(norm(s.author.name))) ?? candidates[0];
  const best = new Map<number, { title: string; readers: number }>();
  for (const { position, book } of series?.book_series ?? []) {
    if (position === null || !book || !Number.isInteger(position)) continue;
    const readers = book.users_count ?? 0;
    if (readers > (best.get(position)?.readers ?? -1)) best.set(position, { title: book.title, readers });
  }
  return [...best.entries()].sort((a, b) => a[0] - b[0]).map(([number, { title }]) => ({ number, title }));
}

/** The numbered books of a series. Cached for a day because a series list rarely changes. */
export async function fetchHardcoverSeriesEntries(name: string, authors: string[]): Promise<SeriesEntry[]> {
  return parseSeriesEntries(await request(SERIES_QUERY, { name }, { next: { revalidate: 86400 } }), authors);
}
