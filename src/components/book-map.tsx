"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Minus, PanelLeftClose, PanelLeftOpen, Plus, RotateCcw, Star } from "lucide-react";
import { GENRE_COLORS, type MapLayout } from "@/lib/map-layout";
import { BookCover } from "@/components/book-cover";
import { formatSeries } from "@/lib/series";

type View = { x: number; y: number; k: number };
const HOME: View = { x: 0, y: 0, k: 1 };
const MIN_K = 0.7, MAX_K = 6;

export function BookMap({ layout }: { layout: MapLayout }) {
  const { width, height, plot } = layout;
  const [view, setView] = useState<View>(HOME);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [listOpen, setListOpen] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  const selected = layout.nodes.find(node => node.id === selectedId) ?? null;
  const list = useMemo(() => [...layout.nodes].filter(n => `${n.title} ${n.authors.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => a.title.localeCompare(b.title)), [layout.nodes, query]);

  const toSvg = useCallback((clientX: number, clientY: number) => {
    // The SVG letterboxes its viewBox (preserveAspectRatio "meet"), so map through the uniform fit scale.
    const rect = svgRef.current!.getBoundingClientRect();
    const fit = Math.min(rect.width / width, rect.height / height);
    const offX = (rect.width - width * fit) / 2, offY = (rect.height - height * fit) / 2;
    return { x: (clientX - rect.left - offX) / fit, y: (clientY - rect.top - offY) / fit, scale: 1 / fit };
  }, [width, height]);
  const zoomAt = useCallback((factor: number, cx: number, cy: number) => setView(v => {
    const k = Math.min(MAX_K, Math.max(MIN_K, v.k * factor)), ratio = k / v.k;
    return { k, x: cx - (cx - v.x) * ratio, y: cy - (cy - v.y) * ratio };
  }), []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const p = toSvg(event.clientX, event.clientY);
      zoomAt(event.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y);
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [toSvg, zoomAt]);

  const focusNode = (id: string) => {
    const node = layout.nodes.find(n => n.id === id);
    if (!node) return;
    setSelectedId(id);
    setView({ k: 2.6, x: width / 2 - node.x * 2.6, y: height / 2 - node.y * 2.6 });
  };

  return <div className={listOpen ? "map-layout" : "map-layout list-hidden"}>
    {listOpen && <aside className="map-list" id="map-list" aria-label="Books on the map">
      <div className="eyebrow">ARCHIVE</div>
      <h2>Reviewed books</h2>
      <p className="muted">{layout.nodes.length} {layout.nodes.length === 1 ? "book" : "books"} with at least one review.</p>
      <label className="sr-only" htmlFor="map-filter">Filter books</label>
      <input id="map-filter" className="map-filter" type="search" placeholder="Filter by title or author…" value={query} onChange={event => setQuery(event.target.value)} />
      <ul>{list.map(node => <li key={node.id}><button type="button" className={node.id === selectedId ? "map-item active" : "map-item"} onClick={() => focusNode(node.id)}><strong>{node.title}</strong><small>{node.authors[0] ?? "Unknown author"}{node.firstYear ? ` · ${node.firstYear}` : ""}</small></button></li>)}
        {!list.length && <li className="muted">No matching books.</li>}</ul>
    </aside>}
    <div className="map-panel">
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Map of reviewed books by year and genre" className="map-svg"
        onPointerDown={event => { drag.current = { x: event.clientX, y: event.clientY, moved: false }; }}
        onPointerMove={event => {
          const d = drag.current; if (!d) return;
          const dx = event.clientX - d.x, dy = event.clientY - d.y;
          if (!d.moved && Math.hypot(dx, dy) < 4) return;
          if (!d.moved) { d.moved = true; event.currentTarget.setPointerCapture(event.pointerId); }
          const scale = toSvg(0, 0).scale;
          setView(v => ({ ...v, x: v.x + dx * scale, y: v.y + dy * scale }));
          d.x = event.clientX; d.y = event.clientY;
        }}
        onPointerUp={event => { if (drag.current?.moved) { suppressClick.current = true; event.currentTarget.releasePointerCapture(event.pointerId); setTimeout(() => { suppressClick.current = false; }, 0); } drag.current = null; }}
        onClick={() => { if (!suppressClick.current) setSelectedId(null); }}>
        <g aria-hidden="true">{layout.stars.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o} />)}</g>
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          <g className="map-grid" aria-hidden="true">
            {layout.ticks.map(t => <g key={t.year}><line x1={plot.left} x2={plot.right} y1={t.y} y2={t.y} /><text x={plot.left - 10} y={t.y + 4} textAnchor="end">{t.year}</text></g>)}
            {layout.lanes.map(l => <text key={l.genre} x={l.x + l.width / 2} y={plot.bottom + 26} textAnchor="middle" fill={GENRE_COLORS[l.genre]} className="map-lane">{l.genre.toUpperCase()}</text>)}
            <text x={plot.left - 62} y={(plot.top + plot.bottom) / 2} transform={`rotate(-90 ${plot.left - 62} ${(plot.top + plot.bottom) / 2})`} textAnchor="middle">OLDER → NEWER</text>
          </g>
          {layout.clusters.map(c => <g key={c.id} aria-hidden="true">
            {c.spiral && <path d={c.spiral} fill="none" stroke={GENRE_COLORS[c.genre]} strokeWidth={2.2} opacity={0.35} className="map-spiral" />}
          </g>)}
          {layout.nodes.map(n => {
            const color = GENRE_COLORS[n.genre], active = n.id === selectedId;
            return <g key={n.id} className={`map-node${active ? " active" : ""}`} transform={`translate(${n.x} ${n.y})`} role="button" tabIndex={0} aria-label={`${n.title}, ${n.reviews} ${n.reviews === 1 ? "review" : "reviews"}`}
              onClick={event => { event.stopPropagation(); if (!suppressClick.current) setSelectedId(n.id); }}
              onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); focusNode(n.id); } }}>
              <circle r={n.r * 2.6} fill={color} opacity={active ? 0.35 : 0.16} />
              <circle r={n.r} fill={color} stroke="#fff" strokeWidth={active ? 2 : 0.8} />
              <text y={n.r + 13} textAnchor="middle" className="map-node-label" fontSize={10 / Math.sqrt(view.k)}>{n.title.length > 26 ? `${n.title.slice(0, 25)}…` : n.title}</text>
            </g>;
          })}
        </g>
      </svg>
      <div className="map-controls">
        <button type="button" aria-label={listOpen ? "Hide book list" : "Show book list"} aria-expanded={listOpen} aria-controls="map-list" onClick={() => setListOpen(o => !o)}>{listOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />} {listOpen ? "Hide list" : "Show list"}</button>
        <button type="button" aria-label="Zoom in" onClick={() => zoomAt(1.4, width / 2, height / 2)}><Plus size={18} /></button>
        <button type="button" aria-label="Zoom out" onClick={() => zoomAt(1 / 1.4, width / 2, height / 2)}><Minus size={18} /></button>
        <button type="button" aria-label="Reset view" onClick={() => { setView(HOME); setSelectedId(null); }}><RotateCcw size={16} /> Reset</button>
      </div>
      <ul className="map-legend" aria-label="Genre colors">{[...new Set(layout.nodes.map(n => n.genre))].map(g => <li key={g}><span style={{ background: GENRE_COLORS[g] }} />{g}</li>)}</ul>
      {selected && <div className="map-card" role="status">
        <div className="map-card-cover"><BookCover {...selected} /></div>
        <div><strong>{selected.title}</strong>{selected.series && <small className="map-card-series">{formatSeries(selected.series, selected.seriesNumber ?? null)}</small>}<small>{selected.authors.join(", ")}{selected.firstYear ? ` · ${selected.firstYear}` : ""}</small>
          <span className="map-card-rating"><Star size={14} fill="currentColor" />{selected.average !== null ? selected.average.toFixed(1) : "—"} · {selected.reviews} {selected.reviews === 1 ? "review" : "reviews"}</span>
          <Link href={`/books/${selected.workId}`} className="text-link">Read the reviews <ArrowUpRight size={15} /></Link></div>
      </div>}
    </div>
  </div>;
}
