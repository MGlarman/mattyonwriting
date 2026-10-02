import { db } from "@/lib/db";
import { fetchWork } from "@/lib/catalog";

export async function getOrImportBook(workId: string) {
  const existing = await db.book.findUnique({ where: { workId } });
  if (existing) return existing;
  const details = await fetchWork(workId);
  return db.book.upsert({ where: { workId }, create: details, update: {} });
}
export async function bookStats(bookId: string) {
  const result = await db.review.aggregate({ where: { bookId }, _avg: { rating: true }, _count: true });
  return { average: result._avg.rating, count: result._count };
}
export async function saveOwnedReview(userId: string, bookId: string, rating: number, body: string) {
  return db.review.upsert({
    where: { userId_bookId: { userId, bookId } },
    create: { userId, bookId, rating, body }, update: { rating, body },
  });
}
export async function deleteOwnedReview(userId: string, reviewId: string) {
  return db.review.deleteMany({ where: { id: reviewId, userId } });
}
