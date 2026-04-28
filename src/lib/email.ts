import nodemailer from 'nodemailer'

export function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

export interface SendEmailOptions {
  to: string
  subject: string
  body: string
  trackingId: string
  fromName?: string
  fromEmail?: string
}

export async function sendEmail(opts: SendEmailOptions) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const from = opts.fromName && opts.fromEmail
    ? `"${opts.fromName}" <${opts.fromEmail}>`
    : `"${process.env.FROM_NAME || 'Alex'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`

  const trackingPixel = `<img src="${appUrl}/api/track/${opts.trackingId}" width="1" height="1" style="display:none" />`
  const htmlBody = opts.body
    .split('\n')
    .map((line) => `<p style="margin:0 0 8px">${line || '&nbsp;'}</p>`)
    .join('') + trackingPixel

  const transport = createTransport()
  await transport.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.body,
    html: `<div style="font-family:sans-serif;font-size:15px;color:#111;max-width:600px">${htmlBody}</div>`,
  })
}
