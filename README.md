# BookReviews

BookReviews is a community for discovering books, writing reviews, and rating books from 1 to 5 stars. Visitors can browse without an account; registered readers can review books, discuss each other's reviews, and like them. A map page shows every reviewed book at a glance.

It uses Next.js, PostgreSQL in Docker, and Open Library for the catalog. It runs locally; Vercel deployment is deferred to a later phase.

See the [implementation plan](docs/implementation-plan.md) for product decisions, architecture, and acceptance criteria.

## Features

- **Discover and search.** The home page has genre tabs and recent reviews. Search covers the Open Library catalog; opening a book imports it once and caches it locally.
- **Reviews.** One review per reader per book, with a 1–5 star rating and up to 5,000 characters. Readers can edit or delete their own review. Book pages show the average rating and a paginated list of reviews.
- **Accounts.** Signup, login, and logout with Argon2id password hashing, hashed server-side sessions (14 days), origin checks on every mutation, and login throttling (8 attempts per email per 15 minutes).
- **My reviews.** A signed-in reader's own reviews, with edit and delete.
- **Comments.** Readers can reply to any review. Comments are flat (no nested replies), up to 1,000 characters, capped at 50 per review, and can be deleted by their author. Deleting a review removes its comments.
- **Likes.** Readers can like reviews and comments, and toggle the like off again. Counts show on the book page, and signed-out visitors are sent to sign in. You cannot like your own reviews or comments.
- **The Map (`/map`).** Every book with at least one review, plotted on a pannable, zoomable map:
  - Vertical axis is first publication year (oldest at the top).
  - Horizontal lanes are genres (Fantasy, Science fiction, Classics, Other), derived from the book's Open Library subjects.
  - Books in the same **series** form one spiral cluster, ordered by year. Books with no known series cluster by author instead. A series sits in the lane of the majority genre of its books.
  - Dot size grows with the number of reviews. Click a dot, or a book in the list, for a card with its cover, rating, and a link to its reviews.
- **Series detection.** Open Library has no clean series field, so on import the app inspects the book's edition records and accepts a series name only when at least two English-language editions agree on it; publisher imprints and translated names are ignored. Detection is conservative, so some real series are missed and those books simply cluster by author. `npm run db:backfill-series` fills in books imported earlier.
- **Banners and covers.** Real covers come from Open Library; SVG banner artwork lives in `public/banners/`. The theme follows the system's light or dark setting.

## Local configuration

Prerequisites are Node.js and npm, plus Docker with Compose. Dependencies are recorded in `package.json` and `package-lock.json`. Development has been done on Node.js 26; no supported version range has been pinned or tested.

| Variable | Purpose | Local default |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection | Database `bookreviews` on `localhost:5434` |
| `APP_URL` | Expected origin for account, review, comment, and like mutations | `http://localhost:3000` |
| `OPEN_LIBRARY_CONTACT` | Optional contact email in catalog requests (allows a faster request rate) | Empty |

Copy `.env.example` to `.env` when configuring a fresh checkout. Keep an existing `.env` if it already contains your settings. The credentials in the example and Compose file are for local development.

## Getting started

```powershell
# Fresh checkout only, when .env does not already exist:
Copy-Item .env.example .env

npm ci
docker compose up -d --wait
npm run db:migrate
npm run db:seed        # optional demo data
npm run dev
```

Open `http://localhost:3000`. Use that same origin in `APP_URL`; opening the site through `127.0.0.1` or another port makes form submissions fail the origin check until the variable is updated and the app restarted.

PostgreSQL is exposed on local port `5434` and stores data in the named Compose volume `bookreviews_data`. `docker compose stop` stops the database while retaining its data.

After changing `prisma/schema.prisma` and regenerating the client, restart the dev server: it caches the old Prisma client and fails on new models.

### Demo data

`npm run db:seed` is safe to re-run. It creates 13 books with real covers and series, 11 reviews, a few comments and likes, and two demo accounts (both with password `demo-password-123`):

| Account | Notes |
| --- | --- |
| `demo@example.com` | Author of the seeded reviews and comments |
| `reader@example.com` | Likes the demo reviews; use it to try the like button on someone else's review |

The seed also removes two rows created by an earlier version with incorrect Open Library IDs.

## Project commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Generate the Prisma client and build for production |
| `npm start` | Serve a production build |
| `npm run lint` | Run ESLint (one known warning in `postcss.config.mjs`) |
| `npm run typecheck` | Run TypeScript checks |
| `npm test` | Unit tests (validation, auth hashing, map layout, series detection) |
| `npm run test:integration` | Database integration tests (reviews, comments, likes, sessions, throttling); needs the database running and creates and removes its own records |
| `npm run test:e2e` | Playwright browser journey; see the note below |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:migrate` | Apply checked-in migrations |
| `npm run db:seed` | Load demo data |
| `npm run db:backfill-series` | Detect a series for books that have none (calls Open Library) |

## Status

Last verified on October 2, 2026:

- Type checking passes, lint reports no errors, and the production build succeeds.
- 36 unit tests and 18 integration tests pass.
- All routes respond on the dev server; signed-out access to My reviews redirects to sign in, and invalid book IDs show the not-found page.

Not yet verified:

- **Browser tests.** `playwright.config.ts` and `tests/e2e/journey.spec.ts` are written but have never been run (the Playwright browser is not installed). Sign up, review, comment, like, and the map's zoom, pan, and click behavior have not been exercised in a browser.
- **Production server.** `npm start` has not been smoke-tested.
- **Layout.** Styling and the hero and banner artwork have not been reviewed on narrow screens.

Known gaps:

- No rate limit on posting comments beyond the 50-per-review cap, and no moderation or reporting.
- Like counts appear only on book pages, not on cards or My reviews. There are no notifications.
- Series cannot be edited in the app; corrections go through the database or the seed.
- Email verification, password reset, and reading lists are not part of the current release.

## Later deployment

Vercel is the agreed future application host. That phase requires a hosted PostgreSQL database reachable from Vercel, deployment environment variables, an HTTPS `APP_URL`, and application of database migrations. The Docker database remains the local development environment. No deployment is part of the first release.
