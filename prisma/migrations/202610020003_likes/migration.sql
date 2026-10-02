CREATE TABLE "ReviewLike" (
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "reviewId" TEXT NOT NULL REFERENCES "Review"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("userId", "reviewId")
);
CREATE INDEX "ReviewLike_reviewId_idx" ON "ReviewLike"("reviewId");
CREATE TABLE "CommentLike" (
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "commentId" TEXT NOT NULL REFERENCES "Comment"("id") ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("userId", "commentId")
);
CREATE INDEX "CommentLike_commentId_idx" ON "CommentLike"("commentId");
