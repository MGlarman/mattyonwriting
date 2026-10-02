import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { addComment, COMMENTS_PER_REVIEW, CommentLimitError, commentsByReview, deleteOwnComment } from "@/lib/comments";

const suffix = Date.now().toString(36);
const workId = "OL999999997W";
let author: string, commenter: string, other: string, reviewId: string;

beforeAll(async () => {
  author = (await db.user.create({ data: { email: `ca-${suffix}@test.local`, displayName: "Author", passwordHash: "x" } })).id;
  commenter = (await db.user.create({ data: { email: `cb-${suffix}@test.local`, displayName: "Commenter", passwordHash: "x" } })).id;
  other = (await db.user.create({ data: { email: `cc-${suffix}@test.local`, displayName: "Other", passwordHash: "x" } })).id;
  const book = await db.book.create({ data: { workId, title: "Comment Book", authors: ["T"] } });
  reviewId = (await db.review.create({ data: { userId: author, bookId: book.id, rating: 4, body: "Review" } })).id;
});
afterAll(async () => {
  await db.book.deleteMany({ where: { workId } });
  await db.user.deleteMany({ where: { id: { in: [author, commenter, other] } } });
  await db.$disconnect();
});

describe("comments", () => {
  it("adds comments and groups them per review in order", async () => {
    expect(await addComment(commenter, reviewId, "First")).toBe(workId);
    await addComment(author, reviewId, "Second");
    const grouped = await commentsByReview([reviewId]);
    expect(grouped.get(reviewId)?.map(c => c.body)).toEqual(["First", "Second"]);
  });
  it("returns null for a missing review", async () => {
    expect(await addComment(commenter, "nope", "x")).toBeNull();
  });
  it("only lets authors delete their own comments", async () => {
    const [first] = (await commentsByReview([reviewId])).get(reviewId)!;
    expect(await deleteOwnComment(other, first.id)).toBeNull();
    expect(await deleteOwnComment(commenter, first.id)).toBe(workId);
    expect((await commentsByReview([reviewId])).get(reviewId)).toHaveLength(1);
  });
  it("rejects blank comments at the database", async () => {
    await expect(db.comment.create({ data: { reviewId, userId: commenter, body: "   " } })).rejects.toThrow();
  });
  it("enforces the per-review limit", async () => {
    const existing = await db.comment.count({ where: { reviewId } });
    await db.comment.createMany({ data: Array.from({ length: COMMENTS_PER_REVIEW - existing }, (_, i) => ({ reviewId, userId: commenter, body: `c${i}` })) });
    await expect(addComment(commenter, reviewId, "one too many")).rejects.toBeInstanceOf(CommentLimitError);
  });
  it("cascades when the review is deleted", async () => {
    await db.review.delete({ where: { id: reviewId } });
    expect(await db.comment.count({ where: { reviewId } })).toBe(0);
  });
});
