import { describe, expect, it } from "vitest";
import { genreOf, layoutMap, type MapBook } from "@/lib/map-layout";

const book = (id: string, over: Partial<MapBook> = {}): MapBook => ({ id, workId: `OL${id}W`, title: `Book ${id}`, authors: ["Author A"], firstYear: 1990, subjects: ["Fantasy"], coverId: null, reviews: 1, average: 4, ...over });

describe("genreOf", () => {
  it("classifies by subject, preferring fantasy then science fiction then classics", () => {
    expect(genreOf(["Fiction", "Fantasy"])).toBe("Fantasy");
    expect(genreOf(["Classics", "Science fiction"])).toBe("Science fiction");
    expect(genreOf(["English literature"])).toBe("Classics");
    expect(genreOf(["Cooking"])).toBe("Other");
    expect(genreOf([])).toBe("Other");
  });
});

describe("layoutMap", () => {
  it("handles no books", () => {
    const layout = layoutMap([]);
    expect(layout.nodes).toEqual([]);
    expect(layout.clusters).toEqual([]);
  });
  it("places every book exactly once, inside the canvas", () => {
    const books = [
      ...Array.from({ length: 6 }, (_, i) => book(`a${i}`, { firstYear: 1950 + i * 7 })),
      ...Array.from({ length: 4 }, (_, i) => book(`b${i}`, { authors: ["Author B"], subjects: ["Science fiction"], firstYear: 1960 + i * 11 })),
      book("c", { authors: ["Author C"], subjects: ["Classics"], firstYear: 1813 }),
      book("d", { authors: ["Author D"], subjects: [], firstYear: null }),
    ];
    const layout = layoutMap(books);
    expect(layout.nodes.map(n => n.id).sort()).toEqual(books.map(b => b.id).sort());
    for (const n of layout.nodes) {
      expect(Number.isFinite(n.x) && Number.isFinite(n.y)).toBe(true);
      expect(n.x).toBeGreaterThan(0);
      expect(n.x).toBeLessThan(layout.width);
      expect(n.y).toBeGreaterThan(0);
      expect(n.y).toBeLessThan(layout.height);
    }
  });
  it("makes one cluster per author within a genre when no series is set and puts older books higher", () => {
    const layout = layoutMap([book("1", { firstYear: 1937 }), book("2", { authors: ["Author B"], firstYear: 2005 }), book("3", { firstYear: 1954 })]);
    expect(layout.clusters).toHaveLength(2);
    const old = layout.clusters.find(c => c.label === "Author A")!;
    const recent = layout.clusters.find(c => c.label === "Author B")!;
    expect(old.y).toBeLessThan(recent.y);
    expect(old.count).toBe(2);
    expect(old.spiral).toMatch(/^M/);
  });
  it("clusters by series across authors and falls back to author when there is none", () => {
    const layout = layoutMap([
      book("1", { series: "Dune", authors: ["Frank Herbert"], subjects: ["Science fiction"], firstYear: 1965 }),
      book("2", { series: "dune", authors: ["Brian Herbert"], subjects: ["Science fiction"], firstYear: 1999 }),
      book("3", { authors: ["Frank Herbert"], subjects: ["Science fiction"], firstYear: 1977 }),
      book("4", { authors: ["Frank Herbert"], subjects: ["Science fiction"], firstYear: 1981 }),
    ]);
    const dune = layout.clusters.find(c => c.kind === "series")!;
    expect(dune.count).toBe(2);
    expect(dune.label).toBe("Dune");
    const fallback = layout.clusters.find(c => c.kind === "author")!;
    expect(fallback.count).toBe(2);
    expect(fallback.label).toBe("Frank Herbert");
  });
  it("keeps a series in one lane using the majority genre", () => {
    const layout = layoutMap([
      book("1", { series: "Odd", subjects: ["Fantasy"], firstYear: 1950 }),
      book("2", { series: "Odd", subjects: ["Science fiction"], firstYear: 1960 }),
      book("3", { series: "Odd", subjects: ["Science fiction"], firstYear: 1970 }),
    ]);
    expect(layout.clusters).toHaveLength(1);
    expect(layout.clusters[0].genre).toBe("Science fiction");
    expect(layout.lanes.map(l => l.genre)).toEqual(["Science fiction"]);
    expect(new Set(layout.nodes.map(n => n.genre))).toEqual(new Set(["Science fiction"]));
  });
  it("keeps clusters from overlapping", () => {
    const books = Array.from({ length: 8 }, (_, i) => book(`x${i}`, { authors: [`Author ${i}`], firstYear: 1980 }));
    const { clusters } = layoutMap(books);
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        expect(Math.hypot(clusters[i].x - clusters[j].x, clusters[i].y - clusters[j].y)).toBeGreaterThanOrEqual(clusters[i].radius + clusters[j].radius);
      }
    }
  });
  it("is deterministic and grows dots with review count", () => {
    const books = [book("1", { reviews: 1 }), book("2", { reviews: 5, authors: ["B"] })];
    expect(layoutMap(books)).toEqual(layoutMap(books));
    const [small, big] = layoutMap(books).nodes;
    expect(big.r).toBeGreaterThan(small.r);
  });
});
