import argon2 from "argon2";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

try { process.loadEnvFile(); } catch { /* DATABASE_URL may already be set */ }

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const books = [
  { workId: "OL27482W", series: "Middle-earth", title: "The Hobbit", authors: ["J.R.R. Tolkien"], coverId: 14627509, firstYear: 1937, subjects: ["Fantasy", "Fiction", "Classics"], description: "Bilbo Baggins, a comfort-loving hobbit, is swept into a quest to reclaim a dwarf kingdom from the dragon Smaug." },
  { workId: "OL27513W", series: "Middle-earth", title: "The Fellowship of the Ring", authors: ["J.R.R. Tolkien"], coverId: 14627060, firstYear: 1954, subjects: ["Fantasy", "Fiction"], description: "A hobbit inherits a ring of terrible power and sets out with eight companions to destroy it." },
  { workId: "OL59798W", series: "Earthsea Cycle", title: "A Wizard of Earthsea", authors: ["Ursula K. Le Guin"], coverId: 13617691, firstYear: 1968, subjects: ["Fantasy", "Fiction"], description: "A gifted young mage releases a shadow into the world and must hunt it across the archipelago of Earthsea." },
  { workId: "OL893414W", series: "Dune", title: "Dune", authors: ["Frank Herbert"], coverId: 11481354, firstYear: 1965, subjects: ["Science fiction", "Fiction"], description: "On the desert planet Arrakis, young Paul Atreides is drawn into a struggle over the universe's most valuable substance." },
  { workId: "OL893461W", series: "Dune", title: "Dune Messiah", authors: ["Frank Herbert"], coverId: 980253, firstYear: 1969, subjects: ["Science fiction", "Fiction"], description: "Paul Atreides rules as emperor, and the cost of his prophecy comes due." },
  { workId: "OL893516W", series: "Dune", title: "Children of Dune", authors: ["Frank Herbert"], coverId: 6976407, firstYear: 1976, subjects: ["Science fiction", "Fiction"], description: "The twin children of Paul Atreides inherit an empire and a terrible destiny." },
  { workId: "OL59800W", series: "Hainish Cycle", title: "The Left Hand of Darkness", authors: ["Ursula K. Le Guin"], coverId: 10618463, firstYear: 1969, subjects: ["Science fiction", "Fiction"], description: "An envoy to the icy world of Gethen confronts a society with no fixed gender." },
  { workId: "OL27258W", series: "Sprawl Trilogy", title: "Neuromancer", authors: ["William Gibson"], coverId: 283860, firstYear: 1984, subjects: ["Science fiction", "Fiction"], description: "A washed-up hacker is hired for one last job in a sprawling cyberspace." },
  { workId: "OL450063W", title: "Frankenstein; or, The Modern Prometheus", authors: ["Mary Shelley"], coverId: 12356249, firstYear: 1818, subjects: ["Classics", "Science fiction", "Fiction"], description: "A young scientist creates a living being and must face the consequences of his ambition." },
  { workId: "OL1168083W", title: "Nineteen Eighty-Four", authors: ["George Orwell"], coverId: 9267242, firstYear: 1949, subjects: ["Science fiction", "Fiction", "Classics"], description: "Winston Smith lives under constant surveillance in a totalitarian state." },
  { workId: "OL66554W", title: "Pride and Prejudice", authors: ["Jane Austen"], coverId: 14348537, firstYear: 1813, subjects: ["Classics", "Fiction", "Literature"], description: "Elizabeth Bennet navigates family, class and first impressions in Regency England." },
  { workId: "OL1095427W", title: "Jane Eyre", authors: ["Charlotte Brontë"], coverId: 8235363, firstYear: 1847, subjects: ["Classics", "Fiction", "Literature"], description: "An orphaned governess finds love and a dark secret at Thornfield Hall." },
  { workId: "OL468431W", title: "The Great Gatsby", authors: ["F. Scott Fitzgerald"], coverId: 10590366, firstYear: 1920, subjects: ["Classics", "Fiction", "Literature"], description: "Nick Carraway watches his mysterious neighbour chase a dream across Jazz Age Long Island." },
];

