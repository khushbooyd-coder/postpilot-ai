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
  const firstLine = content.split('\n')[0].slice(0, 80)
  const secondLine = content.split('\n').filter(l => l.trim()).slice(1, 2).join('').slice(0, 80)

  function esc(str: string) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  const tagStr = tags.map(t => `#${t}`).join('  ')

  const svg = `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#0D1117"/>
  <defs>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#161B22" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <radialGradient id="glow1" cx="80%" cy="20%" r="40%">
    <stop offset="0%" stop-color="#2563EB" stop-opacity="0.15"/>
    <stop offset="100%" stop-color="#0D1117" stop-opacity="0"/>
  </radialGradient>
  <rect width="1200" height="630" fill="url(#glow1)"/>
  <radialGradient id="glow2" cx="20%" cy="80%" r="35%">
    <stop offset="0%" stop-color="#7C3AED" stop-opacity="0.1"/>
    <stop offset="100%" stop-color="#0D1117" stop-opacity="0"/>
  </radialGradient>
  <rect width="1200" height="630" fill="url(#glow2)"/>
  <rect x="60" y="60" width="1080" height="510" rx="12" fill="#161B22" stroke="#30363D" stroke-width="1"/>
  <rect x="60" y="60" width="1080" height="44" rx="12" fill="#21262D"/>
  <rect x="60" y="92" width="1080" height="12" fill="#21262D"/>
  <circle cx="96" cy="82" r="7" fill="#FF5F57"/>
  <circle cx="120" cy="82" r="7" fill="#FEBC2E"/>
  <circle cx="144" cy="82" r="7" fill="#28C840"/>
  <text x="600" y="88" font-family="Monaco, Consolas, monospace" font-size="13" fill="#8B949E" text-anchor="middle">postpilot-ai — bash</text>
  <text x="90" y="155" font-family="Monaco, Consolas, monospace" font-size="14" fill="#2563EB">khushboo@codepilot</text>
  <text x="310" y="155" font-family="Monaco, Consolas, monospace" font-size="14" fill="#8B949E">:</text>
  <text x="320" y="155" font-family="Monaco, Consolas, monospace" font-size="14" fill="#7C3AED">~/postpilot-ai</text>
  <text x="470" y="155" font-family="Monaco, Consolas, monospace" font-size="14" fill="#8B949E">$ </text>
  <text x="492" y="155" font-family="Monaco, Consolas, monospace" font-size="14" fill="#E6EDF3">generate-post --publish</text>
  <line x1="90" y1="175" x2="1110" y2="175" stroke="#21262D" stroke-width="1"/>
  <text x="90" y="240" font-family="Georgia, 'Times New Roman', serif" font-size="36" fill="#E6EDF3" font-weight="bold">"${esc(firstLine)}"</text>
  ${secondLine ? `<text x="90" y="295" font-family="Georgia, 'Times New Roman', serif" font-size="28" fill="#8B949E">${esc(secondLine)}</text>` : ''}
  <text x="90" y="380" font-family="Monaco, Consolas, monospace" font-size="13" fill="#2563EB">const</text>
  <text x="140" y="380" font-family="Monaco, Consolas, monospace" font-size="13" fill="#E6EDF3"> post = await ai.generate({</text>
  <text x="90" y="405" font-family="Monaco, Consolas, monospace" font-size="13" fill="#8B949E">  topic:</text>
  <text x="175" y="405" font-family="Monaco, Consolas, monospace" font-size="13" fill="#A5D6FF"> "${esc(tags[0] || 'tech')}"</text>
  <text x="90" y="430" font-family="Monaco, Consolas, monospace" font-size="13" fill="#8B949E">  tone:</text>
  <text x="167" y="430" font-family="Monaco, Consolas, monospace" font-size="13" fill="#A5D6FF"> "human"</text>
  <text x="90" y="455" font-family="Monaco, Consolas, monospace" font-size="13" fill="#E6EDF3">})</text>
  <text x="90" y="490" font-family="Monaco, Consolas, monospace" font-size="13" fill="#28C840">✓ Post generated successfully</text>
  <line x1="90" y1="510" x2="1110" y2="510" stroke="#21262D" stroke-width="1"/>
  <text x="90" y="545" font-family="Monaco, Consolas, monospace" font-size="13" fill="#2563EB">${esc(tagStr)}</text>
  <text x="1110" y="545" font-family="Monaco, Consolas, monospace" font-size="13" fill="#8B949E" text-anchor="end">PostPilot AI · codepilot-labs.vercel.app</text>
</svg>`

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}
