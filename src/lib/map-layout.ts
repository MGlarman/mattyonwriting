export type Genre = "Fantasy" | "Science fiction" | "Classics" | "Other";
export const GENRES: Genre[] = ["Fantasy", "Science fiction", "Classics", "Other"];
export const GENRE_COLORS: Record<Genre, string> = { Fantasy: "#f0a94a", "Science fiction": "#a77bff", Classics: "#ec6fa3", Other: "#55c4dc" };

export type MapBook = { id: string; workId: string; title: string; authors: string[]; firstYear: number | null; subjects: string[]; coverId: number | null; series?: string | null; seriesNumber?: number | null; reviews: number; average: number | null };
export type MapNode = MapBook & { x: number; y: number; r: number; genre: Genre; clusterId: string };
export type MapCluster = { id: string; label: string; kind: "series" | "author"; x: number; y: number; radius: number; genre: Genre; count: number; spiral: string };
export type MapLayout = {
  width: number; height: number; plot: { left: number; right: number; top: number; bottom: number };
  nodes: MapNode[]; clusters: MapCluster[];
  lanes: { genre: Genre; x: number; width: number }[];
  ticks: { year: number; y: number }[];
  minYear: number; maxYear: number;
  stars: { x: number; y: number; r: number; o: number }[];
};

const WIDTH = 1000, HEIGHT = 760;
const PLOT = { left: 84, right: 970, top: 50, bottom: 690 };

export function genreOf(subjects: string[]): Genre {
  const s = subjects.map(subject => subject.toLowerCase());
  if (s.some(x => x.includes("fantasy"))) return "Fantasy";
  if (s.some(x => x.includes("science fiction") || x === "sci-fi")) return "Science fiction";
  if (s.some(x => /classic|literature/.test(x))) return "Classics";
  return "Other";
}
const median = (values: number[]) => { const v = [...values].sort((a, b) => a - b); return v.length ? v[Math.floor((v.length - 1) / 2)] : 0; };
const spiralPoint = (t: number, phase: number) => ({ x: (26 + 11 * Math.pow(t, 0.8)) * Math.cos(t * 1.0 + phase), y: (26 + 11 * Math.pow(t, 0.8)) * Math.sin(t * 1.0 + phase) });
function niceStep(range: number) {
  const raw = range / 5;
  return [1, 2, 5, 10, 20, 25, 50, 100, 200].find(step => step >= raw) ?? 200;
}
function seededRandom(seed: number) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

