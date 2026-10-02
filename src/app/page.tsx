import Link from "next/link";
import { ArrowRight, ArrowUpRight, BookOpen, MessageSquare, Sparkles, Star } from "lucide-react";
import { db } from "@/lib/db";
import { BookCover } from "@/components/book-cover";
import { BookCard } from "@/components/book-card";
import { SearchForm } from "@/components/search-form";
import { Stars } from "@/components/stars";

export const dynamic = "force-dynamic";
const genres = ["All books", "Fiction", "Classics", "Fantasy", "Science fiction"];
export default async function Home({ searchParams }: { searchParams: Promise<{ genre?: string }> }) {
  const params = await searchParams;
  const genre = genres.includes(params.genre ?? "") ? params.genre! : "All books";
  const [books, recent, aggregates] = await Promise.all([
    db.book.findMany({ orderBy: { createdAt: "asc" }, take: 60 }),
    db.review.findMany({ orderBy: { createdAt: "desc" }, take: 3, include: { user: { select: { displayName: true } }, book: true } }),
    db.review.groupBy({ by: ["bookId"], _avg: { rating: true }, _count: true }),
  ]);
  const byBook = new Map(aggregates.map(item => [item.bookId, item]));
  const filtered = books.filter(book => genre === "All books" || book.subjects.some(subject => {
    const s = subject.toLowerCase();
    return genre === "Classics" ? /classic|literature/.test(s) : s.includes(genre.toLowerCase());
  })).slice(0, 8);
  const heroBooks = books.slice(0, 3);
  return <>
    <section className="hero"><div className="container hero-grid"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line" /> YOUR NEXT CHAPTER STARTS HERE</div><h1>A good book deserves<br />a <span>conversation.</span></h1><p>Find your next great read. Share the stories that stayed with you. A little community for a big love of books.</p><SearchForm large /><div className="hero-note"><span className="mini-star"><Star size={12} fill="currentColor" /></span> Honest reviews, from one reader to another.</div></div>
    <div className="hero-art" aria-label="A selection of books to discover"><div className="hero-orbit" /><span className="art-caption">SO MANY STORIES.<br />SO MUCH TO DISCOVER.</span><div className="hero-books">{heroBooks.length ? heroBooks.map((book, index) => <Link key={book.id} href={`/books/${book.workId}`} className={`hero-book hero-book-${index}`} aria-label={`Discover ${book.title}`}><BookCover {...book} priority /></Link>) : <><div className="illustrated-book illustrated-back"><small>THE WORLD<br />BETWEEN PAGES</small><BookOpen size={45} /></div><div className="illustrated-book illustrated-front"><small>A NEW<br /><em>chapter.</em></small><span>YOUR NEXT GREAT READ</span></div></>}</div><div className="floating-note"><span className="floating-icon"><BookOpen size={20} /></span><div><strong>A world between the pages</strong><small>Your next favorite is waiting.</small></div></div><Sparkles className="art-sparkle" size={30} strokeWidth={1.3} /></div></div></section>
    <div className="community-strip"><div className="container"><span><BookOpen size={18} /> A book for every kind of reader</span><span><Star size={18} /> Your opinion matters</span><span><MessageSquare size={18} /> Better reads start with a conversation</span></div></div>
    <section id="discover" className="container discover-section"><div className="section-heading"><div><div className="eyebrow">THE NEXT ONE ON YOUR NIGHTSTAND</div><h2>Discover your next read</h2></div><Link href="/search" className="text-link">Explore the catalog <ArrowUpRight size={17} /></Link></div><div className="genre-tabs" aria-label="Book categories">{genres.map(item => <Link key={item} href={`/?genre=${encodeURIComponent(item)}#discover`} className={genre === item ? "genre-active" : ""} aria-current={genre === item ? "page" : undefined}>{item}</Link>)}</div>
      {filtered.length ? <div className="book-grid">{filtered.map(book => <BookCard key={book.id} book={book} average={byBook.get(book.id)?._avg.rating ?? null} count={byBook.get(book.id)?._count ?? 0} />)}</div> : <div className="empty-state"><BookOpen size={34} /><h3>A new shelf, ready for stories</h3><p>{books.length ? "Search the catalog to discover more books in this category." : "Find a book in the catalog to start our community’s library."}</p><Link href="/search" className="button">Find a book <ArrowRight size={17} /></Link></div>}
    </section>
    <section className="reviews-section"><div className="container"><div className="section-heading"><div><div className="eyebrow">FROM THE READING CORNER</div><h2>Fresh perspectives</h2></div><span className="section-description">Real thoughts. Real readers.</span></div>{recent.length ? <div className="recent-grid">{recent.map(review => <article className="recent-card" key={review.id}><div className="reviewer"><span className="avatar">{review.user.displayName[0].toUpperCase()}</span><div><strong>{review.user.displayName}</strong><small>{review.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</small></div><Stars rating={review.rating} /></div><p className="recent-body">{review.body}</p><Link href={`/books/${review.book.workId}`} className="recent-book"><BookCover {...review.book} /><span><strong>{review.book.title}</strong><small>{review.book.authors.join(", ")}</small></span><ArrowUpRight size={18} /></Link></article>)}</div> : <div className="first-review"><div className="first-review-icon"><MessageSquare size={28} /></div><div><h3>Every conversation starts with one reader.</h3><p>Read something you loved? Something you didn’t? Be the first to share your perspective.</p></div><Link href="/search" className="text-link">Write the first review <ArrowRight size={17} /></Link></div>}</div></section>
    <section className="container join-section"><div className="join-art"><BookOpen size={45} strokeWidth={1.3} /><span className="join-sparkle">✦</span></div><div><div className="eyebrow">A PLACE FOR YOUR BOOKISH SIDE</div><h2>Read it. Rate it. Pass it on.</h2><p>Your next favorite book might be someone else’s favorite review.</p></div><Link href="/signup" className="button">Find your people <ArrowUpRight size={18} /></Link></section>
  </>;
}
