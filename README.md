# CourseHub

A Udemy-style course marketplace: anyone can publish a course, anyone can
enroll. This is version 1 — browse, search, enroll, and watch lessons, all free.

## Stack

| Piece            | Choice                          | Why                                              |
| ---------------- | ------------------------------- | ------------------------------------------------ |
| Framework        | Next.js 16 (App Router)         | Server Components + Server Actions in one project |
| Language         | TypeScript                      |                                                    |
| Styling          | Tailwind CSS 4                  |                                                    |
| Database         | Postgres via Prisma 7           | Required for deployment; see below                |
| Auth             | Hand-rolled sessions            | SHA-256 token digests, no external dependency     |
| Video            | Bunny Stream                    | Cheapest credible option at real traffic volumes  |
| Payments         | Not wired up yet                | `priceCents` is already on the model              |

## Getting started

```bash
npm install
cp .env.example .env          # committed defaults match docker-compose.yml
docker compose up -d          # Postgres on localhost:5432
npm run db:migrate            # applies prisma/migrations
npm run db:seed               # 5 categories, 4 demo users, 6 courses
npm run dev
```

Open <http://localhost:3000>.

### Why Postgres and not SQLite

The app deploys to Firebase App Hosting, which runs on Cloud Run with an
ephemeral, read-only filesystem. A SQLite file would be empty on every deploy,
so the schema targets Postgres and local development runs Postgres in Docker.

Prisma validates the driver adapter against the `provider` in
`prisma/schema.prisma` and refuses to start if they disagree, so the provider
is a single fixed value and cannot be picked from `DATABASE_URL` at runtime.

### Demo accounts

All use the password `password123`.

| Email                  | Role       |
| ---------------------- | ---------- |
| `sam@coursehub.dev`    | Student    |
| `aisha@coursehub.dev`  | Instructor |
| `marco@coursehub.dev`  | Instructor |
| `priya@coursehub.dev`  | Instructor |

## How authorization works

Every permission check lives in `src/lib/dal.ts` rather than in components, so
a new call site cannot forget to authorize. There are four gates:

- `getCurrentUser()` — who is this, or `null`.
- `requireUser()` — redirects to `/login` if signed out.
- `requireRole("INSTRUCTOR")` — redirects home if the role does not match.
- `canViewLesson(userId, lessonId, courseInstructorId)` — resolves lesson
  ownership, preview status, and enrollment.

Rules that are easy to get wrong, and how they behave here:

- **Preview lessons are public.** Signed-out visitors can watch them. This is
  why the preview check runs *before* the signed-in check.
- **Course owners always pass** `canViewLesson`, including for their own drafts.
- **Every Server Action re-checks authorization.** Actions are reachable by
  direct `POST`, so trusting the UI is not an option. `addLesson` and
  `setCourseStatus` both verify `course.instructorId === user.id`.
- **Ownership is checked, not just role.** Being an instructor grants nothing
  on somebody else's course.

## Video

`src/lib/bunny.ts` wraps Bunny Stream. Two credentials:

```
BUNNY_STREAM_API_KEY=      # server only, never sent to the browser
BUNNY_STREAM_LIBRARY_ID=
```

Playback uses **signed** tokens (`signBunnyPlayback`) rather than raw CDN URLs,
so a player URL that leaks cannot be replayed forever. Tokens are valid for
4 hours.

Uploads go browser → Bunny directly (`src/components/course-editor-forms.tsx`),
so course recordings never pass through the Next.js server. The upload URL is
signed in `src/app/api/bunny/upload/[videoId]/route.ts`, which re-verifies the
instructor role before returning it.

**Leaving the Bunny variables blank is fine.** Lessons then show a setup
notice, and the rest of the app works normally.

`Lesson.videoProvider` also supports `YOUTUBE`, `VIMEO` and `EXTERNAL` (a
direct MP4 URL), which is the cheapest way to get real video up before wiring
up a paid provider.

## Project layout

