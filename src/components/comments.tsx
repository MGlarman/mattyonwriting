"use client";
import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, Send } from "lucide-react";
import { addCommentAction, deleteCommentAction } from "@/app/actions";
import { LikeButton } from "@/components/like-button";

export type CommentView = { id: string; body: string; createdAt: string; author: string; mine: boolean; likes: number; liked: boolean };

export function CommentThread({ reviewId, comments, signedIn, loginHref }: { reviewId: string; comments: CommentView[]; signedIn: boolean; loginHref: string }) {
  const [open, setOpen] = useState(false);
  const label = comments.length ? `${comments.length} ${comments.length === 1 ? "comment" : "comments"}` : "Comment";
  return <div className="comments">
    <button type="button" className="comments-toggle" aria-expanded={open} onClick={() => setOpen(value => !value)}><MessageCircle size={16} />{label}</button>
    {open && <div className="comments-body">
      {comments.map(comment => <CommentItem key={comment.id} comment={comment} signedIn={signedIn} loginHref={loginHref} />)}
      {signedIn ? <CommentForm reviewId={reviewId} /> : <p className="comments-signin"><Link href={loginHref} className="text-link">Sign in</Link> to join the conversation.</p>}
    </div>}
  </div>;
}
function CommentItem({ comment, signedIn, loginHref }: { comment: CommentView; signedIn: boolean; loginHref: string }) {
  const [state, action, pending] = useActionState(deleteCommentAction, {});
  return <div className="comment">
    <span className="avatar avatar-small">{comment.author[0].toUpperCase()}</span>
    <div><strong>{comment.author}{comment.mine && <span className="you-label">You</span>}</strong><small>{new Date(comment.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</small>
      <p>{comment.body}</p>
      <div className="comment-actions"><LikeButton kind="comment" targetId={comment.id} count={comment.likes} liked={comment.liked} mode={!signedIn ? "signin" : comment.mine ? "own" : "toggle"} loginHref={loginHref} />
      {comment.mine && <form action={action}><input type="hidden" name="commentId" value={comment.id} /><button type="submit" disabled={pending} className="comment-delete">{pending ? "Deleting…" : "Delete"}</button></form>}</div>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
    </div>
  </div>;
}
function CommentForm({ reviewId }: { reviewId: string }) {
  const [state, action, pending] = useActionState(addCommentAction, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.success) formRef.current?.reset(); }, [state]);
  return <form ref={formRef} action={action} className="comment-form">
    <input type="hidden" name="reviewId" value={reviewId} />
    <label className="sr-only" htmlFor={`comment-${reviewId}`}>Add a comment</label>
    <textarea id={`comment-${reviewId}`} name="body" rows={2} maxLength={1000} required placeholder="Add a thoughtful reply…" />
    <button className="button button-small" disabled={pending}>{pending ? "Posting…" : "Post"}<Send size={14} /></button>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
  </form>;
}
