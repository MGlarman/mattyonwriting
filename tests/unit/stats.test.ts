import { describe, expect, it } from "vitest";
import { computeStats, type StatsItem } from "@/lib/stats";

const now = new Date(2026, 9, 15);
const item = (status: StatsItem["status"], updatedAt: Date, book: Partial<StatsItem["book"]> = {}): StatsItem =>
  ({ status, updatedAt, book: { title: "T", authors: ["A"], firstYear: null, subjects: [], ...book } });

describe("computeStats", () => {
  it("counts books per status and per month, oldest month first", () => {
    const stats = computeStats([
      item("READ", new Date(2026, 9, 2)), item("READ", new Date(2026, 9, 9)), item("READ", new Date(2026, 7, 1)),
      item("READ", new Date(2024, 0, 1)), item("READING", new Date(2026, 9, 1)), item("TO_READ", new Date(2026, 9, 1)),
    ], [], now);
    expect(stats.counts).toEqual({ READ: 4, READING: 1, TO_READ: 1 });
    expect(stats.months).toHaveLength(12);
    expect(stats.months[0]).toMatchObject({ year: 2025, month: 10, count: 0 });
    expect(stats.months[11]).toMatchObject({ month: 9, label: "Oct", count: 2 });
    expect(stats.months[9].count).toBe(1); // August
    expect(stats.readThisYear).toBe(3); // the 2024 book is outside the window and the year
  });
  it("groups finished books by genre and ranks repeat authors", () => {
    const stats = computeStats([
      item("READ", now, { authors: ["Tolkien"], subjects: ["Fantasy fiction"] }), item("READ", now, { authors: ["Tolkien"], subjects: ["Fantasy"] }),
      item("READ", now, { authors: ["Gibson"], subjects: ["Science fiction"] }), item("TO_READ", now, { subjects: ["Fantasy"] }),
    ], [], now);
    expect(stats.genres).toEqual([{ genre: "Fantasy", count: 2 }, { genre: "Science fiction", count: 1 }]);
    expect(stats.authors).toEqual([{ name: "Tolkien", count: 2 }]);
  });
  it("summarises ratings and the oldest and newest finished books", () => {
    const stats = computeStats([
      item("READ", now, { title: "Old", firstYear: 1954 }), item("READ", now, { title: "New", firstYear: 1984 }), item("READ", now, { title: "Undated" }),
    ], [5, 4, 4], now);
    expect(stats.ratings.average).toBeCloseTo(13 / 3);
    expect(stats.ratings.distribution.find(r => r.stars === 4)?.count).toBe(2);
    expect(stats.oldest).toEqual({ title: "Old", year: 1954 });
    expect(stats.newest).toEqual({ title: "New", year: 1984 });
  });
  it("handles an empty history", () => {
    const stats = computeStats([], [], now);
    expect(stats.ratings.average).toBeNull();
    expect(stats.oldest).toBeNull();
    expect(stats.genres).toEqual([]);
  });
});
