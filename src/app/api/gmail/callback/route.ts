import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login', appUrl))
  }

  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/settings/profile?error=gmail_denied', appUrl))
  }

  try {
    const redirectUri = `${appUrl}/api/gmail/callback`

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      console.error('[gmail/callback] token exchange failed', await tokenRes.text())
      return NextResponse.redirect(new URL('/settings/profile?error=gmail_token_failed', appUrl))
    }

    const tokens = await tokenRes.json()
    const { access_token, refresh_token } = tokens

    // Fetch the Gmail address from Google's userinfo endpoint
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    const userInfo = await userInfoRes.json()
    const gmailEmail: string = userInfo.email || ''

    await db.user.update({
      where: { id: session.user.id },
      data: {
        gmailConnected: true,
        gmailEmail,
        gmailRefreshToken: refresh_token ?? null,
      },
    })

    return NextResponse.redirect(new URL('/settings/profile?connected=gmail', appUrl))
  } catch (err) {
    console.error('[gmail/callback]', err)
    return NextResponse.redirect(new URL('/settings/profile?error=gmail_failed', appUrl))
  }
}
