import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import { AuthForm } from "@/components/auth-form";
import { getUser } from "@/lib/auth";
import { safeReturnTo } from "@/lib/validation";
export const metadata = { title: "Sign in" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const returnTo = safeReturnTo((await searchParams).returnTo);
  if (await getUser()) redirect(returnTo);
  return <div className="container auth-page"><aside className="auth-story"><BookOpen size={48} strokeWidth={1.2} /><div className="eyebrow">WELCOME BACK, READER</div><h2>There’s always<br />another chapter.</h2><p>Your books, your thoughts, your corner of the reading world.</p><span className="auth-decoration">✦</span></aside><section className="auth-content"><div className="eyebrow">PICK UP WHERE YOU LEFT OFF</div><h1>Good to see you again.</h1><p>Sign in and join the conversation.</p><AuthForm mode="login" returnTo={returnTo} /></section></div>;
}
