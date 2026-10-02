import { db } from "@/lib/db";

export type LikeInfo = { count: number; liked: boolean };
export class OwnContentError extends Error {
  constructor() { super("You can’t like your own contribution."); }
}
const none: LikeInfo = { count: 0, liked: false };

export async function reviewLikes(ids: string[], userId?: string) {
  const info = new Map<string, LikeInfo>();
  if (!ids.length) return info;
  const [counts, mine] = await Promise.all([
    db.reviewLike.groupBy({ by: ["reviewId"], where: { reviewId: { in: ids } }, _count: true }),
    userId ? db.reviewLike.findMany({ where: { userId, reviewId: { in: ids } }, select: { reviewId: true } }) : [],
  ]);
  const liked = new Set(mine.map(row => row.reviewId));
  for (const row of counts) info.set(row.reviewId, { count: row._count, liked: liked.has(row.reviewId) });
  return info;
}
export async function commentLikes(ids: string[], userId?: string) {
  const info = new Map<string, LikeInfo>();
  if (!ids.length) return info;
  const [counts, mine] = await Promise.all([
    db.commentLike.groupBy({ by: ["commentId"], where: { commentId: { in: ids } }, _count: true }),
    userId ? db.commentLike.findMany({ where: { userId, commentId: { in: ids } }, select: { commentId: true } }) : [],
  ]);
  const liked = new Set(mine.map(row => row.commentId));
  for (const row of counts) info.set(row.commentId, { count: row._count, liked: liked.has(row.commentId) });
  return info;
}
export const likeOf = (map: Map<string, LikeInfo>, id: string) => map.get(id) ?? none;

/** Toggles a like. Returns the book's workId for revalidation, or null if the target is missing. */
export async function toggleReviewLike(userId: string, reviewId: string) {
  const review = await db.review.findUnique({ where: { id: reviewId }, select: { userId: true, book: { select: { workId: true } } } });
  if (!review) return null;
  if (review.userId === userId) throw new OwnContentError();
  const removed = await db.reviewLike.deleteMany({ where: { userId, reviewId } });
  if (!removed.count) await db.reviewLike.createMany({ data: [{ userId, reviewId }], skipDuplicates: true });
  return review.book.workId;
}
export async function toggleCommentLike(userId: string, commentId: string) {
  const comment = await db.comment.findUnique({ where: { id: commentId }, select: { userId: true, review: { select: { book: { select: { workId: true } } } } } });
  if (!comment) return null;
  if (comment.userId === userId) throw new OwnContentError();
  const removed = await db.commentLike.deleteMany({ where: { userId, commentId } });
  if (!removed.count) await db.commentLike.createMany({ data: [{ userId, commentId }], skipDuplicates: true });
  return comment.review.book.workId;
}
