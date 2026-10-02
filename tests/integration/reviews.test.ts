import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { allowAuthAttempt, createSession, destroySession, hashToken, userForSession } from "@/lib/auth-core";
import { bookStats, deleteOwnedReview, getOrImportBook, saveOwnedReview } from "@/lib/books";

const suffix = Date.now().toString(36);
const workId = "OL999999999W";
let userA: string, userB: string, bookId: string;

beforeAll(async () => {
  userA = (await db.user.create({ data: { email: `a-${suffix}@test.local`, displayName: "A", passwordHash: "x" } })).id;
  userB = (await db.user.create({ data: { email: `b-${suffix}@test.local`, displayName: "B", passwordHash: "x" } })).id;
  bookId = (await db.book.create({ data: { workId, title: "Integration Book", authors: ["Tester"] } })).id;
});
afterAll(async () => {
  await db.book.deleteMany({ where: { workId } });
  await db.user.deleteMany({ where: { id: { in: [userA, userB] } } });
  await db.authAttempt.deleteMany({ where: { key: hashToken(`auth:throttle-${suffix}@test.local`) } });
  await db.$disconnect();
});

describe("reviews", () => {
  it("upserts one review per user and book", async () => {
    await saveOwnedReview(userA, bookId, 4, "First");
    await saveOwnedReview(userA, bookId, 2, "Edited");
    expect(await db.review.count({ where: { userId: userA, bookId } })).toBe(1);
    expect((await db.review.findFirstOrThrow({ where: { userId: userA, bookId } })).body).toBe("Edited");
  });
  it("computes average and count", async () => {
    await saveOwnedReview(userB, bookId, 5, "Loved it");
    expect(await bookStats(bookId)).toEqual({ average: 3.5, count: 2 });
  });
  it("rejects out-of-range ratings at the database", async () => {
    await expect(db.review.create({ data: { userId: userA, bookId: (await db.book.create({ data: { workId: "OL999999998W", title: "t", authors: [] } })).id, rating: 9, body: "x" } })).rejects.toThrow();
    await db.book.deleteMany({ where: { workId: "OL999999998W" } });
  });
  it("only lets owners delete their reviews", async () => {
    const review = await db.review.findFirstOrThrow({ where: { userId: userA, bookId } });
    expect((await deleteOwnedReview(userB, review.id)).count).toBe(0);
    expect((await deleteOwnedReview(userA, review.id)).count).toBe(1);
  });
  it("returns an already stored book without hitting the catalog", async () => {
    expect((await getOrImportBook(workId)).id).toBe(bookId);
  });
});

describe("sessions and throttling", () => {
  it("creates, resolves and destroys a session", async () => {
    const { token } = await createSession(userA);
    expect((await userForSession(token))?.id).toBe(userA);
    await destroySession(token);
    expect(await userForSession(token)).toBeNull();
  });
  it("blocks the ninth attempt within the window", async () => {
    const email = `throttle-${suffix}@test.local`;
    for (let i = 0; i < 8; i++) expect(await allowAuthAttempt(email)).toBe(true);
    expect(await allowAuthAttempt(email)).toBe(false);
  });
});
