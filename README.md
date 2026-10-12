# Nextimo – website + admin panel

Real estate site for **Nextimo – Недвижими имоти** (Plovdiv), in Bulgarian and English, with an admin panel for the agency.

**Stack:** Next.js 14 (App Router, server actions) · PostgreSQL + Prisma · cookie sessions (JWT, bcrypt) · plain CSS, no UI framework.

## What's included

**Public site** (`/bg`, `/en`)
- Home: search (sale/rent, type, district, max price), featured + newest listings, services, "sell your property" call to action
- Listings with filters (deal type, type, district, price, area), sorting and pages
- Property page: photo gallery, specs, price per m², features, map, agent card, inquiry / viewing request form, similar properties
- "Sell your property" page with valuation form, About (with team), Contact (map + form)
- SEO: per-page titles, Open Graph images, sitemap.xml, robots.txt; spam honeypot + rate limit on forms
- Mobile menu and a floating "Call" button on phones

**Admin panel** (`/admin`, in Bulgarian)
- **Dashboard:** active listings, new inquiries, viewings this week, commissions this month, deals in progress, most-viewed listings
- **Properties:** create/edit in BG + EN, statuses (draft → active → reserved → sold/rented → archive), photo upload, reorder, cover photo, duplicate, link to owner, assign agent, view counts
- **Inquiries:** everything from the site forms; table or pipeline view (New → Contacted → Viewing → Negotiation → Won/Lost), assign agent, one click to turn into a client
- **Clients (CRM):** buyers, tenants, owners, landlords; budget, districts, wanted types, notes timeline, viewings, deals, call/Viber buttons, and **matching listings** for buyers/tenants
- **Viewings:** weekly calendar, schedule with double-booking warning, outcome + client feedback
- **Deals & commissions:** sale/rent deals, commission % or fixed amount, agent split, deposit; property status updates automatically (deposit → reserved, closed → sold/rented); yearly totals, monthly chart, per-agent earnings
- **Agents (admin only):** add agents, roles (Admin / Agent), deactivate, reset password, photo + bio shown on the site
- **Settings (admin only):** phones, email, address, opening hours, social links, office map location, About text, default commission

Roles: **Agents** can work with everything day to day. **Admins** also manage agents and settings and can delete records.

## Run locally

Needs Node 20+ and a PostgreSQL database (local, or free tier on Neon / Supabase).

```bash
cp .env.example .env      # fill in DATABASE_URL and AUTH_SECRET
npm install
npx prisma db push        # creates the tables
npm run db:seed           # creates the admin account + 3 demo listings
npm run dev
```

Open http://localhost:3000 for the site and http://localhost:3000/admin for the panel. Log in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env`, then change the password under **Профил**.

## Import listings from imot.bg

Nextimo's 79 listings on [nextimo.imot.bg](https://nextimo.imot.bg/) can be brought in with one command (run it after `db:seed`, from a machine with internet access):

```bash
npm run import:imot -- --dry      # preview: writes import-preview.json, saves nothing
npm run import:imot               # imports listings + downloads photos (takes ~5–10 min)
```

- It reads the agency profile, then each listing: type, district, price, area, floor, description, construction, heating, features and all photos.
- Titles are generated (e.g. „Тристаен апартамент в кв. Тракия“) — edit any of them in the admin panel.
- Safe to re-run: listings are matched by their imot.bg id. Re-running refreshes price/area/floor but keeps your own edits to titles, texts and status. Add `--archive-missing` to archive listings that were removed from imot.bg.
- The 3 demo listings are removed automatically.
- Photos come with the imot.bg/agency watermark. Replace them with originals where you have them.
- Options: `--limit 5` (test with a few), `--no-photos`.
- If the descriptions in the preview look empty or wrong, imot.bg has changed its page layout — send one listing page's HTML to your developer to adjust `extractDescription` in `scripts/import-imot.ts`.

## Deploy

Photos are saved to disk (`UPLOAD_DIR`), so host it somewhere with a **persistent disk**: a VPS, Railway or Render with a volume. (Vercel's disk is wiped on each deploy — use a VPS, or swap `lib/upload.ts` for S3/Cloudflare R2 storage.)

**VPS with Docker (simplest):**
```bash
cp .env.example .env      # set AUTH_SECRET, NEXT_PUBLIC_SITE_URL, SEED_ADMIN_*, and POSTGRES_PASSWORD
docker compose up -d --build
docker compose exec web npm run db:seed
```
Put Nginx or Caddy in front for HTTPS and the domain.

**Without Docker:** `npm install && npm run build && npx prisma db push && npm start` behind PM2 + Nginx. Set `TZ=Europe/Sofia` on the server.

## Before going live

- Phone (089 916 3240), email (office@nextimo.bg) and address (бул. Дунав 68) are pre-filled — check them under **Настройки**
- The logo is in `public/logo.png` (plus `favicon.png` and `apple-icon.png`)
- Delete the three demo listings and add the real ones
- Add the agents and their photos

## Project map

```
app/(site)/[lang]/        public pages (layout, home, properties, sell, about, contact)
app/(admin)/admin/        login + panel pages
app/api/inquiry/          form submissions from the site
app/uploads/[...path]/    serves uploaded photos
lib/actions/              server actions (properties, crm, schedule, team, auth)
lib/i18n.ts               all BG/EN site texts
lib/constants.ts          labels, Plovdiv districts, features list
prisma/schema.prisma      database model
```
