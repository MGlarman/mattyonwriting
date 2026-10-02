"use client";
import { useActionState, useOptimistic, startTransition } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { toggleLikeAction } from "@/app/actions";

type Props = { kind: "review" | "comment"; targetId: string; count: number; liked: boolean; mode: "toggle" | "own" | "signin"; loginHref: string };

export function LikeButton({ kind, targetId, count, liked, mode, loginHref }: Props) {
  const [state, action] = useActionState(toggleLikeAction, {});
  const [optimistic, setOptimistic] = useOptimistic({ count, liked }, (current, next: boolean) => ({ liked: next, count: current.count + (next ? 1 : -1) }));
  const label = `${optimistic.count} ${optimistic.count === 1 ? "like" : "likes"}`;
  const body = <><Heart size={16} fill={optimistic.liked ? "currentColor" : "none"} aria-hidden="true" /><span>{optimistic.count > 0 ? optimistic.count : "Like"}</span></>;
  if (mode === "signin") return <Link href={loginHref} className="like-button" title="Sign in to like" aria-label={`${label}. Sign in to like`}>{body}</Link>;
  if (mode === "own") return <span className="like-button like-own" title={`You can’t like your own ${kind}`} aria-label={`${label}. You can’t like your own ${kind}`}>{body}</span>;
  return <form className="like-form" action={formData => { startTransition(() => setOptimistic(!optimistic.liked)); action(formData); }}>
    <input type="hidden" name="kind" value={kind} />
    <input type="hidden" name="targetId" value={targetId} />
    <button type="submit" className={`like-button${optimistic.liked ? " liked" : ""}`} aria-pressed={optimistic.liked} aria-label={optimistic.liked ? `Unlike. ${label}` : `Like. ${label}`}>{body}</button>
    {state.error && <span className="form-error" role="alert">{state.error}</span>}
  </form>;
}
