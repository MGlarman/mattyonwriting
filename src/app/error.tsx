"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) { return <div className="container page-section"><div className="empty-state"><h1>We lost our place.</h1><p>Something went wrong loading this page. Please try again.</p><button className="button" onClick={reset}>Try again</button><Link href="/" className="text-link">Back to home</Link></div></div>; }
