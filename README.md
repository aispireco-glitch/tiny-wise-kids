# TinyWiseKids v3

Financial literacy site for kids ages 4–8, rebuilt with **3D hero (Three.js) + scroll storytelling (GSAP ScrollTrigger + Lenis)** + a free-printable lead-capture form (`/get-printable`) backed by **Supabase**.

---

## Quick start

```bash
cd "D:\AIspire.co\tiny wise kids\HTML\version3"
npm install        # one-time
npm run dev        # http://localhost:5173 — hot reload
npm run build      # produces dist/ for static hosting
npm run preview    # preview the built dist locally
```

---

## How the lead-capture flow works (secure delivery)

```
User clicks "Free" on a printable
   ↓
/get-printable.html?slug=needs-vs-wants
   ↓ (fills form: email, name, child age, role, country, opt-in)
Submit → POST to Edge Function `download-printable`
   ↓
Edge Function (server-side) validates:
   • Strict regex (RFC-ish format)
   • Disposable blocklist (50+ throwaway domains rejected)
   • MX / A record DNS lookup (domain must accept mail)
   • Field whitelist for every value
   ↓
If valid → INSERT lead + generate signed URL (10 min validity)
If invalid → return error code mapped to a specific form field
   ↓
Frontend shows success screen with big "Download PDF" button
   ↓
PDF served from PRIVATE Supabase Storage bucket via signed URL only
   ↓
URL expires after 10 minutes — can't be shared, can't be reused
```

**Key security properties:**
- PDFs live in a **private** Supabase Storage bucket (no public URLs work)
- The signed URL is the **only** way to download, and it's generated server-side after validation
- The bucket name + file names can be public knowledge; without the signed token, requests return 400/403
- The publishable key in the frontend can only *invoke* the Edge Function, not directly access Storage

Each printable has its own slug → its own row in Supabase → its own PDF. Easy to filter who downloaded what.

---

## Supabase setup — already done ✓

The Supabase project is live:

| | |
|---|---|
| **Project name** | `tinywisekids` |
| **Project ID** | `dnabxqumfivvamvrjzmh` |
| **Region** | `us-east-1` |
| **URL** | `https://dnabxqumfivvamvrjzmh.supabase.co` |
| **Dashboard** | https://supabase.com/dashboard/project/dnabxqumfivvamvrjzmh |
| **Table** | `public.leads` |

Schema (`leads` table):
- `id` (bigint, PK)
- `created_at` (timestamptz, auto)
- `email` (text, validated by regex)
- `first_name` (text, 1–60 chars)
- `child_age` (text, one of `3-5` / `5-7` / `7-10`)
- `role` (text, one of `parent` / `teacher` / `other`)
- `country` (text)
- `printable` (text, one of `needs-vs-wants` / `savings-jar`)
- `marketing_opt_in` (boolean)
- `user_agent` (text)
- `referrer` (text)

RLS policies:
- `leads_insert_open` → **anon + authenticated** can INSERT (the public form)
- `auth_read_leads` → only **authenticated** users can SELECT (you, from the dashboard)

> The publishable key in [src/get-printable.js](src/get-printable.js) is **safe to expose** in the browser — RLS ensures the public can only INSERT, never read or modify anything.

### Viewing the leads

1. Go to https://supabase.com/dashboard/project/dnabxqumfivvamvrjzmh
2. Sidebar → **Table Editor** → `leads`
3. Filter by `printable` column to see who asked for each PDF
4. Export → CSV or JSON

### If you ever need to rotate the keys

1. Supabase dashboard → **Project Settings** → **API**
2. Rotate the publishable key
3. Paste the new key into [src/get-printable.js](src/get-printable.js):
   ```js
   const SUPABASE = {
     url: 'https://dnabxqumfivvamvrjzmh.supabase.co',
     publishableKey: 'sb_publishable_NEW_KEY_HERE',
     table: 'leads'
   };
   ```
4. Rebuild + redeploy.

---

## PDFs

PDFs are **NOT** in the repo and **NOT** bundled with the static site. They live in a private Supabase Storage bucket called `printables`.

Current files in the bucket:
- `needs-vs-wants.pdf` (NeedsVsWants_FullColor)
- `savings-jar.pdf` (MyBigSavingGoal_Full Color)

