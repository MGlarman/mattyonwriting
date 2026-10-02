CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY, "email" TEXT NOT NULL UNIQUE, "displayName" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "Session" (
  "tokenHash" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE TABLE "Book" (
  "id" TEXT PRIMARY KEY, "workId" TEXT NOT NULL UNIQUE, "title" TEXT NOT NULL,
  "authors" TEXT[] NOT NULL, "coverId" INTEGER, "firstYear" INTEGER,
  "description" TEXT, "subjects" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "Review" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "bookId" TEXT NOT NULL REFERENCES "Book"("id") ON DELETE CASCADE,
  "rating" INTEGER NOT NULL CHECK ("rating" BETWEEN 1 AND 5),
  "body" TEXT NOT NULL CHECK (char_length(btrim("body")) BETWEEN 1 AND 5000),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Review_userId_bookId_key" UNIQUE ("userId", "bookId")
);
CREATE INDEX "Review_bookId_createdAt_idx" ON "Review"("bookId", "createdAt");
CREATE TABLE "AuthAttempt" (
  "key" TEXT PRIMARY KEY, "count" INTEGER NOT NULL DEFAULT 1,
  "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "AuthAttempt_windowStart_idx" ON "AuthAttempt"("windowStart");