```
prisma/
  schema.prisma        Data model
  seed.ts              Demo data
src/
  app/
    page.tsx           Home: categories + newest courses
    courses/           Catalog with search/filter/pagination
    courses/[slug]/    Course detail + enrollment
    learn/[slug]/      Lesson player (resumes where you left off)
    dashboard/         Student: enrollments and progress
    instructor/        Instructor: course list, create, edit, publish
    actions/           Server Actions (auth, enrollment, courses)
  components/          UI, split into Server and Client Components
  lib/
    db.ts              Prisma client (driver adapter, hot-reload safe)
    dal.ts             Data Access Layer — all authorization lives here
    session.ts         Session cookie + database lookup
    courses.ts         Course queries
    bunny.ts           Bunny Stream signing and upload
  generated/prisma/    Generated client (gitignored)
docker-compose.yml     Local Postgres for development
apphosting.yaml        Firebase App Hosting config
.firebaserc            Firebase project id
```

## Scripts

| Command             | What it does                              |
| ------------------- | ----------------------------------------- |
| `npm run dev`       | Dev server                                |
| `npm run build`     | Production build                          |
| `npm run start`     | Serve the production build                |
| `npm run lint`      | ESLint                                    |
| `npm run typecheck` | `tsc --noEmit`                            |
| `npm run db:migrate`| Create and apply a migration              |
| `npm run db:seed`   | Reset and reload demo data                |
| `npm run db:studio` | Browse the database in a GUI              |
| `docker compose up -d` | Start the local Postgres              |
| `npx tsx scripts/db-stats.ts` | Row counts, to sanity-check the DB |

## What is not built yet

Deliberately deferred, in the order I would tackle them:

1. **Payments.** `Course.priceCents` already exists. Adding Stripe means
   introducing `Order` / `CheckoutSession` models, a webhook route, and
   enrolling on `checkout.session.completed` instead of on button click.
   Instructor payouts need Stripe Connect and a tax profile.
2. **Lesson reordering and deletion.** Sections and lessons are appended with
   a `position` counter; there is no drag-and-drop or delete yet.
3. **Playhead persistence.** `LessonProgress.lastPositionSeconds` is stored but
   nothing writes to it, so "resume" resumes by lesson, not by timestamp.
4. **Search.** Uses `contains` with `mode: "insensitive"`, which is a plain
   unindexed `ILIKE`. Fine for a few hundred courses; switch to Postgres full
   text search (`tsvector`) well before Elasticsearch is on the table.
5. **Email verification and password reset.** Both need a mail provider.
6. **Tests.** No test suite yet. `src/lib/dal.ts` is the place to start, since
   it holds the authorization rules.

## Deploying to Firebase App Hosting

Target project: `medemy-1ecad` (set in `.firebaserc`).

App Hosting builds the app from a **GitHub repository** — it cannot be handed a
local folder. Config lives in `apphosting.yaml`.

### Prerequisites

1. A hosted Postgres. Neon is the easiest (free tier, no VPC config); Cloud SQL
   also works but must sit in the same VPC as the backend.
2. The `main` branch of this project pushed to GitHub.

### Steps

```bash
# 1. Authenticate (opens a browser)
firebase login

# 2. Point the local repo at a new empty GitHub repo
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main

# 3. Create the backend, linked to that repo
firebase apphosting:backends:create --project medemy-1ecad
```

Then, in the Firebase console for the backend:

- **Environment variables**: add
  - `DATABASE_URL` — the hosted Postgres connection string
  - `SESSION_SECRET` — `openssl rand -base64 32`
  - `BUNNY_STREAM_API_KEY` / `BUNNY_STREAM_LIBRARY_ID` — optional
- **Point the backend at the existing database** if you seeded elsewhere, or
  run `npx prisma migrate deploy` against the hosted database once.

`npm run build` does not touch the database, so the build succeeds even before
`DATABASE_URL` is set; the failure appears at request time, and `src/app/error.tsx`
surfaces it with a hint about SQLite.

### Applying migrations to the hosted database

```bash
DATABASE_URL="postgresql://..." npx prisma migrate deploy
DATABASE_URL="postgresql://..." npm run db:seed   # optional demo data
```

Use `migrate deploy` (not `migrate dev`) against production: it applies
committed migrations and will not create new ones.
