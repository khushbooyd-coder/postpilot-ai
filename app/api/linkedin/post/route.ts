import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getServerSession } from 'next-auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { postId } = await req.json()
    if (!postId) {
      return NextResponse.json({ error: 'Post ID required' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get user profile with LinkedIn token
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('linkedin_access_token, linkedin_token_expiry')
      .eq('email', session.user.email)
      .single()

    if (!profile?.linkedin_access_token) {
      return NextResponse.json({ error: 'LinkedIn not connected' }, { status: 400 })
    }

    // Get the post content
    const { data: post } = await supabaseAdmin
      .from('posts')
      .select('content')
      .eq('id', postId)
      .single()

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Get LinkedIn user ID
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${profile.linkedin_access_token}` },
    })
    const profileData = await profileRes.json()
    const linkedinUserId = profileData.sub

    if (!linkedinUserId) {
      return NextResponse.json({ error: 'Could not get LinkedIn user ID' }, { status: 400 })
    }

    // Post to LinkedIn
    const postRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${profile.linkedin_access_token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author: `urn:li:person:${linkedinUserId}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: post.content },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      }),
    })

    if (!postRes.ok) {
      const err = await postRes.json()
      console.error('LinkedIn post error:', err)
      return NextResponse.json({ error: 'Failed to post to LinkedIn' }, { status: 500 })
    }

    const postData = await postRes.json()
    const linkedinPostId = postData.id

    // Update post status in DB
    await supabaseAdmin
      .from('posts')
      .update({
        status: 'posted',
        posted_at: new Date().toISOString(),
        linkedin_post_id: linkedinPostId,
      })
      .eq('id', postId)

    return NextResponse.json({ success: true, linkedinPostId })
  } catch (err) {
    console.error('Post to LinkedIn error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
