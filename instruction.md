You are a senior full-stack engineer and product designer.
Build a production-ready web application called "BLKLIST Outreach Engine".
🎯 Goal
Create a smart B2B lead generation and outreach platform that:

Finds high-quality potential brand partners
Enriches company + contact data
Generates hyper-personalized outreach emails
Tracks outreach performance and pipeline
⚠️ Constraints (VERY IMPORTANT)

DO NOT build illegal or ToS-violating scraping systems
Prefer APIs, public datasets, or compliant scraping techniques
Include rate limiting, deduplication, and data validation
Follow GDPR-friendly practices (store minimal personal data) 🧠 Core Features
Lead Discovery Engine

Input filters:
Industry (e.g. eCommerce, Fashion, DTC)
Geography
Company size
Ad activity signals (active campaigns, social presence)
Data sources:
Google search results parsing (safe + rate-limited)
LinkedIn company pages (no scraping login-protected pages)
Crunchbase / public startup directories
Brand websites
Output:
Company name
Website
Estimated size
Marketing signals (ads, blog activity, social presence)
Lead Enrichment
For each company:

Extract:
Brand positioning
Tone of voice
Current marketing channels
Target audience hints
Find decision-makers (via public info only):
Marketing managers
Growth leads
Optional integrations:
Clearbit / Apollo / Hunter (mock if no API key)
AI Outreach Generator

Input:
Company data
BLKLIST value proposition
Output:
Highly personalized cold email
Subject line variations
Tone: confident, premium, not spammy
Include:
Specific mention of the brand
Why BLKLIST fits THEM specifically
Social proof (Adidas, Nike, Disney+, Google-backed, Lumen verified)
CTA for meeting
Outreach CRM Dashboard

Kanban pipeline:
Discovered
Contacted
Replied
Meeting booked
Closed
Each lead includes:
Email history
Notes
Status
Last contact timestamp
Email Sending System

Integrate with:
Gmail API or SMTP
Features:
Send emails individually (no bulk spam blasts)
Track opens + replies (basic tracking pixel logic)
Follow-up reminders
Analytics Dashboard

Metrics:
Open rate
Reply rate
Conversion to meetings
Per industry insights:
 
Which niches respond best 🧱 Tech Stack

Frontend: Next.js + Tailwind
Backend: Node.js (API routes or Express)
Database: PostgreSQL
ORM: Prisma
AI: OpenAI or Claude API
Queue system: BullMQ or similar (for lead processing)
🧩 UX Requirements

Clean, modern UI (inspired by Linear / Notion)
Fast and minimal
Searchable lead list
One-click "Generate Email"
One-click "Send Email"
🧪 Bonus Features (if time permits)

“Why this lead?” AI explanation
Lead scoring (0–100)
Duplicate detection
Chrome extension to add leads manually
📝 Seed Data (VERY IMPORTANT)
Hardcode BLKLIST positioning into the system:
BLKLIST enables brands to scale awareness across the open web using native, in-feed placements inside premium publisher environments.
Key selling points:

30%+ CTR
Clients: Adidas, Nike, Disney+
Google invested $350K
Lumen verified
Non-intrusive ad experience
Improves performance of all other channels
🚀 Output Requirements

Full codebase (frontend + backend)
Folder structure
Setup instructions
Environment variables template
Example API routes
Example AI prompt templates
Database schema Think like a startup founder: prioritize what makes this actually useful for closing deals, not just generating leads.