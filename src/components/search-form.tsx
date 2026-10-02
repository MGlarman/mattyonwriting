import { Search, ArrowRight } from "lucide-react";

export function SearchForm({ query = "", large = false }: { query?: string; large?: boolean }) {
  return <form action="/search" className={`search-form ${large ? "search-large" : ""}`} role="search">
    <Search size={20} aria-hidden="true" /><label htmlFor={large ? "hero-search" : "catalog-search"} className="sr-only">Search books or authors</label>
    <input id={large ? "hero-search" : "catalog-search"} name="q" type="search" placeholder="Search a book, author, or your next favorite…" defaultValue={query} required maxLength={200} />
    <button type="submit" aria-label="Search books"><span>Find a book</span><ArrowRight size={18} /></button>
  </form>;
}
