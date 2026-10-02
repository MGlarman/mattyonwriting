import type { ReadingStatusValue } from "@/lib/reading-list";

export type DnaBook = { workId: string; title: string; authors: string[]; firstYear: number | null; subjects: string[]; description: string | null };
export type DnaItem = { status: ReadingStatusValue; updatedAt: Date; book: DnaBook };
export type Share = { label: string; count: number; pct: number };
export type Rated = { label: string; average: number; count: number };

// Keyword taxonomies matched against subjects (and, for themes and regions, the description). Order is priority for genres.
const GENRE_RULES: [string, RegExp][] = [
  ["Fantasy", /fantasy|magic|dragons|wizards/],
  ["Science fiction", /science fiction|sci-fi|dystopia|space (?:opera|travel)|cyberpunk|time travel/],
  ["Mystery & crime", /mystery|detective|crime|thriller|suspense|murder/],
  ["Horror & gothic", /horror|gothic|ghost|supernatural|vampire/],
  ["Romance", /romance|love stories/],
  ["Historical fiction", /historical fiction|history.*fiction|fiction.*histor/],
  ["Classics", /classic/],
  ["Young adult", /young adult|juvenile|children/],
  ["Non-fiction", /biograph|memoir|essays|nonfiction|non-fiction|history|science|philosoph|psycholog|self-help|politic|economic/],
  ["Literary fiction", /literary|literature|fiction|novel|short stories/],
];
export const THEME_RULES: [string, RegExp][] = [
  ["War & conflict", /\bwar\b|wars\b|battle|soldier|military|revolution/],
  ["Love & relationships", /\blove\b|romance|marriage|relationship|friendship/],
  ["Family", /family|families|mother|father|sibling|parent/],
  ["Identity & self", /identity|self-discovery|self-realization|personality/],
  ["Coming of age", /coming of age|adolescen|teenager|growing up|youth/],
  ["Power & politics", /politic|power|government|totalitarian|dictator|rebellion|empire/],
  ["Isolation & survival", /isolation|loneliness|survival|wilderness|castaway|alone/],
  ["Journey & adventure", /adventure|quest|journey|voyage|travel|explor/],
  ["Death & loss", /death|grief|loss|mortality|dying/],
  ["Good vs evil", /good and evil|evil|heroes|hero\b|redemption|sacrifice/],
  ["Magic & myth", /magic|myth|legend|folklore|gods|prophecy/],
  ["Society & class", /social|class|poverty|inequality|race relations|racism|slavery|feminis/],
  ["Technology & the future", /artificial intelligence|robot|technology|future|android|space/],
  ["Crime & justice", /crime|justice|murder|detective|law\b|prison/],
];
const REGION_RULES: [string, RegExp][] = [
  ["UK & Ireland", /english (?:fiction|literature|authors)|british|england|london|scotland|scottish|wales|welsh|ireland|irish/],
  ["North America", /american (?:fiction|literature|authors)|united states|new york|america\b|canad/],
  ["France", /french (?:fiction|literature)|france|paris/],
  ["Germany & Central Europe", /german|austria|switzerland|czech|prague|hungar|poland|polish/],
  ["Nordic", /danish|denmark|swedish|sweden|norwegian|norway|finnish|finland|iceland|scandinavia|nordic/],
  ["Russia & Eastern Europe", /russia|soviet|ukrain|romanian|bulgarian|balkan/],
  ["Southern Europe", /ital(?:y|ian)|spain|spanish|portug|greece|greek|rome|roman empire/],
  ["Japan", /japan/],
  ["China, Korea & East Asia", /chin(?:a|ese)|korea|taiwan|hong kong/],
  ["South Asia & Middle East", /india|pakistan|iran|persia|arab|israel|turk|middle east|afghan/],
  ["Africa", /africa|nigeria|egypt|kenya|ethiopia/],
  ["Latin America", /latin america|mexic|argentin|colombia|chile|brazil|cuba|peru/],
  ["Oceania", /australia|new zealand/],
];
export const GENRE_LABELS = GENRE_RULES.map(([label]) => label);

