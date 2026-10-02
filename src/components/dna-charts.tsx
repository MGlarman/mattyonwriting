"use client";
import { useState } from "react";
import type { Rated, Share } from "@/lib/dna";

export const DNA_COLORS = ["#c0562f", "#d9a232", "#2f6b4f", "#55a3c4", "#a77bff", "#ec6fa3", "#6b7f3a", "#8a5a44", "#4f6d9a", "#9a9a9a"];

/** Donut of shares; hovering or focusing a legend row (or arc) highlights it and shows its figures in the centre. */
export function GenreDonut({ rows, total }: { rows: Share[]; total: number }) {
  const [active, setActive] = useState<number | null>(null);
  const R = 70, C = 2 * Math.PI * R;
  const offsets = rows.map((_, i) => rows.slice(0, i).reduce((a, r) => a + (r.count / total) * C, 0));
  const current = active !== null ? rows[active] : null;
  return <div className="dna-donut-wrap">
    <svg viewBox="0 0 200 200" className="dna-donut" role="img" aria-label={`Genre breakdown: ${rows.map(r => `${r.label} ${r.pct}%`).join(", ")}`}>
      <circle cx="100" cy="100" r={R} fill="none" stroke="var(--surface-alt)" strokeWidth="26" />
      {rows.map((row, i) => {
        const len = (row.count / total) * C, dash = `${Math.max(0, len - 1.5)} ${C - Math.max(0, len - 1.5)}`;
        return <circle key={row.label} cx="100" cy="100" r={R} fill="none" stroke={DNA_COLORS[i % DNA_COLORS.length]} strokeWidth={active === i ? 32 : 26}
          strokeDasharray={dash} strokeDashoffset={-offsets[i]} transform="rotate(-90 100 100)" opacity={active === null || active === i ? 1 : 0.3}
          onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} style={{ transition: "stroke-width .15s, opacity .15s" }} />;
      })}
      <text x="100" y="98" textAnchor="middle" className="dna-donut-big">{current ? `${current.pct}%` : total}</text>
      <text x="100" y="118" textAnchor="middle" className="dna-donut-small">{current ? current.label : total === 1 ? "book read" : "books read"}</text>
    </svg>
    <ul className="dna-legend">{rows.map((row, i) => <li key={row.label} tabIndex={0} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(i)} onBlur={() => setActive(null)} className={active === i ? "is-active" : ""}>
      <span className="dna-swatch" style={{ background: DNA_COLORS[i % DNA_COLORS.length] }} /><span className="dna-legend-label">{row.label}</span><span className="dna-legend-pct">{row.pct}%</span><span className="muted dna-legend-count">{row.count}</span></li>)}</ul>
  </div>;
}

/** A twisting double strand whose rungs are the genres, sized by share. Purely decorative. */
export function DnaHelix({ rows }: { rows: Share[] }) {
  const rungs = Math.min(28, Math.max(12, rows.reduce((a, r) => a + r.count, 0)));
  const total = rows.reduce((a, r) => a + r.count, 0) || 1;
  const colors: string[] = [];
  rows.forEach((row, i) => { for (let k = 0; k < Math.max(1, Math.round((row.count / total) * rungs)); k++) colors.push(DNA_COLORS[i % DNA_COLORS.length]); });
  const n = colors.length, W = 560, H = 120;
  const points = colors.map((color, i) => { const x = 20 + (i / Math.max(1, n - 1)) * (W - 40), a = (i / Math.max(1, n - 1)) * Math.PI * 4; return { x, y1: H / 2 + Math.sin(a) * 40, y2: H / 2 - Math.sin(a) * 40, depth: Math.cos(a), color }; });
  const path = (key: "y1" | "y2") => points.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p[key].toFixed(1)}`).join(" ");
  return <svg viewBox={`0 0 ${W} ${H}`} className="dna-helix" aria-hidden="true">
    <path d={path("y1")} fill="none" stroke="var(--line)" strokeWidth="3" strokeLinecap="round" /><path d={path("y2")} fill="none" stroke="var(--line)" strokeWidth="3" strokeLinecap="round" />
    {points.map((p, i) => <g key={i} opacity={0.55 + 0.45 * Math.abs(p.depth)}><line x1={p.x} x2={p.x} y1={p.y1} y2={p.y2} stroke={p.color} strokeWidth="5" strokeLinecap="round" /><circle cx={p.x} cy={p.y1} r="4.5" fill={p.color} /><circle cx={p.x} cy={p.y2} r="4.5" fill={p.color} /></g>)}
  </svg>;
}

export function Radar({ axes }: { axes: { label: string; value: number }[] }) {
  const cx = 150, cy = 140, R = 90, n = axes.length;
  const at = (i: number, v: number) => { const a = -Math.PI / 2 + (i / n) * 2 * Math.PI; return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v] as const; };
  const poly = (v: (i: number) => number) => axes.map((_, i) => at(i, v(i)).map(x => x.toFixed(1)).join(",")).join(" ");
  return <svg viewBox="0 0 300 280" className="dna-radar" role="img" aria-label={`Reading profile: ${axes.map(a => `${a.label} ${Math.round(a.value * 100)}%`).join(", ")}`}>
    {[0.25, 0.5, 0.75, 1].map(ring => <polygon key={ring} points={poly(() => ring)} fill="none" stroke="var(--line)" />)}
    {axes.map((a, i) => { const [x, y] = at(i, 1), [lx, ly] = at(i, 1.22); return <g key={a.label}><line x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line)" /><text x={lx} y={ly} textAnchor={lx < cx - 5 ? "end" : lx > cx + 5 ? "start" : "middle"} dominantBaseline="middle" className="dna-radar-label">{a.label}</text></g>; })}
    <polygon points={poly(i => Math.max(0.04, axes[i].value))} fill="var(--accent)" fillOpacity="0.28" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />
    {axes.map((a, i) => { const [x, y] = at(i, Math.max(0.04, a.value)); return <circle key={a.label} cx={x} cy={y} r="4" fill="var(--accent)"><title>{`${a.label}: ${Math.round(a.value * 100)}%`}</title></circle>; })}
  </svg>;
}

type Tab = { key: string; label: string; rows: Rated[] };
export function LovedTabs({ tabs }: { tabs: Tab[] }) {
  const available = tabs.filter(t => t.rows.length);
  const [key, setKey] = useState(available[0]?.key);
  const tab = available.find(t => t.key === key) ?? available[0];
  if (!tab) return <p className="shelf-empty">Rate at least two books in the same genre, theme, region or by the same author to see your patterns.</p>;
  return <div>
    <div className="dna-tabs" role="tablist">{available.map(t => <button key={t.key} role="tab" aria-selected={t.key === tab.key} className={t.key === tab.key ? "is-active" : ""} onClick={() => setKey(t.key)}>{t.label}</button>)}</div>
    <ul className="hbars dna-rated">{tab.rows.slice(0, 6).map(r => <li key={r.label}><span className="hbar-label">{r.label}</span><span className="hbar-track"><span className="hbar-fill" style={{ width: `${(r.average / 5) * 100}%`, background: "var(--gold)" }} /></span><span className="hbar-value">{r.average.toFixed(1)}★</span></li>)}</ul>
    <p className="muted dna-note">Average of your own ratings, from groups with at least two rated books.</p>
  </div>;
}
