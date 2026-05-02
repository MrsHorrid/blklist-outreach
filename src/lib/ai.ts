import { runAgent } from './agent-engine'
import { AGENT_TOOL_DEFS, executeAgentTool, toolWebSearch, isGenericEmail, verifyEmailSMTP } from './agent-tools'
import { getAIProvider } from './ai-provider'
import { webSearch, exaFindCompanies } from './search'

// ── JSON extraction (handles trailing text, markdown fences, refusals) ────────

function stripMarkdown(text: string): string {
  return text.replace(/```(?:json|JSON)?\s*/g, '').replace(/```/g, '')
}

// Walks brackets to find the first complete JSON array, ignoring strings.
function extractJsonArray(text: string): string | null {
  text = stripMarkdown(text)
  const start = text.indexOf('[')
  if (start === -1) return null

  let depth = 0, inStr = false, esc = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (esc) { esc = false; continue }
    if (inStr && c === '\\') { esc = true; continue }
    if (c === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (c === '[') depth++
    else if (c === ']') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

function extractJsonObject(text: string): string | null {
  text = stripMarkdown(text)
  const start = text.indexOf('{')
  if (start === -1) return null

  let depth = 0, inStr = false, esc = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (esc) { esc = false; continue }
    if (inStr && c === '\\') { esc = true; continue }
    if (c === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

// ── Shared AI call (provider-agnostic) ───────────────────────────────────────

async function callAI(prompt: string, maxTokens: number): Promise<string> {
  const { apiKey, baseUrl, model, extraHeaders } = getAIProvider()
  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!res.ok) throw new Error(`AI provider error: ${res.status} ${await res.text()}`)
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
  senderName?: string
  senderTitle?: string
  senderBusiness?: string
  senderDescription?: string
  senderPitch?: string
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

  const senderName = input.senderName || 'Alex'
  const senderBusiness = input.senderBusiness || 'BLKLIST'
  const senderTitle = input.senderTitle || 'Growth'
  const signOff = `${senderName}\n${senderTitle} @ ${senderBusiness}`

  const positioning = input.senderDescription
    ? `About ${senderBusiness}:\n${input.senderDescription}${input.senderPitch ? `\n\nKey value proposition: ${input.senderPitch}` : ''}`
    : BLKLIST_POSITIONING

  const whyFitLabel = `Why ${senderBusiness} fits`

  const prompt = `You are a senior B2B outreach specialist for ${senderBusiness}.

${positioning}

Write a cold outreach email with these specifics:
- Company: ${input.company}
- Industry: ${input.industry}
- Contact: ${input.contactName}, ${input.contactRole}
- Active marketing signals: ${input.signals?.join(', ') || 'Not specified'}
- Brand context: ${input.brandNotes}
${input.whyFit ? `- ${whyFitLabel} (use this): ${input.whyFit}` : ''}

Tone guide: ${toneGuide[input.tone || 'confident']}

Requirements:
1. Open with "Hi ${input.contactName.split(' ')[0]}," — never "Dear" or "Hello"
2. Reference something SPECIFIC about ${input.company}'s current strategy
3. Make the ${senderBusiness} pitch feel like an obvious next step for THEM specifically
${input.senderDescription
  ? `4. End with a soft CTA: a 20-min discovery call`
  : `4. Name-drop at least one relevant client (Adidas, Nike, or Disney+) in context
5. Mention Google backing ($350K) and Lumen verification as trust signals
6. End with a soft CTA: 20-min call to show the numbers`}
7. Sign as: ${signOff}
8. Keep it under 180 words — every word must earn its place
9. NO generic openers like "I hope this finds you well"
10. NO buzzwords like "synergy", "leverage", "scale" without substance

SUBJECT LINES — write 3 that feel like a peer reaching out for a casual chat. Specifically:
- Sound like an invitation to talk, NOT a sales pitch
- Use questions or soft framings ("Quick chat about…?", "15 min on…?", "Idea for…?")
- Lowercase first word is fine and feels more human
- NO percentages, NO ALL CAPS, NO exclamation marks, NO clickbait
- NO words like "opportunity", "synergy", "unlock", "boost"
- Good examples:
  · "quick chat about ${input.company}, ${input.contactName.split(' ')[0]}?"
  · "15 min on ${input.company}'s growth?"
  · "an idea worth your time, ${input.contactName.split(' ')[0]}"
  · "would love your take on ${input.company}'s ads"

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
  const firstName = input.contactName.split(' ')[0]
  const subjectLines = subjectsMatch?.[1]
    ?.trim()
    .split('\n')
    .map((s) => s.replace(/^\d+\.\s*/, '').replace(/^-\s*/, '').trim())
    .filter(Boolean) || [
    `quick chat about ${input.company}, ${firstName}?`,
    `15 min on ${input.company}'s growth?`,
    `an idea worth your time, ${firstName}`,
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

interface Candidate {
  company: string
  domain: string
  emoji: string
  industry: string
  description: string
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

// ── Discovery: two-phase pipeline ─────────────────────────────────────────────
// Phase 1: Find candidate companies (fast — parallel search + 1 LLM call per batch)
// Phase 2: Enrich each candidate in PARALLEL (concurrent agent runs)
//
// This is ~3x faster than running one big agent for all companies sequentially.

export async function discoverLeads(
  input: DiscoveryInput,
  options: { excludeDomains?: string[]; count?: number } = {}
): Promise<{ leads: DiscoveredLead[]; webSearched: boolean }> {
  console.log(`[discover] phase 1: finding candidates...`)
  const t0 = Date.now()

  const candidates = await findCandidates(input, options)
  console.log(`[discover] phase 1 done in ${Date.now() - t0}ms — ${candidates.length} candidates`)

  console.log(`[discover] phase 2: enriching ${candidates.length} candidates in parallel...`)
  const t1 = Date.now()

  const enriched = await Promise.all(
    candidates.map(async (c) => {
      try {
        return await enrichCandidate(c, input)
      } catch (err) {
        console.error(`[enrich:${c.domain}] failed —`, err instanceof Error ? err.message : err)
        return fallbackEnrichment(c)
      }
    })
  )

  console.log(`[discover] phase 2 done in ${Date.now() - t1}ms — total: ${Date.now() - t0}ms`)

  // Phase 3 — SMTP verify every non-generic email in parallel
  console.log(`[discover] phase 3: SMTP verifying emails...`)
  const t2 = Date.now()

  const verified = await Promise.all(
    enriched.map(async (lead) => {
      const email = lead.contactEmail
      const hasLinkedIn = !!lead.contactLinkedIn

      if (!email || isGenericEmail(email)) {
        // Generic/missing — only keep if LinkedIn is available
        if (!hasLinkedIn) {
          console.log(`[smtp] dropping ${lead.company} — generic email, no LinkedIn`)
          return null
        }
        return { ...lead, contactEmail: '' }  // blank the useless email, keep LinkedIn
      }

      const result = await verifyEmailSMTP(email).catch(() => 'unknown' as const)
      console.log(`[smtp] ${email} → ${result}`)

      if (result === 'invalid') {
        // Server explicitly rejected this address
        if (!hasLinkedIn) {
          console.log(`[smtp] dropping ${lead.company} — email invalid, no LinkedIn`)
          return null
        }
        return { ...lead, contactEmail: '' }  // blank it, keep LinkedIn
      }

      if (result === 'unknown' && lead.contactEmailSource === 'guessed' && !hasLinkedIn) {
        // Guessed email, can't verify, no LinkedIn — too risky
        console.log(`[smtp] dropping ${lead.company} — guessed email unverifiable, no LinkedIn`)
        return null
      }

      // valid / catchall / (unknown + scraped/found) / (unknown + LinkedIn) → keep
      return lead
    })
  )

  const valid = verified.filter((l): l is NonNullable<typeof l> => l !== null)
  console.log(`[discover] phase 3 done in ${Date.now() - t2}ms — ${valid.length}/${enriched.length} leads passed SMTP verification`)

  return { leads: valid, webSearched: true }
}

// Exported for streaming SSE route
export { findCandidates, enrichCandidate, fallbackEnrichment }

// Different search query angles — rotated across batches for diversity
const SEARCH_ANGLES = [
  (industry: string, geo: string, signal: string) =>
    `${industry} brand ${geo} active ${signal}`,
  (industry: string, geo: string) =>
    `${industry} company ${geo} CMO "VP Marketing" "Head of Growth"`,
  (industry: string, geo: string) =>
    `${industry} brand ${geo} "paid media" OR "paid social" OR "digital advertising"`,
  (industry: string, geo: string) =>
    `${industry} startup ${geo} venture-backed growth marketing`,
  (industry: string, geo: string) =>
    `${industry} ${geo} brand ecommerce advertising performance marketing`,
]

// Phase 1 — candidate discovery
// When EXA_API_KEY is set: uses Exa outputSchema for structured company data (no LLM needed to parse results).
// Fallback: uses webSearch + LLM to extract companies from snippets.
async function findCandidates(
  input: DiscoveryInput,
  options: { excludeDomains?: string[]; count?: number } = {}
): Promise<Candidate[]> {
  const { excludeDomains = [], count = 5 } = options

  if (process.env.EXA_API_KEY) {
    return findCandidatesViaExa(input, excludeDomains, count)
  }
  return findCandidatesViaBrave(input, excludeDomains, count)
}

// Exa path — uses outputSchema to get structured company data directly.
// excludeDomains cannot be used with category:"company" — post-filter instead.
async function findCandidatesViaExa(
  input: DiscoveryInput,
  excludeDomains: string[],
  count: number
): Promise<Candidate[]> {
  const batches = Math.max(1, Math.ceil(count / 5))
  const excludeSet = new Set(excludeDomains.map(d => d.toLowerCase()))

  // Run parallel company searches with different angles for variety
  const queries = SEARCH_ANGLES.slice(0, batches).map((fn, i) =>
    fn(input.industry, input.geography, SEARCH_ANGLES[i] ? input.adActivity : '')
  )

  const batchResults = await Promise.all(
    queries.map(q => exaFindCompanies(q, 8).catch(() => []))
  )

  // Merge + deduplicate + post-filter excluded domains
  const seen = new Set<string>()
  const companies: Array<{ name: string; domain: string; description: string }> = []

  for (const batch of batchResults) {
    for (const c of batch) {
      const domain = c.domain.toLowerCase()
      if (domain && !seen.has(domain) && !excludeSet.has(domain)) {
        seen.add(domain)
        companies.push(c)
      }
    }
  }

  const slice = companies.slice(0, count)
  if (slice.length === 0) throw new Error('Exa returned no candidates — check EXA_API_KEY')

  // One LLM call to generate signals / score / whyFit / emoji for the batch
  const prompt = `For each of these ${input.industry} companies in ${input.geography}, generate B2B outreach metadata.

${slice.map((c, i) => `${i + 1}. ${c.name} (${c.domain})\n   ${c.description}`).join('\n')}

Return a JSON array (same order, EXACTLY ${slice.length} items):
[{
  "emoji": "1 relevant emoji",
  "signals": ["signal 1", "signal 2", "signal 3"],
  "score": 80,
  "whyFit": "1 sentence why premium native ad placements fit this company",
  "estimatedRevenue": "revenue range",
  "companySize": "X-Y employees"
}]

REMINDER: Return ONLY the JSON array. ${slice.length} objects, same order.`

  const text = await callAI(prompt, 2000)
  const json = extractJsonArray(text)
  type Meta = { emoji?: string; signals?: string[]; score?: number; whyFit?: string; estimatedRevenue?: string; companySize?: string }
  let meta: Meta[] = []
  if (json) { try { meta = JSON.parse(json) } catch { /* use defaults */ } }

  return slice.map((c, i) => ({
    company: c.name,
    domain: c.domain,
    emoji: meta[i]?.emoji || '🏢',
    industry: input.industry,
    description: c.description,
    signals: meta[i]?.signals || [],
    score: meta[i]?.score || 80,
    whyFit: meta[i]?.whyFit || '',
    estimatedRevenue: meta[i]?.estimatedRevenue || '',
    companySize: meta[i]?.companySize || input.companySize,
  }))
}

// Brave/SearXNG fallback path — uses webSearch + LLM to extract companies from snippets.
async function findCandidatesViaBrave(
  input: DiscoveryInput,
  excludeDomains: string[],
  count: number
): Promise<Candidate[]> {
  const sizeHint = SIZE_HINTS[input.companySize] || input.companySize
  const batches = Math.max(1, Math.ceil(count / 5))
  const excludeClause = excludeDomains.length > 0
    ? `\nDo NOT suggest: ${excludeDomains.slice(0, 40).join(', ')}\n`
    : ''

  const batchPromises = Array.from({ length: batches }, async (_, i) => {
    const angleFn = SEARCH_ANGLES[i % SEARCH_ANGLES.length]
    const searchQuery = angleFn(input.industry, input.geography, input.adActivity)
    const searchResults = await webSearch(searchQuery, 10, excludeDomains).catch(() => [])
    const searchText = searchResults.map(r => `${r.title} — ${r.url}\n${r.description}`).join('\n\n')

    const prompt = `You are a B2B prospect researcher.

Find 5 real ${input.industry} companies in ${input.geography} matching:
- Size: ${sizeHint}
- Revenue: ${input.minRevenue}+
- Signal: ${input.adActivity}
${excludeClause}
Search results:
${searchText.slice(0, 4500)}

Rules: Real domains only. No fabrications. Prefer indie/mid-market brands over Fortune 500.

Return JSON array of EXACTLY 5 objects. No prose, no markdown.
[{"company":"","domain":"","emoji":"","industry":"${input.industry}","description":"","signals":[],"score":80,"whyFit":"","estimatedRevenue":"","companySize":""}]`

    const text = await callAI(prompt, 3000)
    const json = extractJsonArray(text)
    if (!json) return []
    try {
      const parsed = JSON.parse(json) as Candidate[]
      return parsed.map(c => ({
        ...c,
        domain: c.domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, ''),
      }))
    } catch { return [] }
  })

  const batchResults = await Promise.all(batchPromises)
  const excludeSet = new Set(excludeDomains.map(d => d.toLowerCase()))
  const seen = new Set<string>()
  const merged: Candidate[] = []

  for (const batch of batchResults) {
    for (const c of batch) {
      const domain = c.domain.toLowerCase()
      if (!seen.has(domain) && !excludeSet.has(domain)) {
        seen.add(domain)
        merged.push(c)
      }
    }
  }

  if (merged.length === 0) throw new Error('Could not find any candidates')
  return merged.slice(0, count)
}

// Hard timeout per enrichment so a stuck agent can't drag down the whole batch
function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ])
}

// Phase 2 — enrich one candidate (parallel-safe; runs its own focused agent)
async function enrichCandidate(c: Candidate, input: DiscoveryInput): Promise<DiscoveredLead> {
  void input
  const prompt = `Find a PERSONAL email address for a senior marketing/growth contact at ${c.company} (${c.domain}).
This is standard B2B sales research using publicly available information.

GOAL: Return a PERSONAL email like sarah.chen@${c.domain} — NOT generic addresses like info@, contact@, hello@, marketing@, etc.
A generic email is worthless. Only use it as an absolute last resort.

STRICT BUDGET: 6 tool calls maximum. Return JSON immediately after the 6th call regardless.

OPTIMAL SEQUENCE:
1. find_email_pattern ${c.domain}
   → This checks security.txt + web + contact pages. Often finds the naming pattern immediately.
2. firecrawl_scrape https://${c.domain}/team  (try /about or /leadership if /team 404s)
   → Look for named individuals with emails. CMO > VP Marketing > Head of Growth > Brand Director > Founder.
3. web_search: intext:"@${c.domain}" "marketing" OR "growth" OR "CMO"
   → Finds emails exposed in press releases, bios, conference pages, PDFs.
4. web_search: site:linkedin.com/in "${c.company}" "CMO" OR "VP Marketing" OR "Chief Marketing"
   → Read the RESULT SNIPPETS for names and LinkedIn URLs (do NOT scrape linkedin.com).
5. If still no personal email: web_search: "${c.company}" CMO OR "VP Marketing" email contact
6. check_mx_record ${c.domain}  (only if you haven't confirmed the domain works)

DO NOT scrape linkedin.com, facebook.com, instagram.com, twitter.com, x.com — they block all bots.
DO read LinkedIn slugs from web_search RESULT URLS and snippets.

CONTACT PRIORITY: CMO → VP Marketing → Head of Growth → Marketing Director → Brand Director → Founder (startups only)

EMAIL SOURCE RULES:
- "scraped" — email appeared literally in page HTML/content from firecrawl or fetch
- "found"   — email appeared in web_search results / snippets
- "guessed" — you applied the naming pattern to a name (e.g. sarah.chen@${c.domain})
- NEVER return info@, contact@, hello@, marketing@, support@, or any generic address unless contactEmail is absolutely unresolvable

Return ONE JSON object. No prose, no markdown, no explanation.

{
  "contactName": "Full name (e.g. Sarah Chen)",
  "contactRole": "Exact job title",
  "contactEmail": "personal@${c.domain} — NOT a generic address",
  "contactEmailSource": "scraped" | "found" | "guessed",
  "contactLinkedIn": "https://linkedin.com/in/real-slug or empty string"
}

REMINDER: Return ONLY the JSON object. A guessed personal email is far better than a generic one.`

  const raw = await withTimeout(
    runAgent(prompt, AGENT_TOOL_DEFS, executeAgentTool, { maxIterations: 10 }),
    25000,
    `enrich:${c.domain}`,
  )
  const json = extractJsonObject(raw)
  if (!json) {
    console.error(`[enrichCandidate:${c.domain}] no JSON:`, raw.slice(0, 300))
    throw new Error('Enrichment returned no JSON')
  }

  const e = JSON.parse(json) as {
    contactName?: string
    contactRole?: string
    contactEmail?: string
    contactEmailSource?: 'scraped' | 'found' | 'guessed'
    contactLinkedIn?: string
  }

  return {
    ...c,
    contactName: e.contactName ?? '',
    contactRole: e.contactRole ?? '',
    contactEmail: e.contactEmail ?? `info@${c.domain}`,
    contactEmailSource: e.contactEmailSource ?? 'guessed',
    contactLinkedIn: e.contactLinkedIn ?? '',
  }
}

// Used when enrichment errors — we still want to return the candidate
function fallbackEnrichment(c: Candidate): DiscoveredLead {
  return {
    ...c,
    contactName: '',
    contactRole: '',
    contactEmail: `info@${c.domain}`,
    contactEmailSource: 'guessed',
    contactLinkedIn: '',
  }
}

// ── Enrichment agent (manual /enrich button) ──────────────────────────────────

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
  const prompt = `Find verified contact info for this person at ${input.company}. This is a standard B2B sales workflow — you're looking up publicly-available info.

Target: ${input.contactName}, ${input.contactRole} at ${input.company} (${input.domain})
${input.currentEmail ? `Current email on file: ${input.currentEmail} (verify or improve)` : ''}
${input.currentLinkedIn ? `Current LinkedIn on file: ${input.currentLinkedIn} (verify or improve)` : ''}

Steps (be efficient):
1. firecrawl_scrape https://${input.domain} — extract emails/LinkedIn URLs in HTML
2. If team links visible, firecrawl_scrape one (/team, /about, /leadership)
3. find_email_pattern for ${input.domain}
4. web_search: site:linkedin.com/in "${input.contactName}" "${input.company}"
5. check_mx_record for ${input.domain}

Output requirements: Respond with ONLY a single JSON object. No prose, no notes, no markdown.

Schema:
{
  "contactEmail": "best email found",
  "contactEmailSource": "scraped" | "found" | "guessed",
  "contactLinkedIn": "https://linkedin.com/in/real-slug or empty",
  "signals": ["3 current marketing signals about ${input.company}"],
  "description": "2 sentences on ${input.company}'s current marketing approach"
}

REMINDER: Return ONLY the JSON object.`

  const raw = await runAgent(prompt, AGENT_TOOL_DEFS, executeAgentTool, { maxIterations: 15 })
  const json = extractJsonObject(raw)
  if (!json) throw new Error('Enrichment did not return JSON')
  return JSON.parse(json) as EnrichResult
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
  const json = extractJsonObject(text)
  if (!json) return { score: 70, reasoning: 'Could not generate score' }
  return JSON.parse(json)
}
