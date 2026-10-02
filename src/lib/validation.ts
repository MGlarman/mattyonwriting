import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.").max(254);
export const signupSchema = z.object({
  displayName: z.string().trim().min(2, "Your name must contain at least 2 characters.").max(50),
  email: emailSchema,
  password: z.string().min(12, "Use at least 12 characters for your password.").max(128),
});
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) });
export const reviewSchema = z.object({
  workId: z.string().regex(/^OL\d+W$/, "Invalid book."),
  rating: z.coerce.number().int().min(1, "Choose a star rating.").max(5),
  body: z.string().trim().min(1, "Write a few words about the book.").max(5000, "Reviews can contain up to 5,000 characters."),
});
export const commentSchema = z.object({
  reviewId: z.string().min(1).max(64),
  body: z.string().trim().min(1, "Write a few words before posting.").max(1000, "Comments can contain up to 1,000 characters."),
});
export type ActionState = { error?: string; success?: string };
export function safeReturnTo(value: unknown) {
  return typeof value === "string" && /^\/(books\/OL\d+W|my-reviews)\/?$/.test(value) ? value : "/my-reviews";
}
export const readingStatusSchema = z.object({
  workId: z.string().regex(/^OL\d+W$/, "Invalid book."),
  status: z.enum(["READING", "TO_READ", "READ", "NONE"], "Choose a list."),
});
