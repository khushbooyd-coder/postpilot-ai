import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const RSS_FEEDS: Record<string, string[]> = {
  'Tech': ['https://hnrss.org/frontpage', 'https://dev.to/feed'],
  'AI': ['https://hnrss.org/frontpage?q=AI+OR+LLM+OR+GPT', 'https://dev.to/feed/tag/ai'],
  'WordPress': ['https://wptavern.com/feed', 'https://dev.to/feed/tag/wordpress'],
  'Web Dev': ['https://dev.to/feed/tag/webdev', 'https://hnrss.org/frontpage?q=javascript+OR+nextjs+OR+react'],
  'Startups': ['https://hnrss.org/frontpage?q=startup+OR+saas+OR+founder', 'https://dev.to/feed/tag/startup'],
  'SaaS': ['https://hnrss.org/frontpage?q=saas+OR+indie+hacker', 'https://dev.to/feed/tag/saas'],
  'Career': ['https://dev.to/feed/tag/career', 'https://hnrss.org/frontpage?q=career+OR+developer'],
  'Productivity': ['https://dev.to/feed/tag/productivity', 'https://hnrss.org/frontpage?q=productivity+OR+tools'],
  'No-Code': ['https://dev.to/feed/tag/nocode'],
  'Leadership': ['https://dev.to/feed/tag/leadership'],
  'Marketing': ['https://dev.to/feed/tag/marketing'],
}

const TOPIC_TAGS: Record<string, string[]> = {
  'Tech': ['tech', 'technology', 'developer'],
  'AI': ['ai', 'machinelearning', 'artificialintelligence'],
  'Startups': ['startups', 'entrepreneurship', 'founder'],
  'Career': ['career', 'careergrowth', 'programming'],
  'No-Code': ['nocode', 'buildinpublic', 'maker'],
  'Web Dev': ['webdev', 'programming', 'coding'],
  'Productivity': ['productivity', 'focus', 'developer'],
  'Leadership': ['leadership', 'management', 'teamwork'],
  'Marketing': ['marketing', 'growth', 'socialmedia'],
  'SaaS': ['saas', 'buildinpublic', 'indiehacker'],
  'WordPress': ['wordpress', 'webdev', 'cms'],
}

// Smart post templates — takes a headline and generates natural post
const POST_TEMPLATES = [
  (headline: string, topic: string) => `Something caught my attention today.

${headline}.

This is exactly the kind of shift I have been watching in ${topic}. The tools and approaches we relied on a year ago are being replaced faster than most people realize.

The developers who stay curious and keep experimenting will always have an edge over those who stick to what they know.

What is the most interesting thing you have read about ${topic} recently?`,

  (headline: string, topic: string) => `Here is something worth paying attention to.

${headline}.

I have been thinking about what this means for developers building products today. Every major shift in ${topic} creates both a problem and an opportunity at the same time.

The question is not whether things are changing. The question is whether you are paying attention.

How are you keeping up with what is happening in ${topic}?`,

  (headline: string, _topic: string) => `This stopped me mid-scroll today.

${headline}.

It is a reminder that the industry moves fast and opinions that felt settled six months ago are already being challenged. I have changed my mind on several things just this year.

Being wrong quickly and learning from it is underrated as a developer skill.

What is something you believed strongly about your craft that you have since changed your mind on?`,

  (headline: string, topic: string) => `Worth sharing: ${headline}.

I have been following this space closely and what strikes me is how quickly the conversation has shifted. ${topic} looked completely different even 12 months ago.

The developers building things at the edge of these changes tend to be the ones who end up ahead. Not because they predicted the future but because they stayed close enough to notice it happening.

Are you building anything that takes advantage of what is changing right now?`,

  (headline: string, topic: string) => `A headline that made me think today.

${headline}.

The ${topic} space is moving fast. What I find interesting is not the news itself but the direction it points. Patterns only become obvious in hindsight, but right now there are a few signals worth paying attention to.

I am building with this in mind. Staying close to what is actually changing rather than what people say is changing.

What signals are you watching in your area of work?`,
]

async function fetchRSSHeadlines(topic: string): Promise<string[]> {
  const feeds = RSS_FEEDS[topic] || RSS_FEEDS['Tech']
  const headlines: string[] = []

  for (const feedUrl of feeds) {
    try {
      const res = await fetch(feedUrl, {
        headers: { 'User-Agent': 'PostPilot AI RSS Reader' },
        signal: AbortSignal.timeout(5000),
      })
      const text = await res.text()
      const matches = text.matchAll(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/g)
      let count = 0
      for (const match of matches) {
        const title = (match[1] || match[2] || '').trim()
        if (
          title &&
          title.length > 15 &&
          !title.toLowerCase().includes('rss') &&
          !title.toLowerCase().includes('feed') &&
          !title.toLowerCase().includes('comments on') &&
          count < 4
        ) {
          headlines.push(title)
          count++
        }
      }
    } catch (err) {
      console.error(`RSS fetch failed for ${feedUrl}:`, err)
    }
  }

  return headlines.slice(0, 5)
}

