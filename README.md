# BLKLIST Outreach

An AI-powered B2B outreach CRM — discover leads, enrich contact data, and generate personalised cold emails, all from one dashboard.

Built with Next.js 15, Neon PostgreSQL, and an agentic AI engine powered by OpenRouter + Brave Search + Firecrawl.

---

## Features

- **Agentic lead discovery** — describe your target market; the AI searches the web, scrapes company pages, finds decision-maker contacts, and scores each lead
- **Lead enrichment** — one click to deepen any lead: team pages, LinkedIn profiles, active ad signals, brand intelligence
- **AI email generation** — personalised cold emails tailored to each lead's signals, signed with your real name, title, and business
- **Full CRM** — pipeline Kanban, activity log, notes, colour-coded tags, open tracking, email status
- **User accounts** — sign up with email/password or Google; your leads and settings are private to your account
- **Profile-aware AI** — fill in your pitch angle and business description once; every generated email uses your positioning instead of a hardcoded template

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Database | Neon PostgreSQL + Prisma 6 |
| Auth | NextAuth v5 · JWT sessions · Credentials + Google |
| AI | OpenRouter (Claude Haiku by default) |
| Search | Brave Search API |
| Scraping | Firecrawl (JS-rendered pages) |
| Deployment | Vercel |
| Styling | Tailwind CSS v3 |

---

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/your-username/blklist-outreach.git
cd blklist-outreach
pnpm install        # or: npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | [Neon console](https://console.neon.tech) → Connection Details → **Pooled** URL |
| `DIRECT_URL` | Same page → **Direct** URL (needed for schema pushes) |
| `OPENROUTER_API_KEY` | [openrouter.ai/keys](https://openrouter.ai/keys) |
| `BRAVE_SEARCH_API_KEY` | [api.search.brave.com](https://api.search.brave.com/) |
| `FIRECRAWL_API_KEY` | [firecrawl.dev](https://firecrawl.dev) — optional but strongly recommended |
| `NEXTAUTH_SECRET` | Run `openssl rand -hex 32` |

### 3. Push the database schema

```bash
pnpm db:push        # applies prisma/schema.prisma to your Neon DB
```

### 4. Run locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, and start discovering leads.

---

## Deploying to Vercel

1. Import the repo at [vercel.com/new](https://vercel.com/new)
2. Add all environment variables from `.env.local` in the Vercel dashboard
3. Set `NEXTAUTH_URL` to your production URL (e.g. `https://yourdomain.vercel.app`)
4. Deploy — Vercel runs `prisma generate && next build` automatically

---

## Project structure

```
src/
├── app/
│   ├── (auth)/               # Login & signup pages
│   ├── api/
│   │   ├── leads/            # List + create leads
│   │   ├── leads/[id]/       # Get · patch · delete · enrich · generate-email · send-email · tags · notes · emails
│   │   ├── leads/discover/   # Agentic discovery endpoint
│   │   ├── tags/             # Tag CRUD
│   │   ├── dashboard/        # User profile read/write
│   │   ├── analytics/        # Dashboard metrics
│   │   ├── track/[id]/       # Email open-tracking pixel
│   │   └── auth/             # NextAuth handlers + signup
│   ├── dashboard/            # User profile & business settings page
│   ├── leads/                # Lead list + drawer
│   ├── leads/discover/       # Agentic discovery UI
│   ├── pipeline/             # Kanban board
│   └── analytics/            # Email analytics
├── components/
│   ├── layout/               # LayoutShell, Sidebar
│   └── leads/                # LeadDrawer, LeadsPage, etc.
├── lib/
│   ├── ai.ts                 # Email generation + discovery prompts
│   ├── agent-engine.ts       # Multi-step agentic loop
│   ├── agent-tools.ts        # Tool definitions (search, scrape, enrich)
│   ├── db.ts                 # Prisma client singleton
│   ├── email.ts              # Nodemailer sending helper
│   └── search.ts             # Brave Search wrapper
├── auth.ts                   # NextAuth full config (Node.js — Prisma + providers)
├── auth.config.ts            # NextAuth edge-safe config (used by middleware)
└── middleware.ts             # Route protection (redirects to /login)
prisma/
└── schema.prisma             # Full DB schema
```

---

## How the agentic discovery works

When you trigger a discovery run the system runs a multi-step agentic loop:

1. The AI receives your target criteria (industry, geography, company size, ad activity)
2. It calls tools in parallel — Brave Search for company names, Firecrawl to scrape team pages, additional searches for email/LinkedIn
3. Each iteration the AI decides which tools to call next based on what it already knows
4. The loop continues until the AI emits a final structured result with scored lead data
5. Leads are saved to the DB — duplicates (matched by domain) are skipped automatically

---

## Database scripts

```bash
pnpm db:push       # Push schema changes to DB (no migration file)
pnpm db:generate   # Regenerate Prisma client after schema changes
pnpm db:studio     # Open Prisma Studio (visual DB browser)
```

---

## Roadmap

- [ ] Gmail OAuth for real email sending
- [ ] Team workspaces (invite teammates, shared lead pool)
- [ ] Email sequence automation (follow-ups)
- [ ] Chrome extension — add leads from LinkedIn
- [ ] Lead scoring webhooks
- [ ] Zapier / Make integration

---

## License

MIT
