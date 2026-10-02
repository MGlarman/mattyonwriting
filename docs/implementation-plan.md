# BookReviews implementation plan

This document records the agreed first release and provides a handoff for completing it. BookReviews lets visitors discover books and read community reviews, while registered readers can write a review and assign a whole-star rating from 1 to 5.

The agreed scope is a public review community with a clean, modern interface. It uses Next.js, local PostgreSQL through Docker Compose, and Open Library. Hosting stays local for now; Vercel is a later step.

## Product decisions

| Area | Decision |
| --- | --- |
| Audience | Readers who want to discover books and share their opinions |
| Public access | Book search, book pages, ratings, and reviews are readable without signing in |
| Accounts | Email and password signup and login; display names are public, emails are private |
| Catalog | Search Open Library and import book details; no manual book-entry flow in this release |
| Reviews | One editable review per reader per book, with required text and a rating |
| Ratings | Integers from 1 to 5; averages displayed to one decimal place |
| Presentation | Responsive light design, neutral backgrounds, blue accents, and clear typography |
| Language and name | English; working name BookReviews |
| Storage | PostgreSQL with a persistent local Docker volume |
| Deferred features | Email verification, password reset, reading lists, social features, moderation tools, and deployment |

## Reader journeys

### Discover books

The homepage provides a prominent title-or-author search, a selection of imported books, and recently published reviews. Empty states explain how to find a book and start the community library. Do not present fabricated reviews or ratings as real community activity.

The search page returns paginated Open Library results with cover images, titles, authors, and locally available community ratings. Search queries are limited to 200 characters, with 12 results per page. Loading, no-results, catalog-error, and retry states must be usable on desktop and mobile.

### Read a book page

A book page displays its title, authors, cover, available description, publication year, and subject tags. Missing covers use a readable placeholder; missing descriptions and years do not prevent the page from rendering.

Each page shows the community average and review count, followed by the newest reviews first. An unrated book displays “No reviews yet” rather than a zero-star rating. Reviews are paginated in groups of 10.

Books are identified by Open Library work IDs such as `OL123W`. Editions belonging to the same work share one local book record and one set of community reviews.

### Create an account

Signup collects a display name, email, and password. Display names contain 2–50 characters; emails are trimmed and normalized to lowercase; passwords contain 12–128 characters. Signup immediately establishes a session because email verification is deferred.

Login accepts an existing email and password. Authentication returns readers to the book they intended to review, or to “My reviews.” Return destinations are restricted to supported local routes. Logout invalidates the database session and removes the session cookie.

### Publish and manage a review

A signed-in reader chooses a whole-star rating and enters 1–5,000 characters of review text after trimming whitespace. The five-star control must work with touch, mouse, and keyboard, with accessible labels and visible focus states.

Saving for the first time creates a review. Saving again for the same user and book updates that review. A database uniqueness constraint prevents duplicate reviews, including concurrent submissions.

Readers can edit or delete their own reviews from the book page and access them through “My reviews.” Deletion requires an explicit confirmation in the interface. Successful mutations refresh book averages, counts, the homepage, and the reader’s review list. Failed submissions show an error and preserve the draft.

## Architecture and interfaces

### Application structure

Use Next.js App Router with TypeScript, Tailwind CSS, and reusable React components. Server-rendered pages read data; server actions handle account and review mutations. Prisma accesses PostgreSQL, while Zod validates submitted fields and external catalog responses.

| Route | Responsibility |
| --- | --- |
| `/` | Discovery, imported books, recent reviews |
| `/search?q=…&page=…` | Open Library search and pagination |
| `/books/[workId]` | Book details, rating summary, reviews, and review editor |
| `/signup` | Create an account |
| `/login` | Sign in |
| `/my-reviews` | Authenticated reader’s reviews and management links |

There is no separate public REST API in this release. Server actions accept form data and return success or error messages, or redirect after account operations.

| Action | Accepted input | Result |
| --- | --- | --- |
| Signup | Display name, email, password, optional return destination | User and session creation, then redirect |
| Login | Email, password, optional return destination | Session creation, then redirect |
| Logout | Session cookie | Session invalidation and homepage redirect |
| Save review | Work ID, rating, review body | Create or update the current user’s review |
| Delete review | Review ID | Delete only when owned by the current user |

Derive user identity from the session on the server. Never accept a submitted user ID as authorization.

### Data model

The schema is in [`prisma/schema.prisma`](../prisma/schema.prisma). The initial SQL migration includes database constraints in addition to form validation.

| Entity | Stored data and constraints |
| --- | --- |
| User | Unique normalized email, display name, password hash, creation time |
| Session | Hashed random session token, owning user, expiry; user deletion cascades |
| Book | Unique Open Library work ID, title, authors, optional cover/year/description, subjects |
| Review | User and book relationships, rating, body, timestamps; unique user/book pair |
| AuthAttempt | Hashed throttle key, attempt count, window start |

The database enforces ratings between 1 and 5 and nonblank review bodies up to 5,000 characters. Average ratings and counts are computed from persisted reviews rather than stored as separate mutable totals.

### Catalog data flow

1. The reader submits a title or author query.
2. The server requests Open Library search results and validates the response.
3. Search results link to work-based book pages.
4. Opening a book first checks PostgreSQL for an existing record.
5. If absent, the server fetches work and author details and imports them using an upsert keyed by work ID.
6. Subsequent visits use the saved details and locally stored reviews.

