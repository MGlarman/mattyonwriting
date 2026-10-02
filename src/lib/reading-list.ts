import { db } from "@/lib/db";

export const READING_STATUSES = ["READING", "TO_READ", "READ"] as const;
export type ReadingStatusValue = (typeof READING_STATUSES)[number];
export const STATUS_LABELS: Record<ReadingStatusValue, string> = { READING: "Reading", TO_READ: "To read", READ: "Read" };

export async function setReadingStatus(userId: string, bookId: string, status: ReadingStatusValue) {
  return db.readingListItem.upsert({
    where: { userId_bookId: { userId, bookId } },
    create: { userId, bookId, status }, update: { status },
  });
}
export async function removeFromReadingList(userId: string, bookId: string) {
  return db.readingListItem.deleteMany({ where: { userId, bookId } });
}
