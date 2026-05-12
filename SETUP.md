# Edge Forex — Setup & Installation Guide

## Project Location

```
e:/Joe Gaming/novaforex/
```

## Stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS 4**
- **Supabase** (PostgreSQL + RLS + Realtime)
- **Lucide React** (icons)
- **bcryptjs** (password hashing)
- **jsonwebtoken** (admin session)

---

## Step 1 — Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Open the **SQL Editor** tab.
3. Paste the full contents of `supabase/migrations/001_initial_schema.sql` and run it.
   This creates all tables, functions, triggers, RLS policies, and seed data.

---

## Step 2 — Create First Admin Account

In the Supabase SQL Editor, run:

```sql
INSERT INTO admins (email, password_hash, name)
VALUES (
  'admin@novaforex.com',
  crypt('YourSecurePassword123!', gen_salt('bf')),
  'Super Admin'
);
```

Replace the email and password. **There is no registration endpoint** — all admins must be created directly in the database.

---

## Step 3 — Environment Variables

Copy `.env.local` and fill in your values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # from Supabase → Settings → API
ADMIN_JWT_SECRET=a-long-random-string-at-least-32-characters
```

**Where to find keys:**
- Supabase Dashboard → Settings → API → Project URL and anon/service keys

**Important:** `SUPABASE_SERVICE_ROLE_KEY` is secret — it bypasses RLS. Never expose it to the browser. It is only used in API route handlers.

---

## Step 4 — Install & Run

```bash
cd "e:/Joe Gaming/novaforex"
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to `/admin` which redirects to `/admin-login`.

---

## Admin Panel Routes

| Route | Description |
|---|---|
| `/admin-login` | Admin login (email + password) |
| `/admin` | Dashboard — stats, recent activity |
| `/admin/users` | Users table with search & filters |
| `/admin/users/[id]` | User detail — edit balance, type, overrides |
| `/admin/deposits` | Deposits queue — approve/reject/manual credit |
| `/admin/withdrawals` | Withdrawals queue — approve/reject with reason |
| `/admin/trades` | Full trade history table |
| `/admin/trading-pairs` | Create/edit/delete trading pairs |
| `/admin/house-edge` | Win rate sliders + live exposure monitor |
| `/admin/live-chat` | Simulation settings, name pool, chat feed |
| `/admin/news-ticker` | Headlines management |
| `/admin/bonuses` | Welcome bonus + promo codes |
| `/admin/referrals` | Commission percentages |
| `/admin/support` | Ticket list + reply thread |
| `/admin/settings` | General, Currency, Trading, Deposits, Withdrawals |

---

## Admin Authentication

- **Login:** POST `/api/admin/auth/login` (email + password)
- **Logout:** POST `/api/admin/auth/logout`
- **No register endpoint** — admin accounts are created via SQL only
- Session is stored as an HTTP-only JWT cookie (`nova_admin_token`), valid 8 hours
- `middleware.ts` protects all `/admin/*` and `/api/admin/*` routes automatically

---

## File Structure

```
novaforex/
├── app/
│   ├── (admin)/admin/          # All admin pages (protected by layout)
│   │   ├── layout.tsx          # Sidebar layout — checks JWT
│   │   ├── page.tsx            # Dashboard
│   │   ├── users/
│   │   ├── deposits/
│   │   ├── withdrawals/
│   │   ├── trades/
│   │   ├── trading-pairs/
│   │   ├── house-edge/
│   │   ├── live-chat/
│   │   ├── news-ticker/
│   │   ├── bonuses/
│   │   ├── referrals/
│   │   ├── support/
│   │   └── settings/
│   ├── admin-login/            # Public login page
│   └── api/admin/              # All admin API routes
├── components/admin/           # Sidebar, StatCard, Badge, PageHeader
├── lib/
│   ├── supabase.ts             # Supabase client + admin client
│   └── admin-auth.ts           # JWT sign/verify/session helpers
├── middleware.ts               # Route protection
└── supabase/migrations/
    └── 001_initial_schema.sql  # Full DB schema — run once in Supabase
```

---

## Build for Production

```bash
npm run build
npm start
```

Or deploy to Vercel — add the environment variables in the Vercel dashboard.
