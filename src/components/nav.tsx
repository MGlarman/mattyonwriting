"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, ArrowUpRight, LogOut } from "lucide-react";
import { logoutAction } from "@/app/actions";

export function Nav({ user }: { user: { displayName: string } | null }) {
  const path = usePathname();
  return <header className="site-header"><div className="container nav-inner">
    <Link href="/" className="logo" aria-label="BookReviews home"><span className="logo-mark"><BookOpen size={23} strokeWidth={1.8} /></span>book<span className="logo-light">reviews</span><span className="logo-dot">.</span></Link>
    <nav aria-label="Main navigation"><Link className={path === "/" || path.startsWith("/search") || path.startsWith("/books") ? "nav-active" : ""} href="/">Discover</Link><Link className={path.startsWith("/map") ? "nav-active" : ""} href="/map">Map</Link><Link className={path === "/my-reviews" ? "nav-active" : ""} href="/my-reviews">My reviews</Link><Link className={path === "/my-books" ? "nav-active" : ""} href="/my-books">My books</Link><Link className={path === "/stats" ? "nav-active" : ""} href="/stats">Stats</Link><Link className={path === "/dna" ? "nav-active" : ""} href="/dna">DNA</Link></nav>
    <div className="nav-account">{user ? <><span className="nav-name">Hi, {user.displayName.split(" ")[0]}</span><form action={logoutAction}><button className="logout-button" aria-label="Sign out"><LogOut size={18} /></button></form></> : <><Link href="/login" className="login-link">Sign in</Link><Link href="/signup" className="button button-small">Join the community <ArrowUpRight size={16} /></Link></>}</div>
  </div></header>;
}
