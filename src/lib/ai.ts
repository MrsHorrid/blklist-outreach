import { runAgent } from './agent-engine'
import { AGENT_TOOL_DEFS, executeAgentTool } from './agent-tools'

// ── Shared OpenRouter call (non-agentic) ──────────────────────────────────────

async function callAI(prompt: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not set')
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'BLKLIST Outreach',
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3.5-haiku',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error(`OpenRouter error: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.choices[0].message.content as string
}

// ── BLKLIST context ───────────────────────────────────────────────────────────

export const BLKLIST_POSITIONING = `
BLKLIST enables brands to scale awareness across the open web using native, in-feed placements inside premium publisher environments.

Key facts:
- 30%+ average CTR on native placements
- Clients: Adidas, Nike, Disney+, Google (invested $350K), Lumen-verified
- Non-intrusive ad experience that respects the reader
- Proven to improve performance of ALL other channels
- Premium publisher network: NYT, Bloomberg, Vox, Condé Nast, and 500+ others
- Attention-verified: Lumen eye-tracking data confirms genuine engagement
`

// ── Email generation ──────────────────────────────────────────────────────────

export type EmailTone = 'confident' | 'premium' | 'casual' | 'urgent'

export interface GenerateEmailInput {
  company: string
  industry: string
  contactName: string
  contactRole: string
  brandNotes: string
  signals?: string[]
  tone?: EmailTone
  whyFit?: string
}

export interface GeneratedEmail {
  subject: string
  body: string
  subjectAlternatives: string[]
}

export async function generateOutreachEmail(input: GenerateEmailInput): Promise<GeneratedEmail> {
  const toneGuide = {
    confident: 'Direct and confident. Lead with value. No fluff.',
    premium: 'Refined and exclusive. Peer-to-peer tone. Senior executive to senior executive.',
    casual: 'Warm and conversational. Like a smart friend in the industry.',
    urgent: 'Time-sensitive angle. Mention a specific market window or opportunity.',
  }

  const prompt = `You are a senior B2B outreach specialist for BLKLIST.

${BLKLIST_POSITIONING}

Write a cold outreach email with these specifics:
- Company: ${input.company}
- Industry: ${input.industry}
- Contact: ${input.contactName}, ${input.contactRole}
- Active marketing signals: ${input.signals?.join(', ') || 'Not specified'}
- Brand context: ${input.brandNotes}
${input.whyFit ? `- Why BLKLIST fits (use this): ${input.whyFit}` : ''}

Tone guide: ${toneGuide[input.tone || 'confident']}

Requirements:
1. Open with "Hi ${input.contactName.split(' ')[0]}," — never "Dear" or "Hello"
2. Reference something SPECIFIC about ${input.company}'s current strategy
3. Make the BLKLIST pitch feel like an obvious next step for THEM specifically
4. Name-drop at least one relevant client (Adidas, Nike, or Disney+) in context
5. Mention Google backing ($350K) and Lumen verification as trust signals
6. End with a soft CTA: 20-min call to show the numbers
7. Sign as: Alex\nGrowth @ BLKLIST
8. Keep it under 180 words — every word must earn its place
9. NO generic openers like "I hope this finds you well"
10. NO buzzwords like "synergy", "leverage", "scale" without substance

Format your response EXACTLY like this:
BODY:
[email body here]

SUBJECTS:
[subject line 1]
[subject line 2]
[subject line 3]`

  const text = await callAI(prompt, 1024)

  const bodyMatch = text.match(/BODY:\s*([\s\S]*?)(?=SUBJECTS:|$)/)
  const subjectsMatch = text.match(/SUBJECTS:\s*([\s\S]*)$/)

  const body = bodyMatch?.[1]?.trim() || text
  const subjectLines = subjectsMatch?.[1]
    ?.trim()
    .split('\n')
    .map((s) => s.replace(/^\d+\.\s*/, '').replace(/^-\s*/, '').trim())
    .filter(Boolean) || [
    `Quick question about ${input.company}'s growth strategy`,
    `Why ${input.company} + BLKLIST = 30%+ CTR`,
    `${input.contactName.split(' ')[0]}, saw your ad spend — have you tried this?`,
  ]

  return { subject: subjectLines[0], body, subjectAlternatives: subjectLines.slice(1, 3) }
}

