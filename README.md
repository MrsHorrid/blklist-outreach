# BLKLIST Outreach Engine

Smart B2B lead generation and outreach platform — Next.js 15 + Neon PostgreSQL + Claude AI.

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 (App Router) |
| Database | Neon PostgreSQL (serverless) |
| ORM | Prisma 6 + `@prisma/adapter-neon` |
| AI | Anthropic Claude (`claude-sonnet-4-20250514`) |
| UI | Tailwind CSS v3 |
| Runtime | Node.js 18+ |

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/yourorg/blklist-outreach
cd blklist-outreach
npm install
```

### 2. Set up Neon

1. Go to [console.neon.tech](https://console.neon.tech) and create a free project
2. Click **Connection Details** → select **Pooled connection** → copy the URL
3. Also copy the **Direct connection** URL (needed for Prisma migrations)

### 3. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
DATABASE_URL="postgresql://..."         # Neon pooled URL
DIRECT_URL="postgresql://..."           # Neon direct URL  
ANTHROPIC_API_KEY="sk-ant-..."          # From console.anthropic.com
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Set up the database

```bash
# Generate Prisma client
npm run db:generate

# Push schema to Neon (creates tables)
npm run db:push

# Seed with 10 realistic leads
npm run db:seed
```

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Features

### Leads CRM
- Full-text search across companies, contacts, industries
- Filter by pipeline stage
- Click any row → side panel with full lead details
- Move stages with one click
- Add notes inline

### Pipeline Kanban
- 5-stage pipeline: Discovered → Contacted → Replied → Meeting → Closed
- Click any card to expand and move to next stage
- Score indicators (green/amber/red dot)

### AI Lead Discovery
- Configure industry, geography, company size, ad activity, revenue
- Claude discovers 5 real, named companies with brand intelligence
- Each result includes "Why BLKLIST fits" AI explanation
- One-click add to leads (deduplication included)

### AI Email Generator
- Pre-fill from any lead with one click
- 4 tone options: Confident / Premium / Casual / Urgent
- Claude generates personalized email + 3 subject line variations
- BLKLIST positioning (Adidas, Nike, Disney+, Google $350K, Lumen) baked into every prompt
- Copy or save-and-mark-as-sent directly

### Analytics
- KPI cards: total leads, contact rate, open rate, reply rate
- Conversion funnel visualization
- Reply rate by industry (bar chart)
- Weekly activity line chart
- Pipeline distribution pie chart

---

## Project Structure

```
blklist-outreach/
├── prisma/
│   ├── schema.prisma          # DB schema — Lead, Email, Note, Activity
│   └── seed.ts                # 10 pre-seeded realistic leads
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── leads/         # GET (list) + POST (create)
│   │   │   ├── leads/[id]/    # GET + PATCH + DELETE single lead
│   │   │   ├── leads/[id]/notes/  # POST note
│   │   │   ├── emails/        # POST send + GET tracking pixel
│   │   │   ├── generate/      # POST AI email generation
│   │   │   ├── discover/      # POST AI lead discovery
│   │   │   └── analytics/     # GET dashboard metrics
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── layout/            # Shell, Topbar, Sidebar
│   │   ├── leads/             # LeadsPage with table + detail panel
│   │   ├── pipeline/          # PipelinePage kanban
│   │   ├── generator/         # GeneratorPage + DiscoverPage
│   │   ├── analytics/         # AnalyticsPage with charts
│   │   └── ui/                # Button, Input, Badge, Toast, etc.
│   ├── lib/
│   │   ├── db.ts              # Prisma + Neon adapter singleton
│   │   ├── ai.ts              # Anthropic client + prompt templates
│   │   └── utils.ts           # cn(), formatDate(), formatRelative()
│   └── types/
│       └── index.ts           # All TypeScript interfaces + enums
```

---

## API Reference

### Leads

```
GET  /api/leads                    # List leads (search, status, industry filters)
POST /api/leads                    # Create lead
GET  /api/leads/:id                # Get lead with emails, notes, activities
PATCH /api/leads/:id               # Update lead (status, score, contact, etc.)
DELETE /api/leads/:id              # Delete lead
POST /api/leads/:id/notes          # Add note
```

### AI

```
POST /api/generate                 # Generate email
  Body: { leadId?, company, industry, contactName, contactRole, brandNotes, tone, save }
  Returns: { email: { subject, body, subjectAlternatives } }

POST /api/discover                 # Discover leads via AI
  Body: { industry, geography, companySize, adActivity, minRevenue }
  Returns: { results: DiscoveredLead[] }
```

### Emails & Analytics

```
POST /api/emails                   # Save/send email, updates lead status
GET  /api/emails?t={trackingId}    # Tracking pixel (1x1 GIF)
GET  /api/analytics                # Full dashboard metrics
```

---

## AI Prompt Strategy

All AI prompts are in `src/lib/ai.ts`. Key design decisions:

**Email generation prompt:**
- Injects BLKLIST positioning into system context
- Requires specific brand signal references (not generic)
- Forces name-drop of real clients contextually
- Enforces 180-word limit — every word must earn its place
- Returns structured `BODY: / SUBJECTS:` format for reliable parsing

**Discovery prompt:**
- Returns JSON array directly (no markdown)
- Asks for real, named companies only
- Includes `alreadyAdded` deduplication check from DB

---

## Deployment

### Vercel (recommended)

```bash
npx vercel
```

Add environment variables in Vercel dashboard.

**Important:** Neon's serverless driver works natively on Vercel Edge and Serverless runtimes. No cold start connection pool issues.

### Environment variables needed in production

```
DATABASE_URL
DIRECT_URL
ANTHROPIC_API_KEY
NEXT_PUBLIC_APP_URL
```

---

## Database Management

```bash
npm run db:studio     # Open Prisma Studio (visual DB browser)
npm run db:migrate    # Create a new migration
npm run db:push       # Push schema changes without migration
npm run db:seed       # Re-seed with sample leads
```

---

## BLKLIST Positioning Reference

Baked into every AI-generated email:

- **30%+ CTR** on native in-feed placements
- **Clients**: Adidas, Nike, Disney+
- **Google invested $350K**
- **Lumen-verified** attention metrics (eye-tracking proof)
- **Non-intrusive** — premium publisher environments only
- **Lifts all other channels** — not standalone, multiplier effect
- **Open web** — not social, not search — differentiated channel

---

## Future Roadmap

- [ ] Gmail OAuth integration for real sending
- [ ] Lead scoring webhook (auto-score on creation)
- [ ] Chrome extension to add leads from LinkedIn
- [ ] Follow-up reminder scheduling
- [ ] Email sequence automation
- [ ] Team collaboration (multi-user)
- [ ] Zapier/webhook integration
