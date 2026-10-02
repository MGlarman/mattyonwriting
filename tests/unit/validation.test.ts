import { describe, expect, it } from "vitest";
import { commentSchema, loginSchema, reviewSchema, safeReturnTo, signupSchema } from "@/lib/validation";

describe("signupSchema", () => {
  const valid = { displayName: "Ada", email: "  Ada@Example.COM ", password: "a-long-enough-pass" };
  it("normalizes the email", () => {
    expect(signupSchema.parse(valid).email).toBe("ada@example.com");
  });
  it("rejects short passwords and names", () => {
    expect(signupSchema.safeParse({ ...valid, password: "short" }).success).toBe(false);
    expect(signupSchema.safeParse({ ...valid, displayName: "A" }).success).toBe(false);
  });
  it("rejects invalid emails", () => {
    expect(signupSchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requires a password", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
});

describe("reviewSchema", () => {
  const valid = { workId: "OL262758W", rating: "4", body: "  Great.  " };
  it("coerces rating and trims body", () => {
    expect(reviewSchema.parse(valid)).toEqual({ workId: "OL262758W", rating: 4, body: "Great." });
  });
  it.each(["0", "6", "2.5", "abc"])("rejects rating %s", rating => {
    expect(reviewSchema.safeParse({ ...valid, rating }).success).toBe(false);
  });
  it("rejects empty and oversized bodies", () => {
    expect(reviewSchema.safeParse({ ...valid, body: "   " }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...valid, body: "x".repeat(5001) }).success).toBe(false);
    expect(reviewSchema.safeParse({ ...valid, body: "x".repeat(5000) }).success).toBe(true);
  });
  it("rejects malformed work ids", () => {
    expect(reviewSchema.safeParse({ ...valid, workId: "../etc" }).success).toBe(false);
  });
});

describe("safeReturnTo", () => {
  it("allows book pages and my-reviews", () => {
    expect(safeReturnTo("/books/OL123W")).toBe("/books/OL123W");
    expect(safeReturnTo("/my-reviews")).toBe("/my-reviews");
  });
  it.each(["https://evil.com", "//evil.com", "/admin", "/books/abc", undefined, 42])("falls back for %s", value => {
    expect(safeReturnTo(value)).toBe("/my-reviews");
  });
});

describe("commentSchema", () => {
  it("trims and accepts normal comments", () => {
    expect(commentSchema.parse({ reviewId: "abc", body: "  Agreed!  " }).body).toBe("Agreed!");
  });
  it("rejects empty and oversized comments", () => {
    expect(commentSchema.safeParse({ reviewId: "abc", body: "   " }).success).toBe(false);
    expect(commentSchema.safeParse({ reviewId: "abc", body: "x".repeat(1001) }).success).toBe(false);
    expect(commentSchema.safeParse({ reviewId: "abc", body: "x".repeat(1000) }).success).toBe(true);
  });
});
