import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, BookOpen } from "lucide-react";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { BookCover } from "@/components/book-cover";
import { Stars } from "@/components/stars";
import { DeleteReviewButton } from "@/components/review-form";
export const metadata = { title: "My reviews" };
export default async function MyReviews({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await getUser();
  if (!user) redirect("/login?returnTo=%2Fmy-reviews");
  const page = Math.max(1, Number.parseInt((await searchParams).page ?? "1", 10) || 1);
  const [reviews, count] = await Promise.all([db.review.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, take: 10, skip: (page - 1) * 10, include: { book: true } }), db.review.count({ where: { userId: user.id } })]);
  return <div className="container page-section"><div className="page-heading"><div className="eyebrow">YOUR OWN READING CORNER</div><h1>Your books. Your perspective.</h1><p>{count} {count === 1 ? "review" : "reviews"} shared with the community.</p></div>{reviews.length ? <div className="my-review-list">{reviews.map(review => <article key={review.id} className="my-review-card"><Link href={`/books/${review.book.workId}`}><BookCover {...review.book} /></Link><div><Link href={`/books/${review.book.workId}`}><h2>{review.book.title}</h2></Link><p className="muted">{review.book.authors.join(", ")}</p><Stars rating={review.rating} size={18} /><p className="my-review-body">{review.body}</p><div className="my-review-actions"><Link className="text-link" href={`/books/${review.book.workId}#your-review`}>Edit review <ArrowUpRight size={16} /></Link><DeleteReviewButton reviewId={review.id} /><span>Updated {review.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></div></div></article>)}</div> : <div className="empty-state"><BookOpen size={38} /><h2>Your story starts here.</h2><p>Find a book you’ve read and share your first review.</p><Link href="/search" className="button">Find a book <ArrowUpRight size={17} /></Link></div>}{count > 10 && <div className="pagination">{page > 1 && <Link href={`/my-reviews?page=${page - 1}`} className="text-link">Previous</Link>}<span>Page {page}</span>{page * 10 < count && <Link href={`/my-reviews?page=${page + 1}`} className="text-link">Next</Link>}</div>}</div>;
}