Catalog requests use a 10-second timeout per request and request a one-hour Next.js cache lifetime. The existing implementation spaces outgoing requests within the application process. Optional `OPEN_LIBRARY_CONTACT` identifies the application in the User-Agent header. This process-local queue is appropriate to the initial local setup; distributed throttling must be reconsidered before scaling to multiple instances.

Saved book metadata remains available during an Open Library outage. New imports and search display an error with a retry option. Covers still load remotely, so image failures use the local placeholder.

### Account and mutation security

Store passwords with Argon2id. Sessions use cryptographically random tokens, with only their SHA-256 hashes stored in PostgreSQL. The current implementation chooses a fixed 14-day session lifetime.

Cookies are HttpOnly and SameSite=Lax, and use Secure when served over HTTPS. Account and review actions validate the request origin against `APP_URL`, validate fields on the server, and enforce ownership for review changes.

Authentication throttling currently permits eight attempts per normalized email in a 15-minute window, backed by an atomic database update. Unknown-account login attempts also perform password hashing to reduce timing differences. Public review responses expose display names, not email addresses or password hashes.

## Implementation status and remaining work

Status as of October 2, 2026. “Verified” means covered by passing type checks, lint, unit or integration tests, the production build, or a request to the running dev server. Nothing has yet been exercised in a browser.

| Area | Current evidence | Remaining work |
| --- | --- | --- |
| Project setup | Dependencies installed; type check, lint, and production build pass on Node.js 26 | Select and document a supported Node.js version range |
| Database | Four migrations (initial, comments, likes, series) applied; constraints covered by integration tests | Verify persistence across container restarts |
| Accounts | Signup/login/logout, sessions, origin checks, and throttling written; sessions and throttling integration-tested | Exercise signup and login in a browser; test duplicate emails and expiry |
| Catalog | Search and import verified against live Open Library responses; series detection unit-tested | Controlled failure-case tests; a live-catalog smoke check |
| Reviews | Upsert, ownership, aggregates, and the rating constraint integration-tested | Concurrent-save and browser verification |
| Comments and likes | Flat comments (1,000 characters, 50 per review) and review/comment likes with self-like prevention; integration-tested including cascades | Posting rate limit, moderation, notifications, like counts outside book pages |
| The Map | `/map` with genre lanes, year axis, series clusters, zoom and pan; layout logic unit-tested | Browser verification of interactions; narrow-screen review |
| Pages and styling | `globals.css`, banners, and responsive rules written; all routes respond | Visual review on desktop and mobile |
| Initial content | Idempotent `db:seed` with real covers, series, and demo accounts | Decide how much demo activity should ship |
| Tests | 36 unit and 18 integration tests pass; Playwright config and journey written | Install the Playwright browser and run `test:e2e`; add scenarios for comments, likes, and the map |
| Build | Production build passes | Smoke-test `npm start` |

### Remaining order

1. Run the browser journey (signup, review, comment, like, delete) and fix what it finds.
2. Review the layout on narrow screens and verify the map interactions.
3. Add comment rate limiting and basic moderation.
4. Smoke-test the production server and pin a supported Node.js version.

## Acceptance criteria

| Scenario | Required outcome |
| --- | --- |
| Public browsing | Signed-out visitors can search and read book pages and reviews |
| Catalog import | Opening a new work imports one record; repeated or concurrent imports do not duplicate it |
| Missing metadata | Missing covers, descriptions, and years render useful fallbacks |
| Catalog failure | Search and new imports show retryable errors; existing book metadata still loads |
| Signup and login | Valid signup works; duplicate normalized emails are rejected; incorrect passwords do not authenticate |
| Sessions | Sessions survive page navigation, expire after their lifetime, and become invalid after logout |
| Origin checks | Mutations from an unexpected origin fail |
| Throttling | Attempts beyond the configured limit fail until the window resets |
| Rating validation | Zero, six, fractional, missing, and nonnumeric ratings are rejected |
| Review validation | Empty or whitespace-only bodies and bodies over 5,000 characters are rejected |
| Ownership | A second reader cannot edit or delete another reader’s review, even with a forged request |
| Uniqueness | Repeated saves maintain one review per reader/book, including concurrent requests |
| Aggregates | Create, edit, and delete update counts and averages; zero reviews show the empty state |
| Persistence | Reviews and accounts survive app and database container restarts with the volume retained |
| Accessibility | Keyboard users can navigate forms and select stars; controls have labels and visible focus |
| Responsive layout | Search, book cards, account forms, and review forms remain usable on narrow screens |
| Quality checks | Type checking, linting, focused tests, browser tests, and production build pass |

Use controlled catalog responses in automated tests so normal test runs do not depend on Open Library availability. Add a separate live-catalog smoke check. Database and browser tests must create and clean up their own records without deleting real reader data.

## Local delivery and later hosting

The local configuration and intended commands are documented in the [README](../README.md). Deliver the first release with a working local preview and verified setup instructions.

Vercel deployment is a later phase. It requires hosted PostgreSQL, connection pooling appropriate to that environment, deployment secrets, an HTTPS `APP_URL`, and migration execution. Revisit catalog throttling and run production account/review smoke tests before treating that deployment as complete.

Email verification and password recovery remain explicitly deferred. Adding either later requires a separate email-delivery decision and implementation.