const reviews = [
  { workId: "OL27482W", rating: 5, body: "A cozy, adventurous read. Bilbo is the perfect reluctant hero, and the riddle scene is still my favorite." },
  { workId: "OL893414W", rating: 4, body: "Dense and rewarding. The world-building is unmatched, though the first hundred pages take patience." },
  { workId: "OL66554W", rating: 5, body: "Sharp, funny and surprisingly modern. Elizabeth and Darcy's slow thaw never gets old." },
  { workId: "OL1168083W", rating: 5, body: "Chilling and still relevant. I kept putting it down just to breathe." },
  { workId: "OL893461W", rating: 4, body: "A bleak, brilliant sequel that deliberately undercuts the hero's tale." },
  { workId: "OL893516W", rating: 3, body: "Ambitious and strange. I admired it more than I enjoyed it." },
  { workId: "OL27513W", rating: 5, body: "The Shire to Rivendell is the best stretch of travel writing in fantasy." },
  { workId: "OL59798W", rating: 4, body: "Quiet, wise and short. Ged's mistakes feel earned." },
  { workId: "OL27258W", rating: 4, body: "Dazzling prose, a plot that moves faster than you can follow. Worth it." },
  { workId: "OL1095427W", rating: 5, body: "Jane's voice is fierce and funny, and Thornfield is gloriously gothic." },
  { workId: "OL468431W", rating: 4, body: "A perfect little tragedy. The green light haunts me still." },
];

// Earlier seed runs used two incorrect work ids; remove those rows.
const legacyWorkIds = ["OL262758W", "OL893415W"];

async function main() {
  await db.book.deleteMany({ where: { workId: { in: legacyWorkIds } } });
  const user = await db.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: { email: "demo@example.com", displayName: "Demo Reader", passwordHash: await argon2.hash("demo-password-123", { type: argon2.argon2id }) },
  });
  const saved = new Map<string, string>();
  for (const book of books) {
    const row = await db.book.upsert({ where: { workId: book.workId }, update: book, create: book });
    saved.set(book.workId, row.id);
  }
  for (const review of reviews) {
    const bookId = saved.get(review.workId)!;
    await db.review.upsert({
      where: { userId_bookId: { userId: user.id, bookId } },
      update: {},
      create: { userId: user.id, bookId, rating: review.rating, body: review.body },
    });
  }
  const demoReview = await db.review.findFirst({ where: { userId: user.id, bookId: saved.get("OL27482W")! } });
  if (demoReview && !(await db.comment.count({ where: { reviewId: demoReview.id } }))) {
    await db.comment.create({ data: { reviewId: demoReview.id, userId: user.id, body: "Reading this one again next month. The barrels scene still makes me grin." } });
  }
  const fan = await db.user.upsert({
    where: { email: "reader@example.com" },
    update: {},
    create: { email: "reader@example.com", displayName: "Avid Reader", passwordHash: await argon2.hash("demo-password-123", { type: argon2.argon2id }) },
  });
  if (demoReview) {
    await db.reviewLike.upsert({ where: { userId_reviewId: { userId: fan.id, reviewId: demoReview.id } }, update: {}, create: { userId: fan.id, reviewId: demoReview.id } });
    const demoComment = await db.comment.findFirst({ where: { reviewId: demoReview.id } });
    if (demoComment) await db.commentLike.upsert({ where: { userId_commentId: { userId: fan.id, commentId: demoComment.id } }, update: {}, create: { userId: fan.id, commentId: demoComment.id } });
  }
  console.log(`Seeded ${books.length} books and ${reviews.length} reviews. Demo login: demo@example.com / demo-password-123`);
}

main().finally(() => db.$disconnect());
