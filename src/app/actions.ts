"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getUser, SESSION_COOKIE, setSessionCookie } from "@/lib/auth";
import { allowAuthAttempt, checkPassword, createSession, destroySession, hashPassword } from "@/lib/auth-core";
import { deleteOwnedReview, getOrImportBook, saveOwnedReview } from "@/lib/books";
import { OwnContentError, toggleCommentLike, toggleReviewLike } from "@/lib/likes";
import { addComment, CommentLimitError, deleteOwnComment } from "@/lib/comments";
import { removeFromReadingList, setReadingStatus, STATUS_LABELS } from "@/lib/reading-list";
import { commentSchema, loginSchema, readingStatusSchema, reviewSchema, safeReturnTo, signupSchema, type ActionState } from "@/lib/validation";

async function trustedOrigin() {
  const request = await headers();
  const origin = request.get("origin");
  if (!origin) return false;
  const expected = process.env.APP_URL ?? "http://localhost:3000";
  try { return new URL(origin).origin === new URL(expected).origin; } catch { return false; }
}
function databaseError(error: unknown) {
  console.error("Database action failed:", error instanceof Error ? error.message : "Unknown error");
  return { error: "We couldn’t save your changes. Please try again." };
}
export async function signupAction(_: ActionState, form: FormData): Promise<ActionState> {
  if (!(await trustedOrigin())) return { error: "Invalid request. Refresh the page and try again." };
  const parsed = signupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    if (!(await allowAuthAttempt(parsed.data.email))) return { error: "Too many attempts. Please wait 15 minutes." };
    const user = await db.user.create({ data: { email: parsed.data.email, displayName: parsed.data.displayName, passwordHash: await hashPassword(parsed.data.password) } });
    await setSessionCookie((await createSession(user.id)).token);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return { error: "An account already exists with this email. Please sign in." };
    return databaseError(error);
  }
  redirect(safeReturnTo(form.get("returnTo")));
}
export async function loginAction(_: ActionState, form: FormData): Promise<ActionState> {
  if (!(await trustedOrigin())) return { error: "Invalid request. Refresh the page and try again." };
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    if (!(await allowAuthAttempt(parsed.data.email))) return { error: "Too many attempts. Please wait 15 minutes." };
    const user = await db.user.findUnique({ where: { email: parsed.data.email } });
    // Run password hashing even for unknown accounts to reduce timing differences.
    if (!user) { await hashPassword(parsed.data.password); return { error: "Email or password is incorrect." }; }
    if (!(await checkPassword(user.passwordHash, parsed.data.password))) return { error: "Email or password is incorrect." };
    await setSessionCookie((await createSession(user.id)).token);
  } catch (error) { return databaseError(error); }
  redirect(safeReturnTo(form.get("returnTo")));
}
export async function logoutAction() {
  if (!(await trustedOrigin())) return;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await destroySession(token);
  jar.delete(SESSION_COOKIE);
  redirect("/");
}
export async function saveReviewAction(_: ActionState, form: FormData): Promise<ActionState> {
  if (!(await trustedOrigin())) return { error: "Invalid request. Refresh the page and try again." };
  const user = await getUser();
  if (!user) return { error: "Please sign in to write a review." };
  const parsed = reviewSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    const book = await getOrImportBook(parsed.data.workId);
    await saveOwnedReview(user.id, book.id, parsed.data.rating, parsed.data.body);
  } catch (error) { return databaseError(error); }
  revalidatePath(`/books/${parsed.data.workId}`);
  revalidatePath("/");
  revalidatePath("/my-reviews");
  return { success: "Your review has been saved. Thanks for sharing your thoughts!" };
}
export async function deleteReviewAction(_: ActionState, form: FormData): Promise<ActionState> {
  if (!(await trustedOrigin())) return { error: "Invalid request. Refresh the page and try again." };
  const user = await getUser();
  if (!user) return { error: "Please sign in to manage your reviews." };
  const id = form.get("reviewId");
  if (typeof id !== "string") return { error: "Invalid review." };
  try {
    const review = await db.review.findFirst({ where: { id, userId: user.id }, select: { book: { select: { workId: true } } } });
    if (!review) return { error: "Review not found." };
    await deleteOwnedReview(user.id, id);
    revalidatePath(`/books/${review.book.workId}`);
    revalidatePath("/");
    revalidatePath("/my-reviews");
    return { success: "Your review has been deleted." };
  } catch (error) { return databaseError(error); }
}
export async function addCommentAction(_: ActionState, form: FormData): Promise<ActionState> {
  if (!(await trustedOrigin())) return { error: "Invalid request. Refresh the page and try again." };
  const user = await getUser();
  if (!user) return { error: "Please sign in to comment." };
  const parsed = commentSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    const workId = await addComment(user.id, parsed.data.reviewId, parsed.data.body);
    if (!workId) return { error: "That review no longer exists." };
    revalidatePath(`/books/${workId}`);
    return { success: "Comment posted." };
  } catch (error) {
    if (error instanceof CommentLimitError) return { error: error.message };
    return databaseError(error);
  }
}
export async function deleteCommentAction(_: ActionState, form: FormData): Promise<ActionState> {
  if (!(await trustedOrigin())) return { error: "Invalid request. Refresh the page and try again." };
  const user = await getUser();
  if (!user) return { error: "Please sign in to manage your comments." };
  const id = form.get("commentId");
  if (typeof id !== "string") return { error: "Invalid comment." };
  try {
    const workId = await deleteOwnComment(user.id, id);
    if (!workId) return { error: "Comment not found." };
    revalidatePath(`/books/${workId}`);
    return { success: "Comment deleted." };
  } catch (error) { return databaseError(error); }
}
export async function toggleLikeAction(_: ActionState, form: FormData): Promise<ActionState> {
  if (!(await trustedOrigin())) return { error: "Invalid request. Refresh the page and try again." };
  const user = await getUser();
  if (!user) return { error: "Please sign in to like." };
  const kind = form.get("kind");
  const id = form.get("targetId");
  if ((kind !== "review" && kind !== "comment") || typeof id !== "string" || !id) return { error: "Invalid request." };
  try {
    const workId = kind === "review" ? await toggleReviewLike(user.id, id) : await toggleCommentLike(user.id, id);
    if (!workId) return { error: "That item no longer exists." };
    revalidatePath(`/books/${workId}`);
    return {};
  } catch (error) {
    if (error instanceof OwnContentError) return { error: error.message };
    return databaseError(error);
  }
}
export async function setReadingStatusAction(_: ActionState, form: FormData): Promise<ActionState> {
  if (!(await trustedOrigin())) return { error: "Invalid request. Refresh the page and try again." };
  const user = await getUser();
  if (!user) return { error: "Please sign in to manage your lists." };
  const parsed = readingStatusSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    const book = await getOrImportBook(parsed.data.workId);
    if (parsed.data.status === "NONE") await removeFromReadingList(user.id, book.id);
    else await setReadingStatus(user.id, book.id, parsed.data.status);
  } catch (error) { return databaseError(error); }
  revalidatePath(`/books/${parsed.data.workId}`);
  revalidatePath("/my-books");
  return { success: parsed.data.status === "NONE" ? "Removed from your lists." : `Saved to “${STATUS_LABELS[parsed.data.status]}”.` };
}
