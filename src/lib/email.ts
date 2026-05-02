import nodemailer from 'nodemailer'
import { google } from 'googleapis'

export interface SendEmailOptions {
  to: string
  subject: string
  body: string
  trackingId: string
  fromName?: string
  fromEmail?: string
  gmailEmail?: string
  gmailRefreshToken?: string
}

export async function sendEmail(opts: SendEmailOptions) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const trackingPixel = `<img src="${appUrl}/api/track/${opts.trackingId}" width="1" height="1" style="display:none" />`
  const htmlBody =
    opts.body
      .split('\n')
      .map(line => `<p style="margin:0 0 8px">${line || '&nbsp;'}</p>`)
      .join('') + trackingPixel

  const fullHtml = `<div style="font-family:sans-serif;font-size:15px;color:#111;max-width:600px">${htmlBody}</div>`

  if (opts.gmailEmail && opts.gmailRefreshToken) {
    await sendViaGmailApi({
      to: opts.to,
      subject: opts.subject,
      textBody: opts.body,
      htmlBody: fullHtml,
      fromName: opts.fromName,
      gmailEmail: opts.gmailEmail,
      refreshToken: opts.gmailRefreshToken,
    })
    return
  }

  // Fallback: SMTP
  const from = opts.fromName && opts.fromEmail
    ? `"${opts.fromName}" <${opts.fromEmail}>`
    : `"${process.env.FROM_NAME || 'BLKLIST'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })

  await transport.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.body,
    html: fullHtml,
  })
}

// ── Gmail API sender (saves to Sent folder automatically) ─────────────────────

// Encode non-ASCII header values per RFC 2047 so em-dashes, accents, etc. survive
function mimeEncodeHeader(value: string): string {
  if (!/[^\x00-\x7F]/.test(value)) return value
  return `=?UTF-8?B?${Buffer.from(value, 'utf-8').toString('base64')}?=`
}

async function sendViaGmailApi(opts: {
  to: string
  subject: string
  textBody: string
  htmlBody: string
  fromName?: string
  gmailEmail: string
  refreshToken: string
}) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
  oauth2Client.setCredentials({ refresh_token: opts.refreshToken })

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

  const from = opts.fromName
    ? `"${opts.fromName}" <${opts.gmailEmail}>`
    : opts.gmailEmail

  const boundary = `blklist_${Date.now()}`

  // RFC 2822 multipart/alternative message
  const raw = [
    `From: ${from}`,
    `To: ${opts.to}`,
    `Subject: ${mimeEncodeHeader(opts.subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    opts.textBody,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    '',
    opts.htmlBody,
    '',
    `--${boundary}--`,
  ].join('\r\n')

  const encoded = Buffer.from(raw).toString('base64url')

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encoded },
  })
}
