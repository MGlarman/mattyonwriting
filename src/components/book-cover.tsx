"use client";
import Image from "next/image";
import { useState } from "react";
import { BookOpen } from "lucide-react";

export function BookCover({ title, authors, coverId, className = "", priority = false }: { title: string; authors: string[]; coverId?: number | null; className?: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  const colors = ["#243e45", "#8c3b39", "#4f516d", "#b88843", "#41655d", "#554438"];
  const color = colors[Array.from(title).reduce((sum, c) => sum + c.charCodeAt(0), 0) % colors.length];
  return <div className={`book-cover ${className}`} style={{ backgroundColor: color }}>
    {coverId && !failed ? <Image src={`https://covers.openlibrary.org/b/id/${coverId}-L.jpg?default=false`} alt={`${title} book cover`} fill sizes="(max-width: 600px) 45vw, 220px" unoptimized priority={priority} onError={() => setFailed(true)} />
      : <div className="cover-placeholder"><BookOpen size={28} aria-hidden="true" /><span>{title}</span><small>{authors.join(", ")}</small></div>}
  </div>;
}
