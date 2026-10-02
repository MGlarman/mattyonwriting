import { describe, expect, it } from "vitest";
import { checkPassword, hashPassword, hashToken } from "@/lib/auth-core";

describe("hashToken", () => {
  it("is deterministic sha256 hex", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });
});

describe("password hashing", () => {
  it("verifies the right password and rejects the wrong one", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(hash).toContain("$argon2id$");
    expect(await checkPassword(hash, "correct horse battery")).toBe(true);
    expect(await checkPassword(hash, "wrong password!!")).toBe(false);
  });
  it("returns false for a malformed hash", async () => {
    expect(await checkPassword("not-a-hash", "x")).toBe(false);
  });
});
