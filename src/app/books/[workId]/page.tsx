import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Star, MessageSquare, AlertCircle } from "lucide-react";
import { getOrImportBook, bookStats } from "@/lib/books";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { CatalogError } from "@/lib/catalog";
import { BookCover } from "@/components/book-cover";
import { Stars } from "@/components/stars";
import { ReviewForm, DeleteReviewButton } from "@/components/review-form";
import { CommentThread } from "@/components/comments";
import { commentsByReview } from "@/lib/comments";
import { commentLikes, likeOf, reviewLikes } from "@/lib/likes";
import { LikeButton } from "@/components/like-button";
import { ReadingStatusPicker } from "@/components/reading-status";
import { nextInSeries } from "@/lib/series-books";
import { seriesHref } from "@/lib/series";

export const dynamic = "force-dynamic";
export default async function BookPage({ params, searchParams }: { params: Promise<{ workId: string }>; searchParams: Promise<{ page?: string }> }) {
  const { workId } = await params;
  if (!/^OL\d+W$/.test(workId)) notFound();
  let book;
  try { book = await getOrImportBook(workId); } catch (error) {
    if (!(error instanceof CatalogError)) throw error;
    return <div className="container page-section"><div className="empty-state"><AlertCircle size={32} /><h1>We couldn’t load this book</h1><p role="alert">{error.message}</p><Link className="button" href={`/books/${workId}`}>Try again</Link><Link className="text-link" href="/search">Back to search</Link></div></div>;
  }
  const page = Math.max(1, Math.min(10000, Number.parseInt((await searchParams).page ?? "1", 10) || 1));
  const user = await getUser();
  const [stats, reviews, own, listed] = await Promise.all([
    bookStats(book.id),
    db.review.findMany({ where: { bookId: book.id }, orderBy: { createdAt: "desc" }, take: 10, skip: (page - 1) * 10, include: { user: { select: { displayName: true, id: true } } } }),
    user ? db.review.findUnique({ where: { userId_bookId: { userId: user.id, bookId: book.id } } }) : null,
    user ? db.readingListItem.findUnique({ where: { userId_bookId: { userId: user.id, bookId: book.id } } }) : null,
  ]);
  const comments = await commentsByReview(reviews.map(review => review.id));
  const [rLikes, cLikes] = await Promise.all([reviewLikes(reviews.map(r => r.id), user?.id), commentLikes([...comments.values()].flat().map(c => c.id), user?.id)]);
  const next = book.series && book.seriesNumber !== null ? await nextInSeries(book.series, book.seriesNumber, book.authors) : null;
  const loginHref = `/login?returnTo=${encodeURIComponent(`/books/${workId}`)}`;
  return <div className="container page-section"><Link href="/" className="back-link"><ArrowLeft size={16} /> Back to discover</Link><div className="book-detail"><aside className="book-detail-cover"><BookCover {...book} priority /><a href={`https://openlibrary.org/works/${workId}`} target="_blank" rel="noreferrer" className="cover-source">View on Open Library ↗</a></aside><div className="book-detail-info"><div className="eyebrow">BETWEEN THE COVERS</div><h1>{book.title}</h1><p className="book-author">by {book.authors.join(", ")}</p>{book.series && <p className="book-year">{book.seriesNumber !== null ? `Book ${book.seriesNumber} of ` : "Part of "}<Link className="text-link" href={seriesHref(book.series)}>{book.series}</Link></p>}{next && <p className="book-year">Next in the series: <Link className="text-link" href={next.href}>{next.title}</Link></p>}{book.firstYear && <p className="book-year">First published {book.firstYear}</p>}<div className="detail-rating"><span className="average-rating">{stats.average?.toFixed(1) ?? "—"}</span><div><Stars rating={stats.average ?? 0} size={20} /><p>{stats.count ? `${stats.count} community ${stats.count === 1 ? "review" : "reviews"}` : "No reviews yet"}</p></div><a href="#your-review" className="button button-outline"><Star size={16} /> {own ? "Edit your review" : "Write a review"}</a></div>{user ? <div className="book-shelf-status"><h2>Add to a list</h2><ReadingStatusPicker workId={workId} status={listed?.status ?? null} /></div> : <p className="book-shelf-status"><Link className="text-link" href={loginHref}>Sign in to add this book to your reading lists <ArrowRight size={15} /></Link></p>}<div className="book-description"><h2>About this book</h2>{book.description ? <p>{book.description}</p> : <p>Some stories are best discovered one page at a time. Open Library hasn’t provided a description for this book yet.</p>}</div><div className="subject-tags">{book.subjects.map(subject => <span key={subject}>{subject}</span>)}</div></div></div>
    <div className="book-community"><section className="community-reviews"><div className="section-heading"><h2>Readers’ perspectives <span className="count-pill">{stats.count}</span></h2></div>{reviews.length ? reviews.map(review => <article className="full-review" key={review.id}><div className="reviewer"><span className="avatar">{review.user.displayName[0].toUpperCase()}</span><div><strong>{review.user.displayName}{review.user.id === user?.id && <span className="you-label">You</span>}</strong><small>{review.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}{review.updatedAt.getTime() - review.createdAt.getTime() > 1000 ? " · Edited" : ""}</small></div><Stars rating={review.rating} /></div><p>{review.body}</p><div className="review-actions"><LikeButton kind="review" targetId={review.id} count={likeOf(rLikes, review.id).count} liked={likeOf(rLikes, review.id).liked} mode={!user ? "signin" : review.user.id === user.id ? "own" : "toggle"} loginHref={loginHref} />{review.user.id === user?.id && <DeleteReviewButton reviewId={review.id} />}</div><CommentThread reviewId={review.id} signedIn={!!user} loginHref={loginHref} comments={(comments.get(review.id) ?? []).map(c => ({ id: c.id, body: c.body, createdAt: c.createdAt.toISOString(), author: c.user.displayName, mine: c.user.id === user?.id, likes: likeOf(cLikes, c.id).count, liked: likeOf(cLikes, c.id).liked }))} /></article>) : <div className="empty-state"><MessageSquare size={30} /><h3>Be the first voice on this shelf.</h3><p>Share what you thought and help another reader find their next book.</p></div>}{stats.count > 10 && <div className="pagination">{page > 1 && <Link href={`/books/${workId}?page=${page - 1}`} className="text-link">Previous</Link>}<span>Page {page}</span>{page * 10 < stats.count && <Link href={`/books/${workId}?page=${page + 1}`} className="text-link">Next <ArrowRight size={15} /></Link>}</div>}</section>
    <section id="your-review" className="write-review-panel"><div className="eyebrow">YOUR PERSPECTIVE</div><h2>{own ? "Your thoughts, revisited." : "What did you think?"}</h2><p className="panel-description">An honest review can be the beginning of someone else’s next great read.</p>{user ? <ReviewForm key={own?.id ?? "new"} workId={workId} review={own} /> : <div className="sign-in-prompt"><MessageSquare size={26} /><h3>Join the conversation</h3><p>Sign in to rate this book and share your thoughts.</p><Link href={`/login?returnTo=${encodeURIComponent(`/books/${workId}`)}`} className="button">Sign in to review <ArrowRight size={17} /></Link><Link href={`/signup?returnTo=${encodeURIComponent(`/books/${workId}`)}`} className="text-link">New here? Create an account</Link></div>}</section></div>
  </div>;
}