const ERAS: [string, (year: number) => boolean][] = [
  ["Before 1800", y => y < 1800], ["19th century", y => y < 1900], ["1900–1949", y => y < 1950], ["1950–1979", y => y < 1980],
  ["1980–1999", y => y < 2000], ["2000–2009", y => y < 2010], ["2010s", y => y < 2020], ["2020s", () => true],
];

export function genreOf(subjects: string[]): string {
  const text = subjects.join(" | ").toLowerCase();
  return GENRE_RULES.find(([, re]) => re.test(text))?.[0] ?? "Other";
}
const hits = (rules: [string, RegExp][], text: string) => rules.filter(([, re]) => re.test(text)).map(([label]) => label);
export const themesOf = (book: DnaBook) => hits(THEME_RULES, [...book.subjects, book.description ?? ""].join(" | ").toLowerCase());
export const regionsOf = (book: DnaBook) => hits(REGION_RULES, [...book.subjects, book.description ?? ""].join(" | ").toLowerCase());
export const eraOf = (year: number) => ERAS.find(([, test]) => test(year))![0];
export const decadeOf = (year: number) => Math.floor(year / 10) * 10;

function shares(counts: Map<string, number>, total: number, order?: string[], limit = Infinity): Share[] {
  const rows = [...counts.entries()].map(([label, count]) => ({ label, count, pct: total ? Math.round((count / total) * 100) : 0 }));
  rows.sort(order ? (a, b) => order.indexOf(a.label) - order.indexOf(b.label) : (a, b) => b.count - a.count || a.label.localeCompare(b.label));
  return rows.slice(0, limit);
}
const bump = (map: Map<string, number>, key: string) => map.set(key, (map.get(key) ?? 0) + 1);

/** Average rating per bucket, for buckets with at least `min` rated books, best first. */
function ratedBuckets(buckets: Map<string, number[]>, min: number): Rated[] {
  return [...buckets.entries()].filter(([, r]) => r.length >= min)
    .map(([label, r]) => ({ label, count: r.length, average: r.reduce((a, b) => a + b, 0) / r.length }))
    .sort((a, b) => b.average - a.average || b.count - a.count || a.label.localeCompare(b.label));
}

export function computeDna(items: DnaItem[], ratingsByWork: Map<string, number>, now = new Date()) {
  const read = items.filter(i => i.status === "READ");
  const total = read.length;
  const genres = new Map<string, number>(), themes = new Map<string, number>(), regions = new Map<string, number>();
  const eras = new Map<string, number>(), decades = new Map<number, number>(), authors = new Map<string, number>();
  const ratedGenres = new Map<string, number[]>(), ratedThemes = new Map<string, number[]>(), ratedRegions = new Map<string, number[]>(), ratedAuthors = new Map<string, number[]>();
  const years: number[] = [];
  let withRegion = 0;
  const push = (map: Map<string, number[]>, key: string, rating: number | undefined) => { if (rating !== undefined) map.set(key, [...(map.get(key) ?? []), rating]); };

  for (const { book } of read) {
    const rating = ratingsByWork.get(book.workId);
    const genre = genreOf(book.subjects);
    bump(genres, genre); push(ratedGenres, genre, rating);
    for (const theme of themesOf(book)) { bump(themes, theme); push(ratedThemes, theme, rating); }
    const bookRegions = regionsOf(book);
    if (bookRegions.length) withRegion++;
    for (const region of bookRegions) { bump(regions, region); push(ratedRegions, region, rating); }
    if (book.firstYear !== null) { years.push(book.firstYear); bump(eras, eraOf(book.firstYear)); decades.set(decadeOf(book.firstYear), (decades.get(decadeOf(book.firstYear)) ?? 0) + 1); }
    for (const author of new Set(book.authors)) if (author !== "Unknown author") { bump(authors, author); push(ratedAuthors, author, rating); }
  }

  const sortedYears = [...years].sort((a, b) => a - b);
  const medianYear = sortedYears.length ? sortedYears[Math.floor((sortedYears.length - 1) / 2)] : null;
  const decadeRows = [...decades.entries()].sort((a, b) => a[0] - b[0]).map(([decade, count]) => ({ label: `${decade}s`, count, pct: Math.round((count / years.length) * 100) }));
  const topGenres = shares(genres, total, undefined);
  const topThemes = shares(themes, total, undefined, 8);
  const topRegions = shares(regions, withRegion, undefined, 6);
  const topAuthors = [...authors.entries()].map(([name, count]) => ({ name, count })).filter(a => a.count > 1).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)).slice(0, 6);
  const readThisYear = read.filter(i => i.updatedAt.getFullYear() === now.getFullYear()).length;

  const dna = {
    total, readThisYear,
    genres: topGenres, themes: topThemes, regions: topRegions, regionCoverage: total ? withRegion / total : 0,
    eras: shares(eras, years.length, ERAS.map(([l]) => l)), decades: decadeRows, medianYear, span: sortedYears.length ? { from: sortedYears[0], to: sortedYears[sortedYears.length - 1] } : null,
    authors: topAuthors,
    loved: { genres: ratedBuckets(ratedGenres, 2), themes: ratedBuckets(ratedThemes, 2), regions: ratedBuckets(ratedRegions, 2), authors: ratedBuckets(ratedAuthors, 2) },
    // Rough 0..1 strengths on six axes, for the radar chart.
    axes: [] as { label: string; value: number }[],
    summary: "",
  };
  dna.axes = axesOf(dna);
  dna.summary = describe(dna);
  return dna;
}
export type Dna = ReturnType<typeof computeDna>;

