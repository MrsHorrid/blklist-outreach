import nodemailer from 'nodemailer'
import { google } from 'googleapis'

interface Template {
  headerImageUrl?: string | null
  accentColor?: string | null
  fontFamily?: string | null
  signatureName?: string | null
  signatureTitle?: string | null
  signatureCompany?: string | null
  signatureImageUrl?: string | null
  signaturePhone?: string | null
  signatureWebsite?: string | null
  signatureLinkedIn?: string | null
  footerText?: string | null
  footerImageUrl?: string | null
}

export interface SendEmailOptions {
  to: string
  subject: string
  body: string
  trackingId: string
  fromName?: string
  fromEmail?: string
  gmailEmail?: string
  gmailRefreshToken?: string
  template?: Template | null
}

export async function sendEmail(opts: SendEmailOptions) {
  const html = renderHtml(opts)

  if (opts.gmailEmail && opts.gmailRefreshToken) {
    await sendViaGmailApi({
      to: opts.to,
      subject: opts.subject,
      textBody: opts.body,
      htmlBody: html,
      fromName: opts.fromName,
      gmailEmail: opts.gmailEmail,
      refreshToken: opts.gmailRefreshToken,
    })
    return
  }

  // SMTP fallback
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
    html,
  })
}

// ── HTML rendering ────────────────────────────────────────────────────────────

function escape(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))
}

function safeUrl(u: string | null | undefined): string {
  if (!u) return ''
  try {
    const url = new URL(u)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return ''
    return url.toString()
  } catch { return '' }
}

// Allow https URLs OR data: image URIs
function safeImage(u: string | null | undefined): string {
  if (!u) return ''
  if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/i.test(u)) return u
  return safeUrl(u)
}

function renderHtml(opts: SendEmailOptions): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const tpl = opts.template || {}
  const accent = tpl.accentColor || '#5046E5'
  const fontStack =
    tpl.fontFamily === 'serif' ? 'Georgia, "Times New Roman", serif' :
    tpl.fontFamily === 'modern' ? 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' :
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

  const trackingPixel = `<img src="${appUrl}/api/track/${opts.trackingId}" width="1" height="1" style="display:none" alt="" />`

  // Body paragraphs — generous line-height + bottom margin so text breathes
  const bodyHtml = opts.body
    .split('\n')
    .map(line => `<p style="margin:0 0 16px;line-height:1.65;font-family:${fontStack}">${escape(line) || '&nbsp;'}</p>`)
    .join('')

  // Header
  const headerImg = safeImage(tpl.headerImageUrl)
  const headerHtml = headerImg
    ? `<tr><td style="padding:0"><img src="${headerImg}" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto"/></td></tr>`
    : ''

  // Footer image
  const footerImg = safeImage(tpl.footerImageUrl)
  const footerImgHtml = footerImg
    ? `<tr><td style="padding:0"><img src="${footerImg}" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto"/></td></tr>`
    : ''

  // Signature
  const sigImg = safeImage(tpl.signatureImageUrl)
  const sigName = tpl.signatureName ? escape(tpl.signatureName) : ''
  const sigTitle = tpl.signatureTitle ? escape(tpl.signatureTitle) : ''
  const sigCompany = tpl.signatureCompany ? escape(tpl.signatureCompany) : ''
  const sigPhone = tpl.signaturePhone ? escape(tpl.signaturePhone) : ''
  const sigWebsite = safeUrl(tpl.signatureWebsite)
  const sigLinkedIn = safeUrl(tpl.signatureLinkedIn)

  const titleLine = [sigTitle, sigCompany].filter(Boolean).join(' · ')
  const linksLine = [
    sigPhone ? `<span style="color:#71717a">${sigPhone}</span>` : '',
    sigWebsite ? `<a href="${sigWebsite}" style="color:${accent};text-decoration:none">${escape(sigWebsite.replace(/^https?:\/\//, ''))}</a>` : '',
    sigLinkedIn ? `<a href="${sigLinkedIn}" style="color:${accent};text-decoration:none">LinkedIn</a>` : '',
  ].filter(Boolean).join(' &nbsp;·&nbsp; ')

  const hasSignature = sigName || sigCompany || sigImg
  const signatureHtml = hasSignature ? `
    <tr><td>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="40" style="width:40px"></td>
          <td style="padding-top:32px;padding-bottom:8px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e7e7ea">
              <tr>
                <td style="padding-top:22px" valign="top">
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      ${sigImg ? `
                      <td style="padding-right:16px" valign="top">
                        <img src="${sigImg}" alt="" width="52" height="52" style="display:block;border-radius:26px;object-fit:cover"/>
                      </td>` : ''}
                      <td valign="top" style="font-family:${fontStack};font-size:13px;line-height:1.55">
                        ${sigName ? `<div style="font-weight:600;color:#0a0a0c">${sigName}</div>` : ''}
                        ${titleLine ? `<div style="color:#71717a;margin-top:3px">${titleLine}</div>` : ''}
                        ${linksLine ? `<div style="margin-top:8px;font-size:12px">${linksLine}</div>` : ''}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
          <td width="40" style="width:40px"></td>
        </tr>
      </table>
    </td></tr>
  ` : ''

  // Footer
  const footerHtml = tpl.footerText
    ? `<tr><td style="background:#fafafa;border-top:1px solid #e7e7ea">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="40" style="width:40px"></td>
            <td style="padding-top:20px;padding-bottom:20px;font-size:11px;color:#a1a1aa;line-height:1.55">${escape(tpl.footerText)}</td>
            <td width="40" style="width:40px"></td>
          </tr>
        </table>
      </td></tr>`
    : ''

  const fontImport = tpl.fontFamily === 'modern' 
    ? `<style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');</style>` 
    : ''

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">${fontImport}</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:${fontStack}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5">
    <tr><td align="center" style="padding:24px 16px">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04)">
        ${headerHtml}
        <tr><td>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="40" style="width:40px"></td>
              <td style="padding-top:40px;padding-bottom:${hasSignature ? '8' : '32'}px;font-family:${fontStack};font-size:15px;color:#1f1f23">${bodyHtml}</td>
              <td width="40" style="width:40px"></td>
            </tr>
          </table>
        </td></tr>
        ${signatureHtml}
        ${footerImgHtml ? `<tr><td style="height:24px;line-height:24px">&nbsp;</td></tr>${footerImgHtml}` : ''}
        ${footerHtml}
      </table>
      <div style="font-size:0;line-height:0">${trackingPixel}</div>
    </td></tr>
  </table>
</body></html>`
}

// ── Gmail API sender ──────────────────────────────────────────────────────────

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
