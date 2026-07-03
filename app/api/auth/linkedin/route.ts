import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.LINKEDIN_CLIENT_ID!
  const base = process.env.NEXTAUTH_URL || 'https://postpilot-ai-self.vercel.app'
  const redirectUri = `${base}/api/auth/linkedin/callback`
  const scope = 'openid profile email w_member_social'
  const state = Math.random().toString(36).substring(7)

  const url = new URL('https://www.linkedin.com/oauth/v2/authorization')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', scope)
  url.searchParams.set('state', state)

  return NextResponse.redirect(url.toString())
}