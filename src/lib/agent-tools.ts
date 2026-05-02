import { webSearch as braveSearch } from './search'
import type { ToolDef } from './agent-engine'

// ── HTML helpers ──────────────────────────────────────────────────────────────

// Generic/role-based emails that are useless for direct outreach
const GENERIC_LOCALS = new Set([
  'info', 'hello', 'contact', 'support', 'admin', 'hr', 'sales', 'marketing',
  'webmaster', 'noreply', 'no-reply', 'team', 'mail', 'office', 'general',
  'enquiries', 'enquiry', 'inquiry', 'help', 'service', 'services', 'media',
  'press', 'pr', 'news', 'careers', 'jobs', 'recruiting', 'legal', 'accounts',
  'billing', 'customerservice', 'care', 'operations', 'ops', 'management',
  'hello', 'hey', 'hi', 'welcome', 'abuse', 'security', 'privacy', 'compliance',
])

export function isGenericEmail(email: string): boolean {
  if (!email || !email.includes('@')) return true
  const local = email.split('@')[0].toLowerCase().replace(/[^a-z]/g, '')
  return GENERIC_LOCALS.has(local)
}

// Decode HTML entities + common obfuscation tricks before running email regex
function decodeEmailObfuscation(text: string): string {
  return text
    // HTML numeric entities: &#64; → @, &#46; → .
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    // HTML hex entities: &#x40; → @
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    // Named entity &amp; &lt; etc (only the ones that matter for emails)
    .replace(/&amp;/gi, '&')
    // Common [at] / (at) / " at " obfuscation
    .replace(/\s*\[at\]\s*/gi, '@')
    .replace(/\s*\(at\)\s*/gi, '@')
    .replace(/\s*\[dot\]\s*/gi, '.')
    .replace(/\s*\(dot\)\s*/gi, '.')
    // Zero-width chars sometimes inserted to break regex
    .replace(/[​-‍﻿]/g, '')
}

