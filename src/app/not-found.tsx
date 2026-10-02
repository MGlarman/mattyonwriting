import Link from "next/link";
export default function NotFound() { return <div className="container page-section"><div className="empty-state"><h1>This page is off the shelf.</h1><p>We couldn’t find the page you’re looking for.</p><Link href="/" className="button">Back to discover</Link></div></div>; }
