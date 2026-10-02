CREATE TYPE "ReadingStatus" AS ENUM ('TO_READ', 'READING', 'READ');
CREATE TABLE "ReadingListItem" (
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "bookId" TEXT NOT NULL REFERENCES "Book"("id") ON DELETE CASCADE,
  "status" "ReadingStatus" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  PRIMARY KEY ("userId", "bookId")
);
CREATE INDEX "ReadingListItem_userId_status_updatedAt_idx" ON "ReadingListItem"("userId", "status", "updatedAt");
