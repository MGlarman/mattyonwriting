import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import { AuthForm } from "@/components/auth-form";
import { getUser } from "@/lib/auth";
import { safeReturnTo } from "@/lib/validation";
export const metadata = { title: "Join the community" };
export default async function SignupPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const returnTo = safeReturnTo((await searchParams).returnTo);
  if (await getUser()) redirect(returnTo);
  return <div className="container auth-page"><aside className="auth-story"><BookOpen size={48} strokeWidth={1.2} /><div className="eyebrow">YOUR KIND OF BOOK CLUB</div><h2>For the books<br />you can’t stop<br />talking about.</h2><p>A place for every reader. A conversation for every story.</p><span className="auth-decoration">✦</span></aside><section className="auth-content"><div className="eyebrow">LET’S TURN THE FIRST PAGE</div><h1>Find your people.</h1><p>Create an account to rate books and share your reviews.</p><AuthForm mode="signup" returnTo={returnTo} /></section></div>;
}