function axesOf(d: Pick<Dna, "total" | "genres" | "themes" | "regions" | "decades" | "authors" | "medianYear">) {
  const share = (labels: string[]) => d.genres.filter(g => labels.includes(g.label)).reduce((a, g) => a + g.count, 0) / Math.max(1, d.total);
  const modern = d.decades.filter(x => parseInt(x.label) >= 1990).reduce((a, x) => a + x.count, 0) / Math.max(1, d.decades.reduce((a, x) => a + x.count, 0));
  return [
    { label: "Imaginative", value: share(["Fantasy", "Science fiction", "Horror & gothic"]) },
    { label: "Literary", value: share(["Literary fiction", "Classics", "Historical fiction"]) },
    { label: "Plot-driven", value: share(["Mystery & crime", "Romance", "Young adult"]) },
    { label: "Factual", value: share(["Non-fiction"]) },
    { label: "Contemporary", value: modern },
    { label: "Worldly", value: Math.min(1, d.regions.length / 5) },
  ];
}

const list = (items: string[]) => items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
function describe(d: Pick<Dna, "total" | "genres" | "themes" | "regions" | "eras" | "authors" | "loved" | "medianYear" | "span">) {
  if (!d.total) return "";
  const parts: string[] = [];
  const top = d.genres.filter(g => g.label !== "Other").slice(0, 2).map(g => g.label.toLowerCase());
  parts.push(top.length ? `Your reading world leans toward ${list(top)}` : "Your reading world is hard to pin to a single genre");
  if (d.regions[0]) parts[0] += `, with a strong pull toward ${list(d.regions.slice(0, 2).map(r => r.label))}`;
  parts[0] += ".";
  if (d.themes.length) parts.push(`You gravitate toward stories about ${list(d.themes.slice(0, 3).map(t => t.label.toLowerCase()))}.`);
  if (d.medianYear !== null) parts.push(d.medianYear < 1950 ? `You are a time traveller: the typical book you read was first published around ${d.medianYear}.` : d.medianYear >= 2000 ? `You read close to the present, with a typical first publication around ${d.medianYear}.` : `Your typical book first appeared around ${d.medianYear}.`);
  const favourite = d.loved.genres[0];
  if (favourite) parts.push(`You rate ${favourite.label.toLowerCase()} highest (${favourite.average.toFixed(1)}★).`);
  return parts.join(" ");
}
