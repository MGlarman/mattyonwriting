import { cookies } from "next/headers";
import { cache } from "react";
import { destroySession, SESSION_SECONDS, userForSession } from "@/lib/auth-core";

export const SESSION_COOKIE = "bookreviews_session";
export const getUser = cache(async () => userForSession((await cookies()).get(SESSION_COOKIE)?.value));
export async function setSessionCookie(token: string) {
  const jar = await cookies();
  const previous = jar.get(SESSION_COOKIE)?.value;
  if (previous) await destroySession(previous);
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: SESSION_SECONDS,
    secure: process.env.APP_URL?.startsWith("https://") ?? process.env.NODE_ENV === "production",
  });
}
