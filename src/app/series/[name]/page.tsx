import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchHardcoverSeriesEntries } from "@/lib/hardcover";
import { STATUS_LABELS } from "@/lib/reading-list";
import { searchHref } from "@/lib/series";
import { BookCover } from "@/components/book-cover";

function decode(segment: string) {
  try { return decodeURIComponent(segment).slice(0, 120); } catch { return segment.slice(0, 120); }
}
export async function generateMetadata({ params }: { params: Promise<{ name: string }> }) {
  return { title: decode((await params).name) };
}
export default async function SeriesPage({ params }: { params: Promise<{ name: string }> }) {
  const name = decode((await params).name);
  const books = await db.book.findMany({ where: { series: { equals: name, mode: "insensitive" } }, orderBy: [{ seriesNumber: { sort: "asc", nulls: "last" } }, { title: "asc" }] });
  const entries = await fetchHardcoverSeriesEntries(name, books[0]?.authors ?? []);
  if (!books.length && !entries.length) notFound();
  const user = await getUser();
  const items = user && books.length ? await db.readingListItem.findMany({ where: { userId: user.id, bookId: { in: books.map(b => b.id) } }, select: { bookId: true, status: true } }) : [];
  const statusOf = new Map(items.map(i => [i.bookId, i.status]));

  // Hardcover's numbered list is the backbone; books we hold slot into their number, and anything else follows.
  const used = new Set<string>();
  const rows = entries.map(entry => {
    const book = books.find(b => b.seriesNumber === entry.number && !used.has(b.id)) ?? null;
    if (book) used.add(book.id);
    return { key: `n${entry.number}`, number: entry.number as number | null, title: entry.title, book };
  });
  for (const book of books) if (!used.has(book.id)) rows.push({ key: book.id, number: book.seriesNumber, title: book.title, book });
  rows.sort((a, b) => (a.number ?? Infinity) - (b.number ?? Infinity));
  const authors = [...new Set(books.flatMap(b => b.authors))];
  const read = rows.filter(r => r.book && statusOf.get(r.book.id) === "READ").length;

  return <div className="container page-section"><Link href="/" className="back-link"><ArrowLeft size={16} /> Back to discover</Link>
    <div className="page-heading"><div className="eyebrow">SERIES</div><h1>{name}</h1>
      <p>{authors.length ? `${authors.slice(0, 3).join(", ")} · ` : ""}{rows.length} {rows.length === 1 ? "book" : "books"}{user && rows.length ? ` · you’ve read ${read} of ${rows.length}` : ""}</p></div>
    <ol className="shelf-list series-list">{rows.map(row => {
      const status = row.book ? statusOf.get(row.book.id) : undefined;
      const href = row.book ? `/books/${row.book.workId}` : searchHref(row.title, authors);
      return <li key={row.key} className="shelf-row">
        <div className="shelf-row-info">
          <Link href={href} className="shelf-row-cover" tabIndex={-1} aria-hidden="true"><BookCover title={row.title} authors={row.book?.authors ?? authors} coverId={row.book?.coverId} /></Link>
          <div><p className="series-number">{row.number !== null ? `Book ${row.number}` : "Unnumbered"}</p>
            <Link href={href}><h3>{row.title}</h3></Link>
            <p className="muted">{row.book ? row.book.authors.join(", ") : "Not on BookReviews yet — search to find and add it"}</p></div>
        </div>
        {status && <span className="count-pill">{STATUS_LABELS[status]}</span>}
      </li>;
    })}</ol>
  </div>;
}