export function layoutMap(books: MapBook[]): MapLayout {
  const years = books.map(b => b.firstYear).filter((y): y is number => y !== null);
  let minYear = years.length ? Math.min(...years) : 1900, maxYear = years.length ? Math.max(...years) : 2025;
  if (maxYear - minYear < 20) { const mid = (minYear + maxYear) / 2; minYear = Math.floor(mid - 10); maxYear = Math.ceil(mid + 10); }
  const yearRange = maxYear - minYear;
  const innerTop = PLOT.top + 50, innerBottom = PLOT.bottom - 50;
  const yFor = (year: number) => innerTop + ((year - minYear) / yearRange) * (innerBottom - innerTop);
  const fallbackYear = years.length ? median(years) : minYear;

  // A series forms one cluster wherever its books were reviewed; books without a series fall back to
  // clustering by author within a genre. A series takes the lane of the majority genre of its books.
  const groups = new Map<string, { kind: "series" | "author"; label: string; books: MapBook[] }>();
  for (const book of books) {
    const series = book.series?.trim();
    const author = book.authors[0] ?? "Unknown author";
    const key = series ? `s|${series.toLowerCase()}` : `a|${genreOf(book.subjects)}|${author.toLowerCase()}`;
    const group = groups.get(key) ?? { kind: series ? "series" as const : "author" as const, label: series || author, books: [] };
    group.books.push(book);
    groups.set(key, group);
  }
  const majorityGenre = (group: MapBook[]) => {
    const counts = new Map<Genre, number>();
    for (const book of group) counts.set(genreOf(book.subjects), (counts.get(genreOf(book.subjects)) ?? 0) + 1);
    return GENRES.reduce((best, genre) => ((counts.get(genre) ?? 0) > (counts.get(best) ?? 0) ? genre : best), GENRES[0]);
  };
  const present = GENRES.filter(genre => [...groups.values()].some(g => majorityGenre(g.books) === genre));
  const laneWidth = present.length ? (PLOT.right - PLOT.left) / present.length : PLOT.right - PLOT.left;
  const lanes = present.map((genre, i) => ({ genre, x: PLOT.left + laneWidth * i, width: laneWidth }));

  type Draft = { id: string; label: string; kind: "series" | "author"; genre: Genre; lane: number; books: MapBook[]; x: number; y: number; radius: number; phase: number };
  const drafts: Draft[] = [...groups.values()].map((group, index) => {
    const sorted = [...group.books].sort((x, y) => (x.firstYear ?? fallbackYear) - (y.firstYear ?? fallbackYear) || x.title.localeCompare(y.title));
    const genre = majorityGenre(sorted);
    const radius = sorted.length === 1 ? 20 : 26 + 11 * Math.pow(sorted.length - 1, 0.8) + 14;
    return { id: `c${index}`, label: group.label, kind: group.kind, genre, lane: present.indexOf(genre), books: sorted, x: 0, y: yFor(median(sorted.map(x => x.firstYear ?? fallbackYear))), radius, phase: index * 1.3 };
  });

  // Spread the clusters of each lane horizontally, then relax overlaps.
  for (let lane = 0; lane < present.length; lane++) {
    const inLane = drafts.filter(d => d.lane === lane).sort((a, b) => a.y - b.y);
    const widest = Math.max(0, ...inLane.map(d => d.radius)), center = lanes[lane].x + laneWidth / 2;
    const columns = Math.max(1, Math.min(inLane.length, Math.floor(laneWidth / (widest * 2 + 30)), 3)), step = laneWidth / columns;
    inLane.forEach((draft, i) => { draft.x = center + ((i % columns) - (columns - 1) / 2) * step; });
  }
  const clampX = (d: Draft) => Math.min(PLOT.right - d.radius - 6, Math.max(PLOT.left + d.radius + 6, d.x));
  const clampY = (d: Draft) => Math.min(PLOT.bottom - d.radius - 6, Math.max(PLOT.top + d.radius + 6, d.y));
  for (let pass = 0; pass < 80; pass++) {
    let moved = false;
    for (let i = 0; i < drafts.length; i++) for (let j = i + 1; j < drafts.length; j++) {
      const a = drafts[i], b = drafts[j];
      const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy), min = a.radius + b.radius + 16;
      if (dist < min) {
        const coincident = dist < 0.01, angle = (i * 7 + j) * 2.4;
        const push = (min - dist) / 2 + 0.5, ux = coincident ? Math.cos(angle) : dx / dist, uy = coincident ? Math.sin(angle) : dy / dist;
        a.x -= ux * push; a.y -= uy * push; b.x += ux * push; b.y += uy * push; moved = true;
      }
    }
    for (const d of drafts) { d.x = clampX(d); d.y = clampY(d); }
    if (!moved) break;
  }

  const nodes: MapNode[] = [], clusters: MapCluster[] = [];
  for (const d of drafts) {
    d.books.forEach((book, i) => {
      const offset = i === 0 ? { x: 0, y: 0 } : spiralPoint(i, d.phase);
      nodes.push({ ...book, x: d.x + offset.x, y: d.y + offset.y, r: 4.5 + Math.min(6, book.reviews * 1.5), genre: d.genre, clusterId: d.id });
    });
    let spiral = "";
    if (d.books.length > 1) {
      const steps = Math.ceil((d.books.length - 1) / 0.25);
      spiral = Array.from({ length: steps + 1 }, (_, k) => { const p = spiralPoint(Math.max(0.01, (k * 0.25)), d.phase); return `${k === 0 ? "M" : "L"}${(d.x + p.x).toFixed(1)} ${(d.y + p.y).toFixed(1)}`; }).join(" ");
    }
    clusters.push({ id: d.id, label: d.label, kind: d.kind, x: d.x, y: d.y, radius: d.radius, genre: d.genre, count: d.books.length, spiral });
  }

  const step = niceStep(yearRange);
  const ticks: MapLayout["ticks"] = [];
  for (let year = Math.ceil(minYear / step) * step; year <= maxYear; year += step) ticks.push({ year, y: yFor(year) });

  const random = seededRandom(42);
  const stars = Array.from({ length: 110 }, () => ({ x: Math.round(random() * WIDTH), y: Math.round(random() * HEIGHT), r: 0.4 + random() * 1.1, o: 0.2 + random() * 0.6 }));
  return { width: WIDTH, height: HEIGHT, plot: PLOT, nodes, clusters, lanes, ticks, minYear, maxYear, stars };
}