**To update a PDF**: upload the new version to the bucket via the [Supabase dashboard](https://supabase.com/dashboard/project/dnabxqumfivvamvrjzmh/storage/buckets/printables) (overwrite the existing file with the same name).

**To add a new printable**:
1. Upload `<slug>.pdf` to the `printables` bucket in Supabase Storage
2. Add a `<slug>` entry to the `PRINTABLES` constant in the Edge Function ([Supabase dashboard → Edge Functions → download-printable](https://supabase.com/dashboard/project/dnabxqumfivvamvrjzmh/functions))
3. Add a `<slug>` entry to the `PRINTABLES` constant in [src/get-printable.js](src/get-printable.js)
4. Add a `<a class="print-row print-row-free" href="/get-printable.html?slug=<slug>">` row in [index.html](index.html)
5. Extend the `printable` CHECK constraint in the `leads` table:
   ```sql
   alter table public.leads
     drop constraint leads_printable_check,
     add constraint leads_printable_check check (printable in ('needs-vs-wants', 'savings-jar', 'your-new-slug'));
   ```

---

## Deploying to Netlify

Build first, then upload `dist/`.

**Option 1 — Drag & drop (simplest):**
1. `npm run build`
2. Go to Netlify dashboard → site for tinywisekids.com → "Deploys" tab
3. Drag `dist/` folder into the drop zone
4. Done. Same domain, new content.

**Option 2 — Netlify CLI:**
```bash
npm i -g netlify-cli
netlify login
netlify link
netlify deploy --prod --dir=dist
```

**Option 3 — Git auto-deploy (recommended long-term):**
1. Push this folder to GitHub
2. Netlify → Site → Build & deploy → Link to repo
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Every git push auto-deploys.

DNS on Hostinger stays untouched — Netlify keeps the site, just replaces its content.

---

## Stack

- **Vite 5** — bundler, dev server, multi-page build (`index.html` + `get-printable.html`)
- **Three.js** vanilla — hero 3D scene (only loaded on homepage)
- **GSAP 3 + ScrollTrigger** — scroll storytelling, stat counters, signature reveals
- **Lenis** — smooth scroll, coordinated with GSAP ticker
- **Supabase** — lead-capture backend (REST API, no client library — direct fetch keeps the form page lean)

## File map

```
version3/
├── index.html                   ← homepage (hero 3D + scroll story)
├── get-printable.html           ← /get-printable lead form
├── package.json
├── vite.config.js               ← multi-page rollup input config
├── public/
│   └── printables/
│       ├── needs-vs-wants.pdf
│       └── savings-jar.pdf
└── src/
    ├── main.js                  ← homepage entry (loads Three.js, GSAP, etc.)
    ├── get-printable.js         ← form-page entry (Supabase, NO Three.js)
    ├── lenis-setup.js
    ├── nav.js
    ├── faq.js
    ├── observer.js
    ├── scroll-story.js
    ├── hero/
    │   └── scene.js
    └── styles/
        ├── tokens.css
        ├── base.css
        ├── components.css
        ├── hero.css
        ├── sections.css
        ├── motion.css
        └── form.css
```

---

## Bundle sizes (gzipped, production build)

| Page | Total | Notes |
|---|---|---|
| `/` (homepage) | ~200 KB | Three.js dominates (~128 KB) |
| `/get-printable` | ~16 KB | No Three.js, no GSAP — instant load |

---

## Design decisions (anti-AI-slop notes)

- No blur blobs. Background uses paper-grain SVG noise + radial gradient tints.
- No purple/blue gradient. Removed `#9B8FFF`; substituted with warm clay terracotta (`#E07856`).
- No nested-card stacks. Pillars use asymmetric 12-col grid.
- Hero is asymmetric (not centered headline + subtitle + CTA).
- Hover surprises, not confirms (border-color shifts, spring-arrows).
- Motion frequency (Emil framework): high-frequency UI subtle, low-frequency moments orchestrated.
- `prefers-reduced-motion` kills all animations and 3D idle drift.

---

## Known follow-ups

- **OG image**: Drop a real `og-image.png` (1200×630) into `public/`.
- **Noah character art**: All `Noah the Piggy` references removed (per memory: Noah is a boy, not a pig). Add when official art arrives.
- **`/privacy` page**: The form footer links to `#` for "Privacy" — create `/privacy.html`.
- **Analytics**: The form fires a `lead_capture` event if `window.gtag` exists. Wire GA4 / Plausible / Fathom in `index.html` + `get-printable.html` when ready.
- **Email notification on new lead**: Optional follow-up — Supabase can fire a webhook on insert (Supabase → Database → Webhooks). Send to Zapier/Make/n8n to email you when someone downloads, or pipe into Mailchimp/ConvertKit free tier later for a nurture sequence.
