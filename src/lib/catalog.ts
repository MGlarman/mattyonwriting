import { z } from "zod";
import { detectSeries, type SeriesInfo } from "./series";
import { fetchHardcoverSeries } from "./hardcover";

const docSchema = z.object({
  key: z.string(), title: z.string(), author_name: z.array(z.string()).optional(),
  cover_i: z.number().int().positive().optional(), first_publish_year: z.number().int().optional(),
});
const searchSchema = z.object({ numFound: z.number(), docs: z.array(docSchema) });
export type CatalogBook = { workId: string; title: string; authors: string[]; coverId: number | null; firstYear: number | null };
export class CatalogError extends Error {}
let requestQueue = Promise.resolve();
let lastRequest = 0;
async function libraryFetch(path: string) {
  // Open Library asks unidentified clients to stay under one request per second.
  const current = requestQueue.then(async () => {
    const wait = Math.max(0, lastRequest + (process.env.OPEN_LIBRARY_CONTACT ? 350 : 1100) - Date.now());
    if (wait) await new Promise(resolve => setTimeout(resolve, wait));
    lastRequest = Date.now();
  });
  requestQueue = current.catch(() => {});
  await current;
  try {
    const response = await fetch(`https://openlibrary.org${path}`, {
      headers: { "User-Agent": `BookReviews${process.env.OPEN_LIBRARY_CONTACT ? ` (${process.env.OPEN_LIBRARY_CONTACT})` : ""}` },
      signal: AbortSignal.timeout(10000), next: { revalidate: 3600 },
    });
    if (!response.ok) throw new CatalogError(response.status === 404 ? "This book was not found in Open Library." : "Book search is temporarily unavailable. Please try again.");
    return await response.json();
  } catch (error) {
    if (error instanceof CatalogError) throw error;
    throw new CatalogError("We couldn’t reach Open Library. Please try again shortly.");
  }
}
export function normalizeBook(doc: z.infer<typeof docSchema>): CatalogBook | null {
  const workId = doc.key.replace("/works/", "");
  if (!/^OL\d+W$/.test(workId)) return null;
  return { workId, title: doc.title, authors: doc.author_name ?? ["Unknown author"], coverId: doc.cover_i ?? null, firstYear: doc.first_publish_year ?? null };
}
export async function searchBooks(query: string, page = 1) {
  const params = new URLSearchParams({ q: query.slice(0, 200), page: String(page), limit: "12", fields: "key,title,author_name,cover_i,first_publish_year" });
  const parsed = searchSchema.safeParse(await libraryFetch(`/search.json?${params}`));
  if (!parsed.success) throw new CatalogError("Unexpected catalog response. Please try again.");
  return { total: parsed.data.numFound, books: parsed.data.docs.map(normalizeBook).filter((book): book is CatalogBook => !!book) };
}
const workSchema = z.object({
  title: z.string(), description: z.union([z.string(), z.object({ value: z.string() })]).optional(),
  covers: z.array(z.number()).optional(), first_publish_date: z.string().optional(),
  subjects: z.array(z.string()).optional(), authors: z.array(z.object({ author: z.object({ key: z.string() }) })).optional(),
});
/** Series are best-effort: any failure just means "no series". Hardcover first, Open Library editions as fallback. */
export async function fetchSeries(workId: string, title: string, authors: string[]): Promise<SeriesInfo | null> {
  const hardcover = await fetchHardcoverSeries(title, authors);
  if (hardcover) return hardcover;
  try {
    const data = await libraryFetch(`/works/${workId}/editions.json?limit=100`);
    return detectSeries(Array.isArray(data?.entries) ? data.entries : []);
  } catch { return null; }
}
export async function fetchWork(workId: string) {
  if (!/^OL\d+W$/.test(workId)) throw new CatalogError("Invalid book identifier.");
  const parsed = workSchema.safeParse(await libraryFetch(`/works/${workId}.json`));
  if (!parsed.success) throw new CatalogError("Unexpected book details. Please try again.");
  const work = parsed.data;
  const authors: string[] = [];
  for (const author of (work.authors ?? []).slice(0, 4)) {
    if (!/^\/authors\/OL\d+A$/.test(author.author.key)) continue;
    const data = z.object({ name: z.string() }).safeParse(await libraryFetch(`${author.author.key}.json`));
    if (data.success) authors.push(data.data.name);
  }
  const year = work.first_publish_date?.match(/\b\d{4}\b/)?.[0];
  const names = authors.length ? authors : ["Unknown author"];
  const series = await fetchSeries(workId, work.title, authors);
  return {
    workId, title: work.title, authors: names,
    coverId: work.covers?.find(id => id > 0) ?? null, firstYear: year ? Number(year) : null,
    description: (typeof work.description === "string" ? work.description : work.description?.value)?.slice(0, 20000) ?? null,
    subjects: (work.subjects ?? []).filter(s => s.length < 40).slice(0, 6),
    series: series?.name ?? null, seriesNumber: series?.number ?? null,
  };
}
