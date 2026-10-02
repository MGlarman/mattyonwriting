import Link from "next/link";
import { Star, ArrowUpRight } from "lucide-react";
import { BookCover } from "@/components/book-cover";
import type { CatalogBook } from "@/lib/catalog";

export function BookCard({ book, average = null, count = 0 }: { book: CatalogBook; average?: number | null; count?: number }) {
  return <Link href={`/books/${book.workId}`} className="book-card">
    <div className="book-card-art"><BookCover {...book} /><span className="cover-link"><ArrowUpRight size={19} /></span></div>
    <div className="book-card-info"><h3>{book.title}</h3><p>{book.authors.join(", ")}</p>
      <div className="book-card-rating">{average !== null ? <><Star size={14} fill="currentColor" /><strong>{average.toFixed(1)}</strong><span>({count} {count === 1 ? "review" : "reviews"})</span></> : <span className="unrated">Be the first to review</span>}</div>
    </div>
  </Link>;
}
