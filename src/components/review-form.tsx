"use client";
import { useActionState, useState } from "react";
import { Star, Send, CheckCircle2 } from "lucide-react";
import { saveReviewAction, deleteReviewAction } from "@/app/actions";

const labels = ["Choose a rating", "Not for me", "It was okay", "I liked it", "I really liked it", "I loved it"];
export function ReviewForm({ workId, review }: { workId: string; review?: { rating: number; body: string } | null }) {
  const [rating, setRating] = useState(review?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [body, setBody] = useState(review?.body ?? "");
  const [state, action, pending] = useActionState(saveReviewAction, {});
  return <form action={action} className="review-form">
    <input type="hidden" name="workId" value={workId} />
    <fieldset className="rating-field"><legend>Your rating</legend><div className="star-picker" onMouseLeave={() => setHover(0)}>{[1, 2, 3, 4, 5].map(value => <label key={value} onMouseEnter={() => setHover(value)}>
      <input type="radio" name="rating" value={value} checked={rating === value} onChange={() => setRating(value)} required aria-label={`${value} ${value === 1 ? "star" : "stars"}`} />
      <Star size={34} fill={value <= (hover || rating) ? "currentColor" : "none"} className={value <= (hover || rating) ? "selected-star" : ""} aria-hidden="true" />
    </label>)}<span aria-live="polite">{labels[hover || rating]}</span></div></fieldset>
    <label htmlFor="review-body">Your review</label><textarea id="review-body" name="body" value={body} onChange={event => setBody(event.target.value)} placeholder="What stayed with you? Share your thoughts with fellow readers…" required maxLength={5000} rows={6} />
    <div className="review-form-bottom"><span className="character-count">{body.length.toLocaleString()} / 5,000</span><button className="button" disabled={pending}>{pending ? "Saving…" : review ? "Save changes" : "Publish review"}<Send size={16} /></button></div>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    {state.success && <p className="form-success" role="status"><CheckCircle2 size={17} />{state.success}</p>}
  </form>;
}
export function DeleteReviewButton({ reviewId }: { reviewId: string }) {
  const [state, action, pending] = useActionState(deleteReviewAction, {});
  const [confirming, setConfirming] = useState(false);
  return <div className="delete-review">{confirming ? <form action={action}><input type="hidden" name="reviewId" value={reviewId} /><span>Delete this review?</span><button type="submit" disabled={pending} className="text-danger">{pending ? "Deleting…" : "Yes, delete"}</button><button type="button" onClick={() => setConfirming(false)}>Cancel</button></form> : <button type="button" onClick={() => setConfirming(true)}>Delete review</button>}{state.error && <p className="form-error" role="alert">{state.error}</p>}{state.success && <p role="status">{state.success}</p>}</div>;
}
