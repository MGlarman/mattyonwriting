"use client";
import { useActionState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { loginAction, signupAction } from "@/app/actions";

export function AuthForm({ mode, returnTo }: { mode: "login" | "signup"; returnTo: string }) {
  const signup = mode === "signup";
  const [state, action, pending] = useActionState(signup ? signupAction : loginAction, {});
  return <form action={action} className="auth-form">
    <input type="hidden" name="returnTo" value={returnTo} />
    {signup && <label>Your name<input name="displayName" autoComplete="name" placeholder="How should we call you?" required minLength={2} maxLength={50} /></label>}
    <label>Email address<input name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} /></label>
    <label>Password<input name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} placeholder={signup ? "At least 12 characters" : "Enter your password"} required minLength={signup ? 12 : 1} maxLength={128} /></label>
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    <button className="button" type="submit" disabled={pending}>{pending ? "Just a moment…" : signup ? "Create your account" : "Sign in"}<ArrowRight size={18} /></button>
    <p className="auth-switch">{signup ? "Already part of the community?" : "New around here?"} <Link href={`/${signup ? "login" : "signup"}?returnTo=${encodeURIComponent(returnTo)}`}>{signup ? "Sign in" : "Create an account"}</Link></p>
  </form>;
}