function generatePostFromTemplate(headline: string, topic: string): string {
  const template = POST_TEMPLATES[Math.floor(Math.random() * POST_TEMPLATES.length)]
  return template(headline, topic)
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('topics, tone, is_admin')
      .eq('id', user.id)
      .single()

    const topics = profile?.topics || ['Tech', 'AI']
    const topic = topics[Math.floor(Math.random() * topics.length)]
    const tags = TOPIC_TAGS[topic] || ['tech', 'developer', 'buildinpublic']

    let content: string

    if (profile?.is_admin || !process.env.ANTHROPIC_API_KEY) {
      // Free path — RSS + smart templates
      const headlines = await fetchRSSHeadlines(topic)

      if (headlines.length === 0) {
        // Fallback if RSS fails
        const fallbackHeadlines: Record<string, string> = {
          'AI': 'AI tools are becoming part of everyday developer workflows',
          'Tech': 'The way we build software is changing faster than ever',
          'WordPress': 'WordPress continues to power a third of the web',
          'Web Dev': 'Modern web development has never had more options',
          'SaaS': 'Solo developers are shipping products faster than small teams used to',
          'Career': 'The skills that matter most in tech are shifting',
          'Startups': 'More developers are going indie than ever before',
          'Productivity': 'The tools that help developers do more with less are evolving fast',
          'No-Code': 'No-code and low-code are changing who can build products',
          'Leadership': 'Technical leadership looks different than it did five years ago',
          'Marketing': 'Developers who understand distribution have a real advantage',
        }
        const fallback = fallbackHeadlines[topic] || 'The tech industry is evolving faster than ever'
        content = generatePostFromTemplate(fallback, topic)
      } else {
        // Pick a random headline from the fetched ones
        const headline = headlines[Math.floor(Math.random() * headlines.length)]
        content = generatePostFromTemplate(headline, topic)
      }
    } else {
      // Paid path — Claude API with RSS context
      const headlines = await fetchRSSHeadlines(topic)
      const headlinesText = headlines.length > 0
        ? `Recent headlines:\n${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}`
        : `Write about recent trends in ${topic}.`

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: `You are a developer writing a LinkedIn post. Use the news below as inspiration — share a genuine personal opinion or insight, do not summarize the news directly.

${headlinesText}

Write a LinkedIn post about "${topic}" inspired by these trends.

Rules:
- Tone: ${profile?.tone || 'Professional'} but conversational and human
- Length: 150-200 words
- First sentence must be a bold punchy hook — max 10 words
- NO emojis, NO hashtags, NO bullet points with dashes or arrows
- NO corporate buzzwords
- Short paragraphs, max 2 sentences each
- End with one genuine question
- Sound like a real developer, not a marketing team

Return ONLY the post content, nothing else.`
          }]
        })
      })

      const aiData = await response.json()
      content = aiData.content?.[0]?.text

      if (!content) {
        return NextResponse.json({ error: 'Failed to generate post' }, { status: 500 })
      }
    }

    const hashtagLine = tags.map(t => `#${t}`).join(' ')
    const contentWithTags = `${content}\n\n${hashtagLine}`
    const imageUrl = generateTerminalCard(content, tags)

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: post, error } = await supabaseAdmin
      .from('posts')
      .insert([{
        user_id: user.id,
        content: contentWithTags,
        status: 'pending',
        image_url: imageUrl
      }])
      .select()
      .single()

    if (error) {
      console.error('DB error:', error)
      return NextResponse.json({ error: 'Failed to save post' }, { status: 500 })
    }

    return NextResponse.json({ success: true, post })
  } catch (err) {
    console.error('Generate post error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

function generateTerminalCard(content: string, tags: string[]): string {
  function esc(str: string) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  // Split content into lines for wrapping
  const lines = content.split('\n').filter(l => l.trim())
  const firstLine = lines[0] || ''

  // Wrap first line into max ~38 chars per line for large display
  function wrapText(text: string, maxLen: number): string[] {
    const words = text.split(' ')
    const wrapped: string[] = []
    let current = ''
    for (const word of words) {
      if ((current + ' ' + word).trim().length > maxLen) {
        if (current) wrapped.push(current.trim())
        current = word
      } else {
        current = current ? current + ' ' + word : word
      }
    }
    if (current) wrapped.push(current.trim())
    return wrapped
  }

  const titleLines = wrapText(firstLine, 36)
  const bodyText = lines.slice(1, 3).join(' ').slice(0, 120)
  const bodyLines = wrapText(bodyText, 42)

  // Topic-specific accent colors
  const topicColors: Record<string, string> = {
    'ai': '#6366F1', 'javascript': '#F59E0B', 'react': '#38BDF8',
    'wordpress': '#3B82F6', 'php': '#8B5CF6', 'python': '#10B981',
    'saas': '#EC4899', 'startups': '#F97316', 'career': '#14B8A6',
    'webdev': '#06B6D4', 'developer': '#6366F1', 'tech': '#3B82F6',
  }
  const tag0 = (tags[0] || 'tech').toLowerCase()
  const accentColor = topicColors[tag0] || '#2563EB'

  // Badge rendering
  function badge(tag: string, x: number): string {
    const label = `#${tag}`
    const width = Math.max(label.length * 14 + 32, 80)
    return `
    <rect x="${x}" y="1080" width="${width}" height="48" rx="24" fill="${accentColor}" opacity="0.15"/>
    <rect x="${x}" y="1080" width="${width}" height="48" rx="24" fill="none" stroke="${accentColor}" stroke-width="1.5" opacity="0.4"/>
    <text x="${x + width/2}" y="1110" font-family="Inter, system-ui, sans-serif" font-size="20" font-weight="600" fill="${accentColor}" text-anchor="middle">${esc(label)}</text>`
  }

  let badgeX = 100
  const badges = tags.slice(0, 4).map(tag => {
    const label = `#${tag}`
    const width = Math.max(label.length * 14 + 32, 80)
    const b = badge(tag, badgeX)
    badgeX += width + 16
    return b
  }).join('')

  const svg = `<svg width="1200" height="1200" viewBox="0 0 1200 1200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F172A"/>
      <stop offset="60%" stop-color="#0F172A"/>
      <stop offset="100%" stop-color="#1E1B4B"/>
    </linearGradient>
    <radialGradient id="glow1" cx="85%" cy="10%" r="45%">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#0F172A" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="15%" cy="90%" r="40%">
      <stop offset="0%" stop-color="#7C3AED" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#0F172A" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="1200" fill="url(#bg)"/>
  <rect width="1200" height="1200" fill="url(#glow1)"/>
  <rect width="1200" height="1200" fill="url(#glow2)"/>

  <!-- Subtle dot pattern -->
  <pattern id="dots" width="40" height="40" patternUnits="userSpaceOnUse">
    <circle cx="20" cy="20" r="1" fill="#FFFFFF" opacity="0.03"/>
  </pattern>
  <rect width="1200" height="1200" fill="url(#dots)"/>

  <!-- Left accent bar -->
  <rect x="0" y="0" width="6" height="1200" fill="${accentColor}" opacity="0.8"/>

  <!-- Logo area -->
  <text x="100" y="110" font-family="Inter, system-ui, sans-serif" font-size="28" font-weight="700" fill="${accentColor}" letter-spacing="3">POSTPILOT AI</text>
  <text x="100" y="148" font-family="Inter, system-ui, sans-serif" font-size="18" fill="#475569">Your LinkedIn Growth Assistant</text>

  <!-- Divider -->
  <line x1="100" y1="175" x2="1100" y2="175" stroke="#1E293B" stroke-width="1"/>

  <!-- Big quotation mark -->
  <text x="80" y="420" font-family="Georgia, serif" font-size="300" fill="${accentColor}" opacity="0.07">"</text>

  <!-- Title lines -->
  ${titleLines.map((line, i) => `
  <text x="100" y="${300 + i * 90}" font-family="Inter, system-ui, sans-serif" font-size="72" font-weight="700" fill="#F1F5F9" letter-spacing="-1">${esc(line)}</text>`).join('')}

  <!-- Body text -->
  ${bodyLines.length > 0 ? `
  <line x1="100" y1="${300 + titleLines.length * 90 + 30}" x2="200" y2="${300 + titleLines.length * 90 + 30}" stroke="${accentColor}" stroke-width="3"/>
  ${bodyLines.map((line, i) => `
  <text x="100" y="${300 + titleLines.length * 90 + 80 + i * 46}" font-family="Inter, system-ui, sans-serif" font-size="32" fill="#94A3B8">${esc(line)}</text>`).join('')}` : ''}

  <!-- Divider before footer -->
  <line x1="100" y1="1055" x2="1100" y2="1055" stroke="#1E293B" stroke-width="1"/>

  <!-- Topic badges -->
  ${badges}

  <!-- Footer -->
  <text x="100" y="1160" font-family="Inter, system-ui, sans-serif" font-size="20" fill="#334155">Generated with PostPilot AI</text>
  <text x="1100" y="1160" font-family="Inter, system-ui, sans-serif" font-size="20" fill="${accentColor}" text-anchor="end">postpilot-ai-self.vercel.app</text>
</svg>`

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}