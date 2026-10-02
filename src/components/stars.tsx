import { Star } from "lucide-react";

export function Stars({ rating, size = 15 }: { rating: number; size?: number }) {
  return <span className="stars" role="img" aria-label={`${rating} out of 5 stars`}>{[1, 2, 3, 4, 5].map(value => <Star key={value} size={size} fill={value <= Math.round(rating) ? "currentColor" : "none"} className={value <= Math.round(rating) ? "" : "empty-star"} aria-hidden="true" />)}</span>;
}
