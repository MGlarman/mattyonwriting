import { db } from "@/lib/db";
import { fetchHardcoverSeriesEntries } from "@/lib/hardcover";
import { nextEntry, searchHref } from "@/lib/series";

const inSeries = (series: string) => ({ equals: series, mode: "insensitive" as const });

/** The book after `number` in a series: from Hardcover's list when available, else from books already on the site. */
export async function nextInSeries(series: string, number: number, authors: string[]) {
  const entry = nextEntry(await fetchHardcoverSeriesEntries(series, authors), number);
  const book = await db.book.findFirst({
    where: { series: inSeries(series), seriesNumber: entry ? entry.number : { gt: number } },
    orderBy: { seriesNumber: "asc" },
  });
  const title = book?.title ?? entry?.title;
  if (!title) return null;
  return { title, number: book?.seriesNumber ?? entry?.number ?? null, book, href: book ? `/books/${book.workId}` : searchHref(title, authors) };
}

/** For each series the reader has finished a book in, the next book they haven't read. */
export async function continueSeries(userId: string, limit = 6) {
  const finished = await db.readingListItem.findMany({
    where: { userId, status: "READ", book: { series: { not: null }, seriesNumber: { not: null } } },
    orderBy: { updatedAt: "desc" }, take: 200, include: { book: true },
  });
  const latest = new Map<string, { series: string; number: number; authors: string[] }>();
  for (const { book } of finished) {
    if (!book.series || book.seriesNumber === null) continue;
    const key = book.series.toLowerCase(), seen = latest.get(key);
    if (!seen || book.seriesNumber > seen.number) latest.set(key, { series: book.series, number: book.seriesNumber, authors: book.authors });
  }
  const upNext = (await Promise.all([...latest.values()].slice(0, limit).map(async s => ({ ...s, next: await nextInSeries(s.series, s.number, s.authors) }))))
    .flatMap(s => s.next ? [{ series: s.series, authors: s.authors, next: s.next }] : []);
  // A next book the reader already finished (read out of order) means that series has nothing "next".
  const nextIds = upNext.flatMap(s => s.next.book ? [s.next.book.id] : []);
  const done = nextIds.length ? await db.readingListItem.findMany({ where: { userId, status: "READ", bookId: { in: nextIds } }, select: { bookId: true } }) : [];
  const doneIds = new Set(done.map(d => d.bookId));
  return upNext.filter(s => !s.next.book || !doneIds.has(s.next.book.id));
}
