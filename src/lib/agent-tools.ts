import { webSearch as braveSearch } from './search'
import type { ToolDef } from './agent-engine'

// ── HTML helpers ──────────────────────────────────────────────────────────────

function extractEmails(text: string): string[] {
  const re = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g
  return [...new Set((text.match(re) ?? []).filter(
    e => !/\.(png|jpg|jpeg|gif|svg|css|js|woff2?|ttf|eot)$/i.test(e)
      && !/(noreply|no-reply|sentry|@email\.|@cdn\.|@aws\.|@github\.|@sentry\.|example\.com)/i.test(e)
  ))].slice(0, 20)
}

function extractLinkedIns(text: string): string[] {
  const re = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_%-]{3,80})/g
  const out: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) out.push(`https://linkedin.com/in/${m[1]}`)
  return [...new Set(out)].slice(0, 10)
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatPageResult(source: string, emails: string[], linkedins: string[], text: string): string {
  const parts = [`Source: ${source}`]
  if (emails.length) parts.push(`EMAILS FOUND: ${emails.join(', ')}`)
  if (linkedins.length) parts.push(`LINKEDIN PROFILES FOUND: ${linkedins.join(', ')}`)
  parts.push(`CONTENT:\n${text.slice(0, 4500)}`)
  return parts.join('\n\n')
}

// ── Tool: web_search ──────────────────────────────────────────────────────────

export async function toolWebSearch(query: string): Promise<string> {
  try {
    const results = await braveSearch(query, 8)
    if (!results.length) return 'No results found.'
    return results.map((r, i) =>
      `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.description}`
    ).join('\n\n')
  } catch {
    return 'Search failed.'
  }
}

// ── Tool: fetch_page ──────────────────────────────────────────────────────────

const BOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'

export async function toolFetchPage(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': BOT_UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    })
    if (!res.ok) return `HTTP ${res.status} for ${url}`
    const html = await res.text()
    const emails = extractEmails(html)
    const linkedins = extractLinkedIns(html)
    const text = htmlToText(html)
    return formatPageResult(url, emails, linkedins, text)
  } catch (e) {
    return `Error fetching ${url}: ${e instanceof Error ? e.message : String(e)}`
  }
}

// ── Tool: firecrawl_scrape ────────────────────────────────────────────────────
// JS-rendered scraping via Firecrawl. Falls back to fetch_page if no API key.

export async function toolFirecrawlScrape(url: string): Promise<string> {
  if (!process.env.FIRECRAWL_API_KEY) {
    console.log('[firecrawl] no API key — falling back to fetch_page')
    return toolFetchPage(url)
  }
  try {
    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
        timeout: 20000,
        waitFor: 2000,
      }),
      signal: AbortSignal.timeout(30000),
    })
    if (!res.ok) {
      console.warn(`[firecrawl] HTTP ${res.status} — falling back to fetch_page`)
      return toolFetchPage(url)
    }
    const data = await res.json()
    const md = (data.data?.markdown ?? '') as string
    if (!md) return toolFetchPage(url)

    const emails = extractEmails(md)
    const linkedins = extractLinkedIns(md)
    return formatPageResult(url, emails, linkedins, md)
  } catch {
    return toolFetchPage(url)
  }
}

// ── Tool: check_mx_record ─────────────────────────────────────────────────────

export async function toolCheckMxRecord(domain: string): Promise<string> {
  try {
    const dns = (await import('dns')).promises
    const records = await dns.resolveMx(domain)
    if (!records.length) return `⚠ No MX records for ${domain} — domain cannot receive email`
    const exchangers = records.sort((a, b) => a.priority - b.priority).map(r => r.exchange)
    return `✓ ${domain} has MX records: ${exchangers.join(', ')} — email delivery confirmed`
  } catch {
    return `✗ Could not resolve MX for ${domain} — may not receive email or DNS error`
  }
}

// ── Tool: find_email_pattern ──────────────────────────────────────────────────

