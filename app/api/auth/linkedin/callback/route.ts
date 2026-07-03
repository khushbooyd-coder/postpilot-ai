import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const base = process.env.NEXTAUTH_URL || 'https://postpilot-ai-self.vercel.app'

  if (!code) return NextResponse.redirect(`${base}/?error=no_code`)

  try {
    const redirectUri = `${base}/api/auth/linkedin/callback`

    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        redirect_uri: redirectUri,
      }),
    })

    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token
    if (!accessToken) return NextResponse.redirect(`${base}/?error=no_token`)

    const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const userData = await userRes.json()
    if (!userData.email) return NextResponse.redirect(`${base}/?error=no_email`)

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === userData.email)

    let userId: string

    if (existingUser) {
      userId = existingUser.id
    } else {
      const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        email_confirm: true,
        user_metadata: { name: userData.name || userData.email.split('@')[0] }
      })
      if (error || !newUser.user) return NextResponse.redirect(`${base}/?error=user_creation_failed`)
      userId = newUser.user.id
    }

    await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email: userData.email,
        linkedin_access_token: accessToken,
        linkedin_token_expiry: tokenData.expires_in
          ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
          : null,
      })

    // Generate magic link pointing to /auth/callback
    const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.email,
      options: {
        redirectTo: `${base}/auth/callback`,
      }
    })

    if (linkData?.properties?.action_link) {
      return NextResponse.redirect(linkData.properties.action_link)
    }

    return NextResponse.redirect(`${base}/login?email=${encodeURIComponent(userData.email)}&linkedin=1`)

  } catch (err) {
    console.error('LinkedIn callback error:', err)
    return NextResponse.redirect(`${base}/?error=callback_failed`)
  }
}