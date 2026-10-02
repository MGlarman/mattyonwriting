import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { fetchSeries } from "../src/lib/catalog";
import { formatSeries } from "../src/lib/series";

try { process.loadEnvFile(); } catch { /* DATABASE_URL may already be set */ }

// Detects a series and number for every book that is missing either. Safe to re-run; throttled by the catalog client.
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const books = await db.book.findMany({ where: { seriesNumber: null }, select: { id: true, title: true, authors: true, workId: true } });
  let found = 0;
  for (const book of books) {
    const series = await fetchSeries(book.workId, book.title, book.authors);
    if (series) { await db.book.update({ where: { id: book.id }, data: { series: series.name, seriesNumber: series.number } }); found++; }
    console.log(`${book.title}: ${series ? formatSeries(series.name, series.number) : "no series"}`);
  }
  console.log(`Checked ${books.length} books, found a series for ${found}.`);
}
main().finally(() => db.$disconnect());