export function detectEmailPattern(emails: string[], domain: string): string {
  const locals = emails
    .filter(e => e.toLowerCase().endsWith(`@${domain.toLowerCase()}`))
    .map(e => e.split('@')[0].toLowerCase())
    .filter(l => /^[a-z]/.test(l) && l.length >= 3)

  for (const l of locals) {
    if (/^[a-z]+\.[a-z]{2,}$/.test(l)) return 'firstname.lastname'
    if (/^[a-z]\.[a-z]{2,}$/.test(l))   return 'f.lastname'
    if (/^[a-z]{2,6}[a-z]{2,8}$/.test(l) && l.length >= 7) return 'firstnamelastname'
    if (/^[a-z]{2,12}$/.test(l))         return 'firstname'
  }
  return 'firstname'
}

export function buildEmailFromPattern(pattern: string, fullName: string, domain: string): string {
  const parts = fullName.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean)
  const [f = '', l = ''] = parts
  switch (pattern) {
    case 'firstname.lastname':  return `${f}.${l}@${domain}`
    case 'f.lastname':          return `${f[0] ?? 'x'}.${l}@${domain}`
    case 'firstnamelastname':   return `${f}${l}@${domain}`
    default:                    return `${f}@${domain}`
  }
}

export async function toolFindEmailPattern(domain: string): Promise<string> {
  try {
    const results = await braveSearch(`"@${domain}" email OR contact OR team`, 8)
    const allText = results.map(r => `${r.title} ${r.description}`).join(' ')
    const found = extractEmails(allText).filter(
      e => e.toLowerCase().endsWith(`@${domain.toLowerCase()}`)
    )
    const unique = [...new Set(found)].slice(0, 10)

    if (!unique.length) {
      return `No public emails found at ${domain}. Default pattern: firstname@${domain} (e.g. john@${domain})`
    }

    const pattern = detectEmailPattern(unique, domain)
    const example = unique[0]
    return [
      `Emails found at ${domain}: ${unique.join(', ')}`,
      `Detected pattern: ${pattern}`,
      `Example: ${example}`,
      `Use this pattern when constructing contact email addresses for ${domain}`,
    ].join('\n')
  } catch {
    return `Could not find email pattern for ${domain}. Use firstname@${domain} as fallback.`
  }
}

// ── Tool executor (single dispatch function) ──────────────────────────────────

export async function executeAgentTool(name: string, args: Record<string, string>): Promise<string> {
  switch (name) {
    case 'web_search':         return toolWebSearch(args.query)
    case 'fetch_page':         return toolFetchPage(args.url)
    case 'firecrawl_scrape':   return toolFirecrawlScrape(args.url)
    case 'check_mx_record':    return toolCheckMxRecord(args.domain)
    case 'find_email_pattern': return toolFindEmailPattern(args.domain)
    default:                   return `Unknown tool: ${name}`
  }
}

// ── Tool definitions (for OpenRouter function calling) ────────────────────────

export const AGENT_TOOL_DEFS: ToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web. Use for: finding companies, discovering real LinkedIn profiles via site:linkedin.com/in "Name" "Company" queries, finding "@domain.com" emails in the wild, and general research.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'The search query' } },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'fetch_page',
      description: 'Fetch a webpage via raw HTTP and extract emails, LinkedIn /in/ profile URLs, and text. Best for simple static pages. Automatically surfaces any emails and LinkedIn links found in the HTML.',
      parameters: {
        type: 'object',
        properties: { url: { type: 'string', description: 'Full https:// URL to fetch' } },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'firecrawl_scrape',
      description: 'Scrape a webpage with full JavaScript rendering (like a real browser). USE THIS for company team pages, about pages, leadership pages, and any modern React/Next.js sites. Extracts emails and LinkedIn /in/ profile URLs automatically. Preferred over fetch_page for company websites.',
      parameters: {
        type: 'object',
        properties: { url: { type: 'string', description: 'Full https:// URL to scrape' } },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_mx_record',
      description: 'Check if a domain has MX records and can receive email. Use to validate a domain before constructing contact email addresses.',
      parameters: {
        type: 'object',
        properties: { domain: { type: 'string', description: 'Domain name e.g. ritual.com' } },
        required: ['domain'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_email_pattern',
      description: 'Search the web for any publicly visible emails at a domain to detect the email naming convention (firstname@, firstname.lastname@, f.lastname@, etc.). Always run this before guessing a contact email.',
      parameters: {
        type: 'object',
        properties: { domain: { type: 'string', description: 'Domain name e.g. ritual.com' } },
        required: ['domain'],
      },
    },
  },
]