// ── Discovery types ───────────────────────────────────────────────────────────

export interface DiscoveryInput {
  industry: string
  geography: string
  companySize: string
  adActivity: string
  minRevenue: string
}

export interface DiscoveredLead {
  company: string
  domain: string
  emoji: string
  industry: string
  description: string
  contactName: string
  contactRole: string
  contactEmail: string
  contactEmailSource: 'scraped' | 'found' | 'guessed'
  contactLinkedIn: string
  signals: string[]
  score: number
  whyFit: string
  estimatedRevenue: string
  companySize: string
}

const SIZE_HINTS: Record<string, string> = {
  'Startup (1-50)':        'early-stage startups, seed/Series A — NOT household names or Fortune 500',
  'SMB (51-200)':          'growing indie brands, 51–200 employees — no major national brands',
  'Mid-market (201-1000)': 'established mid-market, 201–1000 employees — not Fortune 500 giants',
  'Enterprise (1000+)':    'large enterprises or Fortune 500, 1000+ employees',
}

// ── Discovery agent ───────────────────────────────────────────────────────────

export async function discoverLeads(input: DiscoveryInput): Promise<{ leads: DiscoveredLead[]; webSearched: boolean }> {
  const sizeHint = SIZE_HINTS[input.companySize] || input.companySize

  const prompt = `You are an elite B2B intelligence agent — Apollo.io built on live web data.

Your client is BLKLIST: native in-feed ad placements inside NYT, Bloomberg, Vox, Condé Nast and 500+ publishers. 30%+ avg CTR. Clients: Adidas, Nike, Disney+. Google invested $350K.

══ MISSION ══
Find 5 real ${input.industry} companies in ${input.geography} matching:
- Size: ${sizeHint}
- Revenue: ${input.minRevenue}+
- Ad signal: ${input.adActivity}

══ RESEARCH PLAYBOOK (run for every company) ══

① DISCOVER
web_search: "${input.industry} companies ${input.geography} ${input.minRevenue} revenue digital marketing"
Pick 5 real, specific companies that match. Verify each exists.

② WEBSITE INTELLIGENCE
firecrawl_scrape the company homepage.
Follow any /team, /about, /about-us, /people, /leadership, /company links.
firecrawl_scrape those sub-pages — emails and LinkedIn profiles are embedded in the HTML of team pages.
Also try: firecrawl_scrape https://domain.com/team and https://domain.com/about

③ EMAIL PATTERN
find_email_pattern for the domain.
check_mx_record to confirm email delivery.
Apply the discovered pattern to construct the contact's email.
If emails are found via firecrawl — use those directly and mark as "scraped".

④ LINKEDIN
web_search: site:linkedin.com/in "Contact Full Name" "Company Name"
Extract the real linkedin.com/in/slug from the search result URL.
Also check LinkedIn URLs found in the company page HTML from step ②.

══ OUTPUT ══
Return ONLY a JSON array — no preamble, no explanation:

[{
  "company": "Real company name",
  "domain": "domain.com",
  "emoji": "relevant emoji",
  "industry": "${input.industry}",
  "description": "2 sentences: what they do + their current marketing approach",
  "contactName": "Real person full name",
  "contactRole": "Exact job title",
  "contactLinkedIn": "https://linkedin.com/in/real-slug OR empty string",
  "contactEmail": "email@domain.com",
  "contactEmailSource": "scraped | found | guessed",
  "signals": ["3 specific signals about their marketing activity"],
  "score": 75-95,
  "whyFit": "1-2 sentences why BLKLIST fits this specific company",
  "estimatedRevenue": "revenue range",
  "companySize": "X–Y employees"
}]

══ STRICT RULES ══
- contactLinkedIn: real URL from search results or page HTML — never invented. Empty string if not found.
- contactEmailSource "scraped" = email appeared in EMAILS FOUND from firecrawl/fetch
- contactEmailSource "found" = email appeared in web_search results
- contactEmailSource "guessed" = constructed from pattern, not directly seen
- No Fortune 500 / household names unless criteria says Enterprise
- ONLY return the JSON array`

  const raw = await runAgent(prompt, AGENT_TOOL_DEFS, executeAgentTool, { maxIterations: 40 })
  const match = raw.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('Agent did not return a JSON array')
  const leads: DiscoveredLead[] = JSON.parse(match[0])
  return { leads, webSearched: true }
}

