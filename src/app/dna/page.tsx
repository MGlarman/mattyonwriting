import Link from "next/link";
import { redirect } from "next/navigation";
import { Dna as DnaIcon } from "lucide-react";
import { getUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { computeDna } from "@/lib/dna";
import { DnaHelix, GenreDonut, LovedTabs, Radar } from "@/components/dna-charts";
export const metadata = { title: "Literary DNA" };

export default async function DnaPage() {
  const user = await getUser();
  if (!user) redirect("/login?returnTo=%2Fdna");
  const [items, reviews] = await Promise.all([
    db.readingListItem.findMany({ where: { userId: user.id, status: "READ" }, take: 2000, select: { status: true, updatedAt: true, book: { select: { workId: true, title: true, authors: true, firstYear: true, subjects: true, description: true } } } }),
    db.review.findMany({ where: { userId: user.id }, select: { rating: true, book: { select: { workId: true } } } }),
  ]);
  if (!items.length) return <div className="container page-section"><div className="empty-state"><DnaIcon size={36} /><h1>Your DNA starts with your first book.</h1><p>Mark books as read and your literary profile will take shape here.</p><Link href="/my-books" className="button">Go to my books</Link></div></div>;
  const dna = computeDna(items, new Map(reviews.map(r => [r.book.workId, r.rating])));
  const maxDecade = Math.max(1, ...dna.decades.map(d => d.count));
  const maxEra = Math.max(1, ...dna.eras.map(e => e.count));
  const maxTheme = Math.max(1, ...dna.themes.map(t => t.count));
  const maxRegion = Math.max(1, ...dna.regions.map(r => r.count));
  return <div className="container page-section"><div className="page-heading"><div className="eyebrow">YOUR LITERARY DNA</div><h1>The shape of your reading.</h1><p>Mapped from the {dna.total} {dna.total === 1 ? "book" : "books"} you’ve finished.</p></div>

    <section className="stat-panel dna-hero" aria-labelledby="dna-overview"><h2 id="dna-overview">Overview</h2>
      <DnaHelix rows={dna.genres} />
      <p className="dna-summary">{dna.summary}</p>
    </section>

    <div className="stat-columns">
      <section className="stat-panel" aria-labelledby="dna-genres"><h2 id="dna-genres">Genre DNA</h2>
        <p className="muted">Hover a genre to see its share of your shelf.</p>
        <GenreDonut rows={dna.genres} total={dna.total} />
      </section>
      <section className="stat-panel" aria-labelledby="dna-profile"><h2 id="dna-profile">Reading profile</h2>
        <p className="muted">Six axes, from the mix of genres and eras you read.</p>
        <Radar axes={dna.axes} />
      </section>
    </div>

    <div className="stat-columns">
      <section className="stat-panel" aria-labelledby="dna-themes"><h2 id="dna-themes">Themes</h2>
        {dna.themes.length ? <ul className="hbars">{dna.themes.map(t => <li key={t.label}><span className="hbar-label">{t.label}</span><span className="hbar-track"><span className="hbar-fill" style={{ width: `${(t.count / maxTheme) * 100}%` }} /></span><span className="hbar-value">{t.count}</span></li>)}</ul>
          : <p className="shelf-empty">No recurring themes found in the subjects of your books yet.</p>}
        <p className="muted dna-note">Detected from each book’s subjects and description; a book can have several.</p>
      </section>
      <section className="stat-panel" aria-labelledby="dna-regions"><h2 id="dna-regions">Countries &amp; regions</h2>
        {dna.regions.length ? <ul className="hbars">{dna.regions.map(r => <li key={r.label}><span className="hbar-label">{r.label}</span><span className="hbar-track"><span className="hbar-fill" style={{ width: `${(r.count / maxRegion) * 100}%`, background: "var(--brand)" }} /></span><span className="hbar-value">{r.count}</span></li>)}</ul>
          : <p className="shelf-empty">None of your books mention a country or region.</p>}
        <p className="muted dna-note">Only {Math.round(dna.regionCoverage * 100)}% of your books name a place in their catalogue data, so treat this as a hint, not a census.</p>
      </section>
    </div>

    <section className="stat-panel" aria-labelledby="dna-time"><h2 id="dna-time">Time periods</h2>
      {dna.span ? <>
        <p className="muted">First published between {dna.span.from} and {dna.span.to}; the typical book dates from {dna.medianYear}.</p>
        <ol className="month-chart dna-decades" style={{ gridTemplateColumns: `repeat(${dna.decades.length}, 1fr)` }}>{dna.decades.map(d => <li key={d.label} title={`${d.label}: ${d.count} ${d.count === 1 ? "book" : "books"}`}><span className="month-count">{d.count}</span><span className="month-bar" style={{ height: `${(d.count / maxDecade) * 100}%` }} /><span className="month-label">{d.label.slice(2)}</span></li>)}</ol>
        <ul className="hbars">{dna.eras.map(e => <li key={e.label}><span className="hbar-label">{e.label}</span><span className="hbar-track"><span className="hbar-fill" style={{ width: `${(e.count / maxEra) * 100}%`, background: "var(--success)" }} /></span><span className="hbar-value">{e.pct}%</span></li>)}</ul>
      </> : <p className="shelf-empty">None of your books have a publication year.</p>}
    </section>

    <div className="stat-columns">
      <section className="stat-panel" aria-labelledby="dna-loved"><h2 id="dna-loved">What you rate highest</h2>
        <LovedTabs tabs={[{ key: "genres", label: "Genres", rows: dna.loved.genres }, { key: "themes", label: "Themes", rows: dna.loved.themes }, { key: "regions", label: "Regions", rows: dna.loved.regions }, { key: "authors", label: "Authors", rows: dna.loved.authors }]} />
      </section>
      <section className="stat-panel" aria-labelledby="dna-authors"><h2 id="dna-authors">Recurring authors</h2>
        {dna.authors.length ? <ul className="hbars">{dna.authors.map(a => <li key={a.name}><span className="hbar-label">{a.name}</span><span className="hbar-track"><span className="hbar-fill" style={{ width: `${(a.count / dna.authors[0].count) * 100}%`, background: "var(--gold)" }} /></span><span className="hbar-value">{a.count}</span></li>)}</ul>
          : <p className="shelf-empty">Read two books by the same author and they’ll appear here.</p>}
        <p className="muted dna-note">Language and page length aren’t in your catalogue data, so they’re left out of the map.</p>
      </section>
    </div>
  </div>;
}
