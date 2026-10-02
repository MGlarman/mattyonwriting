import Link from "next/link";
import { Search, ArrowLeft, ArrowRight, AlertCircle } from "lucide-react";
import { SearchForm } from "@/components/search-form";
import { BookCard } from "@/components/book-card";
import { searchBooks, CatalogError } from "@/lib/catalog";
import { db } from "@/lib/db";

export const metadata = { title: "Find a book" };
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const params = await searchParams;
  const query = (params.q ?? "").trim().slice(0, 200);
  const page = Math.min(100, Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1));
  let result: Awaited<ReturnType<typeof searchBooks>> | null = null;
  let error: string | null = null;
  if (query) {
    try { result = await searchBooks(query, page); } catch (e) { error = e instanceof CatalogError ? e.message : "Search is unavailable. Please try again."; }
  }
  const saved = result ? await db.book.findMany({ where: { workId: { in: result.books.map(book => book.workId) } }, select: { id: true, workId: true } }) : [];
  const stats = saved.length ? await db.review.groupBy({ by: ["bookId"], where: { bookId: { in: saved.map(book => book.id) } }, _avg: { rating: true }, _count: true }) : [];
  const byWork = new Map(saved.map(book => [book.workId, stats.find(s => s.bookId === book.id)]));
  const pageHref = (n: number) => `/search?q=${encodeURIComponent(query)}&page=${n}`;
  return <div className="container page-section"><Link className="back-link" href="/"><ArrowLeft size={16} /> Back to discover</Link><div className="page-heading"><div className="eyebrow">THERE’S A STORY FOR EVERYONE</div><h1>Find your next chapter.</h1><p>Search millions of books by title or author.</p></div><SearchForm query={query} />
    {error ? <div className="empty-state"><AlertCircle size={32} /><h2>Let’s try that again</h2><p role="alert">{error}</p><Link href={pageHref(page)} className="button">Retry search</Link></div> : !query ? <div className="search-suggestions"><p>A few places to start</p>{["Jane Austen", "Dune", "The Hobbit", "Agatha Christie"].map(term => <Link key={term} href={`/search?q=${encodeURIComponent(term)}`}><Search size={14} />{term}</Link>)}</div> : result && <><div className="results-heading"><h2>Results for “{query}”</h2><span>{result.total.toLocaleString()} books found</span></div>{result.books.length ? <div className="book-grid">{result.books.map(book => <BookCard key={book.workId} book={book} average={byWork.get(book.workId)?._avg.rating ?? null} count={byWork.get(book.workId)?._count ?? 0} />)}</div> : <div className="empty-state"><Search size={32} /><h3>No books found</h3><p>Try a different title, author, or spelling.</p></div>}<div className="pagination">{page > 1 && <Link href={pageHref(page - 1)} className="button button-outline"><ArrowLeft size={16} /> Previous</Link>}<span>Page {page}</span>{page * 12 < result.total && page < 100 && <Link href={pageHref(page + 1)} className="button button-outline">Next <ArrowRight size={16} /></Link>}</div></>}
  </div>;
}
