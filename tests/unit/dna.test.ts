import { describe, expect, it } from "vitest";
import { computeDna, eraOf, genreOf, type DnaItem } from "@/lib/dna";

const now = new Date(2026, 9, 15);
const item = (workId: string, book: Partial<DnaItem["book"]> = {}, status: DnaItem["status"] = "READ"): DnaItem =>
  ({ status, updatedAt: now, book: { workId, title: workId, authors: ["A"], firstYear: null, subjects: [], description: null, ...book } });

describe("genreOf", () => {
  it("picks the first matching genre by priority and falls back to Other", () => {
    expect(genreOf(["Fantasy fiction", "Mystery"])).toBe("Fantasy");
    expect(genreOf(["Detective and mystery stories"])).toBe("Mystery & crime");
    expect(genreOf(["Cooking"])).toBe("Other");
  });
});

describe("eraOf", () => {
  it("buckets years into eras", () => {
    expect([1799, 1850, 1949, 1950, 1999, 2015, 2024].map(eraOf)).toEqual(["Before 1800", "19th century", "1900–1949", "1950–1979", "1980–1999", "2010s", "2020s"]);
  });
});

describe("computeDna", () => {
  const items = [
    item("a", { subjects: ["Fantasy"], authors: ["Tolkien"], firstYear: 1954, description: "A quest across a land at war." }),
    item("b", { subjects: ["Fantasy"], authors: ["Tolkien"], firstYear: 1937 }),
    item("c", { subjects: ["Science fiction", "Japan"], authors: ["Gibson"], firstYear: 1984 }),
    item("d", { subjects: ["Mystery"], firstYear: 2015 }),
    item("e", { subjects: ["Fantasy"] }, "TO_READ"),
  ];
  const dna = computeDna(items, new Map([["a", 5], ["b", 4], ["c", 3]]), now);
  it("only counts finished books and computes genre shares", () => {
    expect(dna.total).toBe(4);
    expect(dna.genres.map(g => [g.label, g.pct])).toEqual([["Fantasy", 50], ["Mystery & crime", 25], ["Science fiction", 25]]);
  });
  it("detects themes and regions and ranks repeat authors", () => {
    expect(dna.themes.map(t => t.label)).toContain("War & conflict");
    expect(dna.regions.map(r => r.label)).toEqual(["Japan"]);
    expect(dna.authors).toEqual([{ name: "Tolkien", count: 2 }]);
  });
  it("summarises time and ratings", () => {
    expect(dna.span).toEqual({ from: 1937, to: 2015 });
    expect(dna.medianYear).toBe(1954);
    expect(dna.loved.genres).toEqual([{ label: "Fantasy", average: 4.5, count: 2 }]);
    expect(dna.summary).toMatch(/^Your reading world leans toward fantasy/);
  });
  it("handles an empty shelf", () => {
    const empty = computeDna([], new Map(), now);
    expect(empty).toMatchObject({ total: 0, summary: "", span: null, medianYear: null });
  });
});