// ── Enrichment agent ──────────────────────────────────────────────────────────

export interface EnrichInput {
  company: string
  domain: string
  contactName: string
  contactRole: string
  currentEmail?: string
  currentLinkedIn?: string
}

export interface EnrichResult {
  contactEmail: string
  contactEmailSource: 'scraped' | 'found' | 'guessed'
  contactLinkedIn: string
  signals: string[]
  description: string
}

export async function enrichLead(input: EnrichInput): Promise<EnrichResult> {
  const prompt = `You are an elite B2B contact researcher. Run a thorough investigation to find verified contact info.

Target:
- Company: ${input.company}
- Domain: ${input.domain}
- Contact: ${input.contactName}, ${input.contactRole}
${input.currentEmail ? `- Current email on file: ${input.currentEmail} (verify or improve)` : ''}
${input.currentLinkedIn ? `- Current LinkedIn on file: ${input.currentLinkedIn} (verify or improve)` : ''}

══ RESEARCH STEPS ══

1. check_mx_record for ${input.domain} to confirm email delivery

2. firecrawl_scrape https://${input.domain} — look for team page links, extract any emails/LinkedIn URLs in the HTML

3. Try these pages for contact info:
   firecrawl_scrape https://${input.domain}/team
   firecrawl_scrape https://${input.domain}/about
   firecrawl_scrape https://${input.domain}/about-us
   firecrawl_scrape https://${input.domain}/people
   firecrawl_scrape https://${input.domain}/leadership

4. find_email_pattern for ${input.domain} — detect naming convention

5. web_search: site:linkedin.com/in "${input.contactName}" "${input.company}"
   — extract the real linkedin.com/in/slug from search result URLs

6. web_search: "${input.contactName}" "${input.company}" email contact
   — look for the person's email in news, bylines, conference listings, etc.

7. web_search: "@${input.domain}" "${input.contactName}"
   — find any email associated with this person at this domain

══ OUTPUT ══
Return ONLY this JSON object:

{
  "contactEmail": "best email found",
  "contactEmailSource": "scraped | found | guessed",
  "contactLinkedIn": "https://linkedin.com/in/real-slug OR empty string",
  "signals": ["3 current marketing signals about ${input.company}"],
  "description": "2 sentences on ${input.company}'s current marketing approach"
}

Rules:
- contactEmailSource "scraped" = email was in EMAILS FOUND from firecrawl/fetch result
- contactEmailSource "found" = email was in a web_search result
- contactEmailSource "guessed" = pattern-constructed or name-based
- contactLinkedIn must come from actual search results — empty string if not confirmed
- Return ONLY the JSON object`

  const raw = await runAgent(prompt, AGENT_TOOL_DEFS, executeAgentTool, { maxIterations: 25 })
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Enrichment agent did not return JSON')
  return JSON.parse(match[0]) as EnrichResult
}

// ── Lead scoring ──────────────────────────────────────────────────────────────

export async function generateLeadScore(lead: {
  industry: string
  companySize: string
  signals: string[]
  description: string
}): Promise<{ score: number; reasoning: string }> {
  const prompt = `Score this lead for BLKLIST (premium native advertising) from 0-100.

${BLKLIST_POSITIONING}

Lead:
- Industry: ${lead.industry}
- Size: ${lead.companySize}
- Signals: ${lead.signals.join(', ')}
- Description: ${lead.description}

Respond with JSON only: {"score": number, "reasoning": "1 sentence explanation"}`

  const text = await callAI(prompt, 256)
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return { score: 70, reasoning: 'Could not generate score' }
  return JSON.parse(jsonMatch[0])
}
