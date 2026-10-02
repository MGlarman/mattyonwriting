CREATE TABLE "Comment" (
  "id" TEXT PRIMARY KEY, "reviewId" TEXT NOT NULL REFERENCES "Review"("id") ON DELETE CASCADE,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "body" TEXT NOT NULL CHECK (char_length(btrim("body")) BETWEEN 1 AND 1000),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "Comment_reviewId_createdAt_idx" ON "Comment"("reviewId", "createdAt");
CREATE INDEX "Comment_userId_idx" ON "Comment"("userId");
