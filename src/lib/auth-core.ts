import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import { db } from "@/lib/db";

export const SESSION_SECONDS = 60 * 60 * 24 * 14;
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const hashPassword = (password: string) => argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
export async function checkPassword(hash: string, password: string) {
  try { return await argon2.verify(hash, password); } catch { return false; }
}
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000);
  await db.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });
  return { token, expiresAt };
}
export async function userForSession(token?: string) {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = await db.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: { select: { id: true, displayName: true } } } });
  return session && session.expiresAt > new Date() ? session.user : null;
}
export async function destroySession(token: string) {
  await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
}
export async function allowAuthAttempt(email: string) {
  const key = hashToken(`auth:${email}`);
  const result = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "AuthAttempt" ("key", "count", "windowStart") VALUES (${key}, 1, NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "AuthAttempt"."windowStart" < NOW() - INTERVAL '15 minutes' THEN 1 ELSE "AuthAttempt"."count" + 1 END,
      "windowStart" = CASE WHEN "AuthAttempt"."windowStart" < NOW() - INTERVAL '15 minutes' THEN NOW() ELSE "AuthAttempt"."windowStart" END
    RETURNING "count"`;
  return result[0].count <= 8;
}
