import type { ReadingStatusValue } from "@/lib/reading-list";
import { genreOf, GENRES, type Genre } from "@/lib/map-layout";

export type StatsItem = { status: ReadingStatusValue; updatedAt: Date; book: { title: string; authors: string[]; firstYear: number | null; subjects: string[] } };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function computeStats(items: StatsItem[], ratings: number[], now = new Date(), monthCount = 12) {
  const counts: Record<ReadingStatusValue, number> = { READING: 0, TO_READ: 0, READ: 0 };
  for (const item of items) counts[item.status]++;
  const read = items.filter(item => item.status === "READ");
  // There is no finish date, so a book counts for the month it was marked as read.
  const months = Array.from({ length: monthCount }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (monthCount - 1 - i), 1);
    return { year: date.getFullYear(), month: date.getMonth(), label: MONTHS[date.getMonth()], count: 0 };
  });
  for (const item of read) {
    const slot = months.find(m => m.year === item.updatedAt.getFullYear() && m.month === item.updatedAt.getMonth());
    if (slot) slot.count++;
  }
  const genreCounts = new Map<Genre, number>();
  const authorCounts = new Map<string, number>();
  for (const { book } of read) {
    const genre = genreOf(book.subjects);
    genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    for (const author of new Set(book.authors)) if (author !== "Unknown author") authorCounts.set(author, (authorCounts.get(author) ?? 0) + 1);
  }
  const dated = read.filter(item => item.book.firstYear !== null).sort((a, b) => a.book.firstYear! - b.book.firstYear!);
  const pick = (item?: StatsItem) => item ? { title: item.book.title, year: item.book.firstYear! } : null;
  const distribution = [5, 4, 3, 2, 1].map(stars => ({ stars, count: ratings.filter(r => r === stars).length }));
  return {
    counts,
    readThisYear: read.filter(item => item.updatedAt.getFullYear() === now.getFullYear()).length,
    months,
    genres: GENRES.map(genre => ({ genre, count: genreCounts.get(genre) ?? 0 })).filter(g => g.count).sort((a, b) => b.count - a.count),
    authors: [...authorCounts.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5).map(([name, count]) => ({ name, count })),
    ratings: { distribution, count: ratings.length, average: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null },
    oldest: pick(dated[0]), newest: pick(dated[dated.length - 1]),
  };
}
