interface SearchResult {
  title: string
  url: string
  description: string
}

// Returned by exaFindCompanies — structured company data via Exa outputSchema
export interface ExaCompany {
  name: string
  domain: string
  description: string
}

interface BraveResponse {
  web?: { results?: Array<{ title: string; url: string; description: string }> }
}

interface SearXNGResponse {
  results?: Array<{ title: string; url: string; content: string }>
}

// ── Exa: structured company discovery ────────────────────────────────────────
// Uses category:"company" + outputSchema → returns company objects directly.
// NOTE: category:"company" cannot be combined with excludeDomains (400 error).
// Post-filter excluded domains in the caller instead.
export async function exaFindCompanies(query: string, count: number): Promise<ExaCompany[]> {
  const res = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: { 'x-api-key': process.env.EXA_API_KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      numResults: Math.min(count, 10),
      type: 'auto',
      category: 'company',
      contents: { highlights: true },
      outputSchema: {
        type: 'object',
        description: 'Companies matching the search query',
        required: ['companies'],
        properties: {
          companies: {
            type: 'array',
            description: 'List of matching companies',
            items: {
              type: 'object',
              required: ['name', 'domain', 'description'],
              properties: {
                name:        { type: 'string', description: 'Company name' },
                domain:      { type: 'string', description: 'Primary domain without https:// or www.' },
                description: { type: 'string', description: 'What the company does and their marketing approach' },
              },
            },
          },
        },
      },
    }),
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Exa company search error: ${res.status} ${errText}`)
  }
  const data = await res.json()
  const companies: ExaCompany[] = data.output?.content?.companies || []
  return companies.map(c => ({
    ...c,
    domain: (c.domain || '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').split('/')[0],
  }))
}

// ── Exa: general web search (used by enrichment agent) ───────────────────────
// Supports excludeDomains but does NOT use category (category conflicts with excludeDomains).
async function exaSearch(query: string, count: number, excludeDomains?: string[]): Promise<SearchResult[]> {
  const body: Record<string, unknown> = {
    query,
    numResults: count,
    type: 'auto',
    contents: { highlights: true },
  }
  if (excludeDomains?.length) {
    body.excludeDomains = excludeDomains.slice(0, 100)
  }
  const res = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: { 'x-api-key': process.env.EXA_API_KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12000),
  })
  if (!res.ok) throw new Error(`Exa search error: ${res.status}`)
  const data = await res.json()
  return (data.results || []).slice(0, count).map((r: { title?: string; url: string; highlights?: string[] }) => ({
    title: r.title || '',
    url: r.url,
    description: (r.highlights || []).join(' '),
  }))
}

// ── Brave Search ──────────────────────────────────────────────────────────────
async function braveSearch(query: string, count: number, excludeDomains?: string[]): Promise<SearchResult[]> {
  const exclusions = (excludeDomains || []).slice(0, 5).map(d => `-site:${d}`).join(' ')
  const q = exclusions ? `${query} ${exclusions}` : query
  const res = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=${count}`,
    {
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY!,
      },
      signal: AbortSignal.timeout(8000),
    }
  )
  if (!res.ok) throw new Error(`Brave error: ${res.status}`)
  const data: BraveResponse = await res.json()
  return (data.web?.results || []).slice(0, count).map((r) => ({
    title: r.title,
    url: r.url,
    description: r.description,
  }))
}

// ── SearXNG fallback ──────────────────────────────────────────────────────────
async function searxngSearch(query: string, count: number): Promise<SearchResult[]> {
  const instances = process.env.SEARXNG_URL
    ? [process.env.SEARXNG_URL]
    : ['https://searxng.world', 'https://search.sapti.me', 'https://baresearch.org']

  for (const base of instances) {
    try {
      const res = await fetch(
        `${base}/search?q=${encodeURIComponent(query)}&format=json&categories=general`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
          signal: AbortSignal.timeout(5000),
        }
      )
      if (!res.ok) continue
      const data: SearXNGResponse = await res.json()
      const results = (data.results || []).slice(0, count).map((r) => ({
        title: r.title,
        url: r.url,
        description: r.content,
      }))
      if (results.length > 0) return results
    } catch { /* try next */ }
  }
  throw new Error('No SearXNG instance available')
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function findContactEmail(
  contactName: string,
  company: string,
  domain: string
): Promise<{ email: string; source: 'found' | 'guessed' }> {
  if (process.env.BRAVE_SEARCH_API_KEY && contactName) {
    try {
      const results = await braveSearch(`"${contactName}" "${company}" "@${domain}"`, 5)
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
      for (const r of results) {
        const matches = `${r.title} ${r.description}`.match(emailRegex)
        const hit = matches?.find((e) => e.toLowerCase().endsWith(`@${domain.toLowerCase()}`))
        if (hit) return { email: hit.toLowerCase(), source: 'found' }
      }
    } catch { /* fall through to guess */ }
  }
  const parts = contactName.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean)
  const email = parts.length >= 2 ? `${parts[0]}@${domain}` : `contact@${domain}`
  return { email, source: 'guessed' }
}

// General-purpose web search used by the enrichment agent (email/LinkedIn finding).
// Brave is primary here — it handles site:, intext:, and "@domain" operators that
// Exa's neural search doesn't support. Exa is only used for company discovery
// (via exaFindCompanies, called directly from ai.ts — never through this function).
// Priority: Brave → SearXNG.
export async function webSearch(query: string, count = 10, excludeDomains?: string[]): Promise<SearchResult[]> {
  if (process.env.BRAVE_SEARCH_API_KEY) {
    try {
      const results = await braveSearch(query, count, excludeDomains)
      console.log(`[search] got ${results.length} results from Brave`)
      return results
    } catch (err) {
      console.warn('[search] Brave failed, falling back to SearXNG:', err instanceof Error ? err.message : err)
    }
  }
  const results = await searxngSearch(query, count)
  console.log(`[search] got ${results.length} results from SearXNG`)
  return results
}
