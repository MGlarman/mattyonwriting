import Link from "next/link";
import { BookOpen } from "lucide-react";
import { db } from "@/lib/db";
import { layoutMap } from "@/lib/map-layout";
import { BookMap } from "@/components/book-map";

export const metadata = { title: "The Map" };
export const dynamic = "force-dynamic";

export default async function MapPage() {
  const [books, stats] = await Promise.all([
    db.book.findMany({ where: { reviews: { some: {} } }, select: { id: true, workId: true, title: true, authors: true, firstYear: true, subjects: true, coverId: true, series: true, seriesNumber: true } }),
    db.review.groupBy({ by: ["bookId"], _avg: { rating: true }, _count: true }),
  ]);
  const byBook = new Map(stats.map(s => [s.bookId, s]));
  const layout = layoutMap(books.map(book => ({ ...book, reviews: byBook.get(book.id)?._count ?? 0, average: byBook.get(book.id)?._avg.rating ?? null })));
  if (!layout.nodes.length) return <div className="container page-section">
    <div className="page-heading"><div className="eyebrow">EVERY REVIEWED BOOK, IN ONE SKY</div><h1>The Map</h1></div>
    <div className="empty-state"><BookOpen size={36} /><h2>The map is waiting for its first star.</h2><p>Books appear here as soon as someone reviews them.</p><Link href="/search" className="button">Find a book</Link></div>
  </div>;
  return <div className="map-page">
    <h1 className="sr-only">The Map</h1>
    <BookMap layout={layout} />
  </div>;
}
