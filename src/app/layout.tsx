import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, ArrowUpRight } from "lucide-react";
import { getUser } from "@/lib/auth";
import { Nav } from "@/components/nav";
import "./globals.css";

export const metadata: Metadata = { title: { default: "BookReviews — A good book deserves a conversation", template: "%s | BookReviews" }, description: "Find your next great read. Discover books, share honest reviews, and rate your favorites with a community of readers." };
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getUser();
  return <html lang="en"><body><a href="#main" className="skip-link">Skip to content</a><Nav user={user} /><main id="main">{children}</main><footer className="site-footer"><div className="container footer-top"><Link href="/" className="logo"><BookOpen size={23} />book<span className="logo-light">reviews</span><span className="logo-dot">.</span></Link><p>Good books. Honest opinions. Your next chapter.</p><a href="https://openlibrary.org" target="_blank" rel="noreferrer">Books from Open Library <ArrowUpRight size={14} /></a></div><div className="container footer-bottom"><span>Made for the love of reading.</span><span>One book. A thousand perspectives.</span></div></footer></body></html>;
}
