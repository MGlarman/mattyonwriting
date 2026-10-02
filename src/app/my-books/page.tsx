import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, Plus, Search } from "lucide-react";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CatalogError, searchBooks, type CatalogBook } from "@/lib/catalog";
import { READING_STATUSES, STATUS_LABELS } from "@/lib/reading-list";
import { BookCover } from "@/components/book-cover";
import { ReadingStatusPicker } from "@/components/reading-status";
import { continueSeries } from "@/lib/series-books";
import { seriesHref } from "@/lib/series";
export const metadata = { title: "My books" };
const EMPTY: Record<(typeof READING_STATUSES)[number], string> = { READING: "Nothing in progress right now.", TO_READ: "Your shelf is clear — add something to read next.", READ: "No finished books yet." };
export default async function MyBooks({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await getUser();
  if (!user) redirect("/login?returnTo=%2Fmy-books");
  const query = ((await searchParams).q ?? "").trim().slice(0, 200);
  let found: CatalogBook[] = [];
  let searchError: string | null = null;
  if (query) {
    try { found = (await searchBooks(query, 1)).books.slice(0, 6); } catch (e) { searchError = e instanceof CatalogError ? e.message : "Search is unavailable. Please try again."; }
  }
  const [items, listed] = await Promise.all([
    db.readingListItem.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, take: 500, include: { book: true } }),
    found.length ? db.readingListItem.findMany({ where: { userId: user.id, book: { workId: { in: found.map(b => b.workId) } } }, select: { status: true, book: { select: { workId: true } } } }) : [],
  ]);
  const upNext = await continueSeries(user.id).catch(() => []);
  const statusByWork = new Map(listed.map(i => [i.book.workId, i.status]));
  return <div className="container page-section"><div className="page-heading"><div className="eyebrow">YOUR PERSONAL LIBRARY</div><h1>What you’re reading, and what’s next.</h1><p>What I’m reading, what I’ve read, and what’s waiting on the shelf.</p></div>
    <section className="add-book" aria-labelledby="add-book-heading"><h2 id="add-book-heading"><Plus size={18} /> Add a book</h2>
      <form action="/my-books" role="search" className="search-form"><Search size={20} aria-hidden="true" /><label htmlFor="add-book-search" className="sr-only">Search for a book to add</label><input id="add-book-search" name="q" type="search" placeholder="Search by title or author…" defaultValue={query} required maxLength={200} /><button type="submit" aria-label="Search books"><span>Search</span></button></form>
      {searchError ? <p className="form-error" role="alert"><AlertCircle size={16} /> {searchError}</p> : query && (found.length ? <><ul className="add-book-results">{found.map(book => <li key={book.workId} className="add-book-result"><Link href={`/books/${book.workId}`}><BookCover {...book} /></Link><div><Link href={`/books/${book.workId}`}><h3>{book.title}</h3></Link><p className="muted">{book.authors.join(", ")}</p><ReadingStatusPicker workId={book.workId} status={statusByWork.get(book.workId) ?? null} /></div></li>)}</ul><Link href="/my-books" className="text-link">Close search</Link></> : <p className="muted">No books found for “{query}”.</p>)}
    </section>
    {upNext.length > 0 && <section className="shelf-section" aria-labelledby="up-next"><div className="shelf-heading"><h2 id="up-next">Up next in your series</h2><span className="count-pill">{upNext.length}</span><span className="shelf-rule" aria-hidden="true" /></div>
      <ul className="shelf-list">{upNext.map(({ series, authors, next }) => <li key={series} className="shelf-row"><div className="shelf-row-info"><Link href={next.href} className="shelf-row-cover" tabIndex={-1} aria-hidden="true"><BookCover title={next.title} authors={next.book?.authors ?? authors} coverId={next.book?.coverId} /></Link><div><p className="series-number">{next.number !== null ? `Book ${next.number} of ` : ""}<Link className="text-link" href={seriesHref(series)}>{series}</Link></p><Link href={next.href}><h3>{next.title}</h3></Link><p className="muted">{(next.book?.authors ?? authors).join(", ")}</p></div></div></li>)}</ul></section>}
    {READING_STATUSES.map(status => {
      const rows = items.filter(i => i.status === status);
      return <section key={status} className="shelf-section" aria-labelledby={`shelf-${status}`}>
        <div className="shelf-heading"><h2 id={`shelf-${status}`}>{STATUS_LABELS[status]}</h2><span className="count-pill">{rows.length}</span><span className="shelf-rule" aria-hidden="true" /></div>
        {rows.length ? <ul className="shelf-list">{rows.map(({ book }) => <li key={book.id} className="shelf-row"><div className="shelf-row-info"><Link href={`/books/${book.workId}`} className="shelf-row-cover" tabIndex={-1} aria-hidden="true"><BookCover {...book} /></Link><div><Link href={`/books/${book.workId}`}><h3>{book.title}</h3></Link><p className="muted">{book.authors.join(", ")}</p></div></div><ReadingStatusPicker workId={book.workId} status={status} /></li>)}</ul> : <p className="shelf-empty">{EMPTY[status]}</p>}
      </section>;
    })}
  </div>;
}
