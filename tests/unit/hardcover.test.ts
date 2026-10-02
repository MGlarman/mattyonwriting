import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchHardcoverSeries, parseSeriesEntries } from "@/lib/hardcover";

const reply = (books: unknown[]) => new Response(JSON.stringify({ data: { books } }));
const dune = { cached_contributors: [{ author: { name: "Frank Herbert" } }], book_series: [{ position: 1, series: { name: "Dune" } }] };

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("fetchHardcoverSeries", () => {
  it("does nothing without a token", async () => {
    vi.stubEnv("HARDCOVER_API_TOKEN", "");
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    expect(await fetchHardcoverSeries("Dune", ["Frank Herbert"])).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("returns the series and position for the book written by our author", async () => {
    vi.stubEnv("HARDCOVER_API_TOKEN", "abc");
    const other = { cached_contributors: [{ author: { name: "Someone Else" } }], book_series: [{ position: 9, series: { name: "Wrong" } }] };
    const fetchMock = vi.fn().mockResolvedValue(reply([other, dune])); vi.stubGlobal("fetch", fetchMock);
    expect(await fetchHardcoverSeries("Dune", ["frank herbert"])).toEqual({ name: "Dune", number: 1 });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer abc");
  });
  it("returns null on no author match, API errors or malformed data", async () => {
    vi.stubEnv("HARDCOVER_API_TOKEN", "Bearer abc");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply([dune])));
    expect(await fetchHardcoverSeries("Dune", ["Brian Herbert"])).toBeNull();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 500 })));
    expect(await fetchHardcoverSeries("Dune", ["Frank Herbert"])).toBeNull();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}")));
    expect(await fetchHardcoverSeries("Dune", ["Frank Herbert"])).toBeNull();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect(await fetchHardcoverSeries("Dune", ["Frank Herbert"])).toBeNull();
  });
});

describe("parseSeriesEntries", () => {
  const reply = (series: unknown[]) => ({ data: { series } });
  const entry = (position: number | null, title: string, users: number | null) => ({ position, book: { title, users_count: users } });
  it("keeps whole positions only, preferring the most-read book at each", () => {
    const json = reply([{ author: { name: "Frank Herbert" }, book_series: [entry(1, "A Dűne", 1), entry(1, "Dune", 14000), entry(1.1, "Arakis", 0), entry(2, "Dune Messiah", 4800), entry(null, "Box set", 3)] }]);
    expect(parseSeriesEntries(json, ["Frank Herbert"])).toEqual([{ number: 1, title: "Dune" }, { number: 2, title: "Dune Messiah" }]);
  });
  it("prefers the series by our author and skips empty ones", () => {
    const json = reply([
      { author: null, book_series: [] },
      { author: { name: "Someone Else" }, book_series: [entry(1, "Wrong", 5)] },
      { author: { name: "William Gibson" }, book_series: [entry(1, "Neuromancer", 6000)] },
    ]);
    expect(parseSeriesEntries(json, ["William Gibson"])).toEqual([{ number: 1, title: "Neuromancer" }]);
    expect(parseSeriesEntries(json, ["Nobody"])).toEqual([{ number: 1, title: "Wrong" }]);
  });
  it("returns nothing for malformed data", () => {
    expect(parseSeriesEntries({}, [])).toEqual([]);
    expect(parseSeriesEntries(null, [])).toEqual([]);
  });
});
