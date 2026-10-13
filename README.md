# Elastio Sales Deck

Internal app behind **deck.elastio.com**:

1. A rep goes to deck.elastio.com.
2. They sign in with their @elastio.com Google account.
3. The latest sales deck opens on slide one, ready to pitch.

Everything else lives at **deck.elastio.com/admin**, which only admins can open:
uploading and publishing deck versions (and rolling back), seeing which reps
presented which version, and managing admins.

## How it works

- `/` (`app/route.ts`) serves the **live deck version** to any signed-in
  Elastio user. The deck HTML is streamed as-is, with three small scripts
  injected:
  - **auto-start** (`lib/rep-scripts.ts`): skips the deck's setup screen and
    opens slide one, with the presenter field filled from the rep's Google
    name. Esc still goes back to the setup screen to add a customer
    name/logo or switch to the Technical audience. The browser tab is titled
    with the current slide's heading (the deck's own `<title>` only shows on
    slides without one, like the cover).
  - **version reset**: when a new version goes live, clears the deck's
    per-slide state in the rep's browser (title edits, custom slide order),
    which would otherwise land on the wrong slides. Display prefs are kept.
  - **tracking** (`lib/tracking-script.ts`): records the session against the
    version and the rep's email, so admins see who presented what.

  The response carries an ETag, so re-opening an unchanged deck is a 304
  rather than another ~18 MB download.
- `/admin` is the deck-versions page: upload a new deck HTML file, preview any
  version, make one live, delete old ones. Exactly one version is live at a
  time; making an older version live is the rollback.
- `/admin/admins` manages who can open `/admin`.

### Access

| Who | Can open |
|---|---|
| Anyone signed out | `/login` only |
| Any @elastio.com Google account | the deck at `/` |
| Admins | `/admin` |

`proxy.ts` sends signed-out visitors to `/login` and non-admins on `/admin` to
a "no access" page. Each `/api/admin/*` route checks admin status itself.

Admins are anyone listed in the `ADMIN_EMAILS` env var (always admins, can't
be removed in the UI, so nobody gets locked out), plus anyone added on
`/admin/admins`.

### Where deck files live

Deck versions are ~18 MB of HTML, mostly inline images. That's too big for a
Vercel Function request body (4.5 MB), so:

- **On Vercel**, files go in a **private Vercel Blob store**. The admin's
  browser uploads straight to Blob with a short-lived presigned URL
  (`/api/admin/versions/blob-upload`), then registers the upload as a version.
  The deck is streamed back to reps, and streamed responses aren't capped.
- **Locally**, without Blob credentials, files go in `.data/` (gitignored) via
  `/api/admin/versions/local-upload`.

## Local setup

The DB layer uses the standard `postgres` (postgres.js) driver over plain TCP,
so it works the same against a local Postgres and against Neon.

```bash
npm install

# Local Postgres via Docker/Colima (make sure `colima start` has been run)
docker-compose up -d
```

Copy `.env.local.example` to `.env.local` and fill it in (see the table below).
For local dev, `DATABASE_URL` points at the container:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5434/postgres
```

(Port 5434, not 5432, to avoid clashing with other local Postgres instances.
Change it in both `docker-compose.yml` and `.env.local` if 5434 is also taken.)

Apply the schema (safe to re-run; it only creates what's missing):

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

Then `npm run dev`, sign in at http://localhost:3000/admin with an account
listed in `ADMIN_EMAILS`, and upload a deck.

Geolocation of rep sessions (`x-vercel-ip-*` headers) is only populated when deployed to
Vercel; locally it's blank, which is expected.

## Environment variables

| Variable | Where it comes from |
|---|---|
| `DATABASE_URL` | Local: `postgres://postgres:postgres@localhost:5434/postgres`. Cloud: a Neon connection string. Provisioning Postgres from the Vercel dashboard's Storage tab (Neon) injects it automatically. |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | A Google Cloud OAuth 2.0 Client (Web application), ideally an **Internal** app in the elastio.com Workspace. Authorized redirect URIs: `https://deck.elastio.com/api/auth/callback/google`, plus `http://localhost:3000/api/auth/callback/google` for local dev (and any preview domain you use). |
| `AUTH_SECRET` | Any random secret, e.g. `openssl rand -base64 32`. |
| `ALLOWED_EMAIL_DOMAIN` | `elastio.com`. Only Google accounts on this domain can sign in at all. |
| `ADMIN_EMAILS` | Comma-separated emails that are always admins, e.g. `yabood@elastio.com`. |
| `BLOB_STORE_ID` or `BLOB_READ_WRITE_TOKEN` | Set automatically when a Blob store is connected to the Vercel project. Leave unset locally to store decks in `.data/`. |

## Deploying

```bash
vercel link       # link this repo to a Vercel project
```

Then:
1. **Postgres:** Storage tab → add Postgres (Neon) → connect it to the project.
   Run `db/schema.sql` against it.
2. **Blob:** Storage tab → create a Blob store with **private** access →
   connect it to the project (or `vercel blob create-store <name> --access private`).
3. **Auth:** set `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`,
   `ALLOWED_EMAIL_DOMAIN` and `ADMIN_EMAILS` (`vercel env add <name>` or the
   dashboard).
4. **Domain:** add `deck.elastio.com` under the project's Domains and create
   the DNS record Vercel shows. Add its callback URL to the Google OAuth client.
5. `vercel deploy --prod` (or push, if a Git integration is connected).
6. Sign into `/admin`, upload the deck, and leave "Make it live" checked.

## Smoke test

1. Open `/` signed out: you land on `/login`. Sign in with an @elastio.com
   account: the deck opens on slide one with your name in the header.
2. As a non-admin, `/admin` shows "Admins only".
3. As an admin, the version's page on `/admin` lists your session, its
   duration, and per-slide time. Moving through slides changes the tab title
   to each slide's heading.
4. Upload a second version without making it live, preview it, make it live,
   and reload `/`: you get the new deck. Make the first one live again to roll
   back.
