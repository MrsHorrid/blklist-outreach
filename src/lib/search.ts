interface SearchResult {
  title: string
  url: string
  description: string
}

interface BraveResponse {
  web?: { results?: Array<{ title: string; url: string; description: string }> }
}

interface SearXNGResponse {
  results?: Array<{ title: string; url: string; content: string }>
}

async function braveSearch(query: string, count: number): Promise<SearchResult[]> {
  const res = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`,
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

export async function webSearch(query: string, count = 10): Promise<SearchResult[]> {
  if (process.env.BRAVE_SEARCH_API_KEY) {
    const results = await braveSearch(query, count)
    console.log(`[search] got ${results.length} results from Brave`)
    return results
  }
  const results = await searxngSearch(query, count)
  console.log(`[search] got ${results.length} results from SearXNG`)
  return results
}
