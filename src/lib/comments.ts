import { db } from "@/lib/db";

export const COMMENTS_PER_REVIEW = 50;

export async function commentsByReview(reviewIds: string[]) {
  const rows = reviewIds.length
    ? await db.comment.findMany({ where: { reviewId: { in: reviewIds } }, orderBy: { createdAt: "asc" }, include: { user: { select: { id: true, displayName: true } } } })
    : [];
  const grouped = new Map<string, typeof rows>();
  for (const row of rows) grouped.set(row.reviewId, [...(grouped.get(row.reviewId) ?? []), row]);
  return grouped;
}
export async function addComment(userId: string, reviewId: string, body: string) {
  const review = await db.review.findUnique({ where: { id: reviewId }, select: { id: true, book: { select: { workId: true } } } });
  if (!review) return null;
  if (await db.comment.count({ where: { reviewId } }) >= COMMENTS_PER_REVIEW) throw new CommentLimitError();
  await db.comment.create({ data: { reviewId, userId, body } });
  return review.book.workId;
}
export async function deleteOwnComment(userId: string, commentId: string) {
  const comment = await db.comment.findFirst({ where: { id: commentId, userId }, select: { review: { select: { book: { select: { workId: true } } } } } });
  if (!comment) return null;
  await db.comment.deleteMany({ where: { id: commentId, userId } });
  return comment.review.book.workId;
}
export class CommentLimitError extends Error {
  constructor() { super("This conversation has reached its comment limit."); }
}