// Extract emails from raw HTML or text — includes mailto: hrefs + obfuscation decoding
function extractEmails(raw: string): string[] {
  const decoded = decodeEmailObfuscation(raw)

  // Pull mailto: values directly (most reliable source)
  const mailtoRe = /mailto:([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/gi
  const mailtoEmails: string[] = []
  let m: RegExpExecArray | null
  while ((m = mailtoRe.exec(decoded)) !== null) mailtoEmails.push(m[1].toLowerCase())

  // Standard email regex
  const emailRe = /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g
  const regexEmails = (decoded.match(emailRe) ?? []).map(e => e.toLowerCase())

  const all = [...mailtoEmails, ...regexEmails]
  return [...new Set(all.filter(
    e => !/\.(png|jpg|jpeg|gif|svg|css|js|woff2?|ttf|eot)$/i.test(e)
      && !/(noreply|no-reply|sentry|@email\.|@cdn\.|@aws\.|@github\.|@sentry\.|example\.com|@2x\.|@3x\.)/i.test(e)
  ))].slice(0, 30)
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
  // Surface personal emails prominently; flag generics separately
  const personal = emails.filter(e => !isGenericEmail(e))
  const generic = emails.filter(e => isGenericEmail(e))

  const parts = [`Source: ${source}`]
  if (personal.length) parts.push(`PERSONAL EMAILS FOUND: ${personal.join(', ')}`)
  if (generic.length)  parts.push(`GENERIC/ROLE EMAILS (less useful): ${generic.join(', ')}`)
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
    try {
      const host = new URL(url).hostname
      if (SCRAPE_BLOCKLIST.test(host)) {
        return `Cannot fetch ${host} (blocks bots). Use web_search instead.`
      }
    } catch { return `Invalid URL: ${url}` }

    const res = await fetch(url, {
      headers: {
        'User-Agent': BOT_UA,
        Accept: 'text/html,application/xhtml+xml,text/plain',
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

// ── Email SMTP verification ───────────────────────────────────────────────────
// Probes the domain's mail server to check if an address actually exists.
// Returns 'valid' | 'invalid' | 'catchall' | 'unknown'
// - valid:    MX server accepted RCPT TO for this address
// - invalid:  MX server explicitly rejected this address (5xx)
// - catchall: domain accepts everything (can't distinguish real from fake)
// - unknown:  port blocked, timeout, TLS-only, or other undeterminable

export type SmtpResult = 'valid' | 'invalid' | 'catchall' | 'unknown'

export async function verifyEmailSMTP(email: string): Promise<SmtpResult> {
  const [local, domain] = email.toLowerCase().split('@')
  if (!local || !domain) return 'unknown'

  let mxHost: string
  try {
    const { promises: dns } = await import('dns')
    const mx = await dns.resolveMx(domain)
    if (!mx.length) return 'invalid'
    mx.sort((a, b) => a.priority - b.priority)
    mxHost = mx[0].exchange
  } catch {
    return 'unknown'
  }

  // Sends EHLO → MAIL FROM → RCPT TO; resolves with the 3-digit RCPT response code
  const probe = (addr: string): Promise<string> =>
    new Promise(async (resolve) => {
      try {
        const { default: net } = await import('net')
        const socket = net.createConnection({ host: mxHost, port: 25 })
        socket.setTimeout(7000)

        let sentRcpt = false
        let rcptCode = ''
        const cmds = ['EHLO mail.blklist.com', 'MAIL FROM:<>', `RCPT TO:<${addr}>`, 'QUIT']
        let cmdIdx = 0
        const send = () => socket.write(cmds[cmdIdx++] + '\r\n')

        socket.on('data', (buf: Buffer) => {
          const code = buf.toString().substring(0, 3)
          if (sentRcpt) {
            rcptCode = code
            socket.write('QUIT\r\n')
            socket.end()
          } else if (['220', '250', '221'].includes(code)) {
            if (cmdIdx < 3) { send() }
            else { sentRcpt = true; send() }   // send RCPT TO
          } else {
            resolve(code); socket.destroy()
          }
        })
        socket.on('close', () => resolve(rcptCode || 'closed'))
        socket.on('timeout', () => { socket.destroy(); resolve('timeout') })
        socket.on('error', () => resolve('error'))
      } catch {
        resolve('error')
      }
    })

  try {
    // Catch-all detection: probe a nonsense address — if accepted, server accepts everything
    const [fakeCode, realCode] = await Promise.all([
      probe(`xq9z7blklistfake@${domain}`),
      probe(email),
    ])
    if (fakeCode === '250' || fakeCode === '251') return 'catchall'
    if (realCode === '250' || realCode === '251') return 'valid'
    if (/^5[0-9]{2}$/.test(realCode)) return 'invalid'
    return 'unknown'
  } catch {
    return 'unknown'
  }
}

// ── Tool: firecrawl_scrape ────────────────────────────────────────────────────
// JS-rendered scraping via Firecrawl. Falls back to fetch_page if no API key.

// Pages that always block bots — short-circuit so the agent doesn't waste iterations
const SCRAPE_BLOCKLIST = /(^|\.)(linkedin|facebook|instagram|twitter|x|tiktok)\.com/i

export async function toolFirecrawlScrape(url: string): Promise<string> {
  try {
    const host = new URL(url).hostname
    if (SCRAPE_BLOCKLIST.test(host)) {
      return `Cannot scrape ${host} (blocks all bots). For LinkedIn, use web_search with "site:linkedin.com/in {name} {company}" and read the URLs/snippets from search results.`
    }
  } catch { return `Invalid URL: ${url}` }

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
        formats: ['markdown', 'html'],
        onlyMainContent: false,
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
    const html = (data.data?.html ?? '') as string
    if (!md && !html) return toolFetchPage(url)

    // Extract from both markdown AND raw HTML to catch obfuscated mailto: links
    const emails = [...new Set([...extractEmails(md), ...extractEmails(html)])]
    const linkedins = [...new Set([...extractLinkedIns(md), ...extractLinkedIns(html)])]
    return formatPageResult(url, emails, linkedins, md || htmlToText(html))
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
    // Only consider personal-looking locals (not generic role names)
    .filter(l => /^[a-z]/.test(l) && l.length >= 3 && !GENERIC_LOCALS.has(l))

  for (const l of locals) {
    if (/^[a-z]{2,}[._-][a-z]{2,}$/.test(l)) return 'firstname.lastname'
    if (/^[a-z]\.[a-z]{2,}$/.test(l))         return 'f.lastname'
    if (/^[a-z][a-z]{1,5}[a-z]{2,8}$/.test(l) && l.length >= 7) return 'firstnamelastname'
    if (/^[a-z]{2,12}$/.test(l))               return 'firstname'
  }
  return 'firstname.lastname' // Most common B2B pattern
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
  const parts: string[] = []

  // 1. Try security.txt — RFC 9116 requires it; often has a real contact email
  try {
    const secRes = await fetch(`https://${domain}/.well-known/security.txt`, {
      headers: { 'User-Agent': BOT_UA },
      signal: AbortSignal.timeout(5000),
      redirect: 'follow',
    })
    if (secRes.ok) {
      const txt = await secRes.text()
      const secEmails = extractEmails(txt).filter(e => e.endsWith(`@${domain}`))
      if (secEmails.length) parts.push(`security.txt emails: ${secEmails.join(', ')}`)
    }
  } catch { /* not found — fine */ }

  // 2. Brave search with multiple dork queries
  const queries = [
    `"@${domain}"`,
    `site:${domain} email OR contact`,
    `intext:"@${domain}" press OR media OR team`,
  ]

  const allFound: string[] = []
  for (const q of queries) {
    try {
      const results = await braveSearch(q, 6)
      const text = results.map(r => `${r.title} ${r.description} ${r.url}`).join(' ')
      const emails = extractEmails(text).filter(
        e => e.toLowerCase().endsWith(`@${domain.toLowerCase()}`)
      )
      allFound.push(...emails)
    } catch { /* continue */ }
    if (allFound.length >= 5) break
  }

  const unique = [...new Set(allFound)].slice(0, 12)
  const personal = unique.filter(e => !isGenericEmail(e))
  const generic  = unique.filter(e => isGenericEmail(e))

  if (!unique.length && !parts.length) {
    // 3. Last resort: fetch the /contact page directly
    const contactResult = await toolFetchPage(`https://${domain}/contact`)
    const contactEmails = extractEmails(contactResult).filter(
      e => e.endsWith(`@${domain}`)
    )
    if (contactEmails.length) unique.push(...contactEmails.slice(0, 5))
  }

  if (!unique.length && !parts.length) {
    return `No public emails found at ${domain}. Best guess pattern: firstname.lastname@${domain}`
  }

  const allEmails = [...new Set([...unique])]
  const pattern = detectEmailPattern(allEmails, domain)
  const patternExample = buildEmailFromPattern(pattern, 'Jane Smith', domain)

  if (personal.length) parts.push(`Personal emails at ${domain}: ${personal.join(', ')}`)
  if (generic.length)  parts.push(`Role emails at ${domain}: ${generic.join(', ')}`)
  parts.push(`Detected naming pattern: ${pattern}`)
  parts.push(`Pattern example: ${patternExample}`)
  parts.push(`Use the ${pattern} pattern when constructing the contact's email address.`)

  return parts.join('\n')
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

// ── Tool definitions (for function calling) ───────────────────────────────────

export const AGENT_TOOL_DEFS: ToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web. Best for: finding LinkedIn profiles via site:linkedin.com/in "Name" "Company", finding exposed emails via intext:"@domain.com" "Name", and general company research.',
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
      description: 'Fetch a static webpage via HTTP and auto-extract emails (including mailto: links and obfuscated ones) and LinkedIn /in/ profile URLs. Good for simple pages and plain-text files like security.txt.',
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
      description: 'Scrape a JS-rendered webpage like a real browser. USE THIS for company team, about, leadership, and press pages — modern sites need JS rendering to reveal emails and contact info. Auto-extracts PERSONAL emails and LinkedIn /in/ URLs.',
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
      description: 'Verify a domain can receive email via MX DNS lookup. Run once per enrichment to confirm the domain is valid before constructing guessed emails.',
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
      description: 'Discover the email naming convention at a domain (firstname@, firstname.lastname@, f.lastname@) by searching the web, checking security.txt, and scraping public pages. Also returns any known personal emails found. ALWAYS run this before guessing a contact email — it checks security.txt automatically.',
      parameters: {
        type: 'object',
        properties: { domain: { type: 'string', description: 'Domain name e.g. ritual.com' } },
        required: ['domain'],
      },
    },
  },
]
