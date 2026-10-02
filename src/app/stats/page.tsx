import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen } from "lucide-react";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { GENRE_COLORS } from "@/lib/map-layout";
import { computeStats } from "@/lib/stats";
export const metadata = { title: "My stats" };

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export default async function StatsPage() {
  const user = await getUser();
  if (!user) redirect("/login?returnTo=%2Fstats");
  const [items, reviews] = await Promise.all([
    db.readingListItem.findMany({ where: { userId: user.id }, take: 2000, select: { status: true, updatedAt: true, book: { select: { title: true, authors: true, firstYear: true, subjects: true } } } }),
    db.review.findMany({ where: { userId: user.id }, select: { rating: true } }),
  ]);
  const stats = computeStats(items, reviews.map(r => r.rating));
  const { counts } = stats;
  if (!items.length && !reviews.length) return <div className="container page-section"><div className="empty-state"><BookOpen size={36} /><h1>Your stats start with your first book.</h1><p>Add books to your reading lists and your numbers will appear here.</p><Link href="/my-books" className="button">Go to my books</Link></div></div>;
  const monthMax = Math.max(1, ...stats.months.map(m => m.count));
  const genreMax = Math.max(1, ...stats.genres.map(g => g.count));
  const ratingMax = Math.max(1, ...stats.ratings.distribution.map(r => r.count));
  const tiles = [
    { label: "Read", value: counts.READ, note: `${stats.readThisYear} this year` },
    { label: "Reading now", value: counts.READING, note: "in progress" },
    { label: "To read", value: counts.TO_READ, note: "on the shelf" },
    { label: "Average rating", value: stats.ratings.average?.toFixed(1) ?? "—", note: plural(stats.ratings.count, "review") },
  ];
  return <div className="container page-section"><div className="page-heading"><div className="eyebrow">YOUR READING IN NUMBERS</div><h1>My stats</h1><p>Built from your reading lists and reviews.</p></div>
    <ul className="stat-tiles">{tiles.map(t => <li key={t.label}><span className="stat-value">{t.value}</span><strong>{t.label}</strong><small>{t.note}</small></li>)}</ul>

    <section className="stat-panel" aria-labelledby="stat-months"><h2 id="stat-months">Books read per month</h2>
      <p className="muted">A book counts for the month you marked it as read. Last 12 months.</p>
      {stats.months.some(m => m.count) ? <ol className="month-chart">{stats.months.map(m => <li key={`${m.year}-${m.month}`} title={`${m.label} ${m.year}: ${plural(m.count, "book")}`}>
        <span className="month-count">{m.count || ""}</span><span className="month-bar" style={{ height: `${(m.count / monthMax) * 100}%` }} /><span className="month-label">{m.label}</span></li>)}</ol>
        : <p className="shelf-empty">Mark a book as read and it will show up here.</p>}
    </section>

    <div className="stat-columns">
      <section className="stat-panel" aria-labelledby="stat-genres"><h2 id="stat-genres">Genres you’ve read</h2>
        {stats.genres.length ? <ul className="hbars">{stats.genres.map(g => <li key={g.genre}><span className="hbar-label">{g.genre}</span><span className="hbar-track"><span className="hbar-fill" style={{ width: `${(g.count / genreMax) * 100}%`, background: GENRE_COLORS[g.genre] }} /></span><span className="hbar-value">{g.count}</span></li>)}</ul>
          : <p className="shelf-empty">No finished books yet.</p>}
      </section>
      <section className="stat-panel" aria-labelledby="stat-ratings"><h2 id="stat-ratings">Your ratings</h2>
        {stats.ratings.count ? <ul className="hbars">{stats.ratings.distribution.map(r => <li key={r.stars}><span className="hbar-label">{r.stars} {r.stars === 1 ? "star" : "stars"}</span><span className="hbar-track"><span className="hbar-fill" style={{ width: `${(r.count / ratingMax) * 100}%` }} /></span><span className="hbar-value">{r.count}</span></li>)}</ul>
          : <p className="shelf-empty">Review a book to see how you rate.</p>}
      </section>
    </div>

    {(stats.authors.length > 0 || stats.oldest) && <section className="stat-panel" aria-labelledby="stat-highlights"><h2 id="stat-highlights">Highlights</h2>
      <dl className="highlights">
        {stats.authors.length > 0 && <div><dt>Most-read authors</dt><dd>{stats.authors.map(a => `${a.name} (${a.count})`).join(" · ")}</dd></div>}
        {stats.oldest && <div><dt>Oldest book read</dt><dd>{stats.oldest.title} · {stats.oldest.year}</dd></div>}
        {stats.newest && stats.newest.title !== stats.oldest?.title && <div><dt>Newest book read</dt><dd>{stats.newest.title} · {stats.newest.year}</dd></div>}
      </dl></section>}
  </div>;
}
