import { describe, expect, it } from "vitest";
import { detectSeries, formatSeries, nextEntry, searchHref, seriesHref } from "@/lib/series";

const editions = (...lists: string[][]) => lists.map(series => ({ series }));

describe("detectSeries", () => {
  it("picks the series that several editions agree on, ignoring numbering and spelling", () => {
    expect(detectSeries(editions(["Dune (1)"], ["Dune (1)"], ["Dune, Book 1;"], ["The Dune Chronicles, Book 1;"], ["Duna #1"], ["Meulenhoff SF"]))?.name).toBe("Dune");
  });
  it("merges variants like Trilogy and numbered volumes", () => {
    expect(detectSeries(editions(["Sprawl Trilogy"], ["Heyne Allgemeine Reihe 8449; Sprawl #1"], ["Oscar classici moderni"], ["De bolsillo"]))?.name).toBe("Sprawl Trilogy");
    expect(detectSeries(editions(["Lord of the rings -- 1"], ["His The Lord of the Rings"], ["The lord of the rings / J. R. R. Tolkien -- pt. 1"]))?.name).toBe("The Lord of the Rings");
  });
  it("splits combined series fields on semicolons and counts an edition once per series", () => {
    expect(detectSeries(editions(["Dune (1); Dune Chronicles, Book 1"]))).toBeNull();
    expect(detectSeries(editions(["Dune (1); Dune Chronicles, Book 1"], ["Dune (2)"]))?.name).toBe("Dune");
  });
  it("ignores publisher imprints, non-English and one-off values", () => {
    expect(detectSeries(editions(["Puffin books"], ["Puffin books"], ["Ace SF"], ["Ace SF"], ["Sf Masterworks"], ["Sf Masterworks"]))).toBeNull();
    expect(detectSeries(editions(["Senhor dos Anéis"], ["Senhor dos Anéis"]))).toBeNull();
    expect(detectSeries(editions(["Hainish Cycle, #4"], ["Oscar Moderni Cult"]))).toBeNull();
  });
  it("reports the book number when editions agree on it", () => {
    expect(detectSeries(editions(["Dune (1)"], ["Dune, Book 1;"], ["Duna #1"]))).toEqual({ name: "Dune", number: 1 });
    expect(detectSeries(editions(["Lord of the rings -- 2"], ["The lord of the rings / J. R. R. Tolkien -- pt. 2"]))).toEqual({ name: "The lord of the rings", number: 2 });
  });
  it("leaves the number empty when editions disagree or give none", () => {
    expect(detectSeries(editions(["Dune (1)"], ["Dune (2)"]))).toEqual({ name: "Dune", number: null });
    expect(detectSeries(editions(["Discworld"], ["Discworld"]))).toEqual({ name: "Discworld", number: null });
  });
  it("formats a series with its number", () => {
    expect(formatSeries("Dune", 2)).toBe("Dune #2");
    expect(formatSeries("Dune", null)).toBe("Dune");
  });
  it("copes with missing or malformed data", () => {
    expect(detectSeries([])).toBeNull();
    expect(detectSeries([{}, { series: "nope" }, { series: [1, null] }])).toBeNull();
  });
});

describe("series helpers", () => {
  it("builds links and finds the next numbered entry", () => {
    expect(seriesHref("Lord of the Rings")).toBe("/series/Lord%20of%20the%20Rings");
    expect(searchHref("Dune Messiah", ["Frank Herbert"])).toBe("/search?q=Dune%20Messiah%20Frank%20Herbert");
    const entries = [{ number: 1, title: "A" }, { number: 2, title: "B" }, { number: 4, title: "D" }];
    expect(nextEntry(entries, 1)?.title).toBe("B");
    expect(nextEntry(entries, 2)?.title).toBe("D");
    expect(nextEntry(entries, 4)).toBeNull();
  });
});
