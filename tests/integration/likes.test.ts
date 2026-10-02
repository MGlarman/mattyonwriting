import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { commentLikes, OwnContentError, reviewLikes, toggleCommentLike, toggleReviewLike } from "@/lib/likes";

const suffix = Date.now().toString(36);
const workId = "OL999999996W";
let author: string, fan: string, fan2: string, reviewId: string, commentId: string;

beforeAll(async () => {
  author = (await db.user.create({ data: { email: `la-${suffix}@test.local`, displayName: "Author", passwordHash: "x" } })).id;
  fan = (await db.user.create({ data: { email: `lb-${suffix}@test.local`, displayName: "Fan", passwordHash: "x" } })).id;
  fan2 = (await db.user.create({ data: { email: `lc-${suffix}@test.local`, displayName: "Fan2", passwordHash: "x" } })).id;
  const book = await db.book.create({ data: { workId, title: "Like Book", authors: ["T"] } });
  reviewId = (await db.review.create({ data: { userId: author, bookId: book.id, rating: 5, body: "Review" } })).id;
  commentId = (await db.comment.create({ data: { reviewId, userId: author, body: "Comment" } })).id;
});
afterAll(async () => {
  await db.book.deleteMany({ where: { workId } });
  await db.user.deleteMany({ where: { id: { in: [author, fan, fan2] } } });
  await db.$disconnect();
});

describe("review likes", () => {
  it("toggles a like on and off", async () => {
    expect(await toggleReviewLike(fan, reviewId)).toBe(workId);
    expect((await reviewLikes([reviewId], fan)).get(reviewId)).toEqual({ count: 1, liked: true });
    await toggleReviewLike(fan, reviewId);
    expect((await reviewLikes([reviewId], fan)).get(reviewId)).toBeUndefined();
  });
  it("counts likes from several readers and reports who liked", async () => {
    await toggleReviewLike(fan, reviewId);
    await toggleReviewLike(fan2, reviewId);
    expect((await reviewLikes([reviewId], fan)).get(reviewId)).toEqual({ count: 2, liked: true });
    expect((await reviewLikes([reviewId], author)).get(reviewId)).toEqual({ count: 2, liked: false });
    expect((await reviewLikes([reviewId])).get(reviewId)?.liked).toBe(false);
  });
  it("blocks self-likes and ignores missing reviews", async () => {
    await expect(toggleReviewLike(author, reviewId)).rejects.toBeInstanceOf(OwnContentError);
    expect(await toggleReviewLike(fan, "missing")).toBeNull();
  });
});

describe("comment likes", () => {
  it("toggles, counts and blocks self-likes", async () => {
    await toggleCommentLike(fan, commentId);
    await toggleCommentLike(fan2, commentId);
    expect((await commentLikes([commentId], fan)).get(commentId)).toEqual({ count: 2, liked: true });
    await toggleCommentLike(fan2, commentId);
    expect((await commentLikes([commentId], fan2)).get(commentId)).toEqual({ count: 1, liked: false });
    await expect(toggleCommentLike(author, commentId)).rejects.toBeInstanceOf(OwnContentError);
  });
  it("cascades when the comment or review is deleted", async () => {
    await db.comment.delete({ where: { id: commentId } });
    expect(await db.commentLike.count({ where: { commentId } })).toBe(0);
    await db.review.delete({ where: { id: reviewId } });
    expect(await db.reviewLike.count({ where: { reviewId } })).toBe(0);
  });
});
