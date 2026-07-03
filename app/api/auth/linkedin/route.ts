import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.LINKEDIN_CLIENT_ID!
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const redirectUri = `${base}/api/auth/linkedin/callback`
  const scope = 'openid profile email w_member_social'

  const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`

  return NextResponse.redirect(url)
}
