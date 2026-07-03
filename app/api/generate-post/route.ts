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

// Smart post templates — punchy hooks that stop people mid-scroll
const POST_TEMPLATES = [
  (headline: string, topic: string) => `I changed my mind about ${topic} this week.

${headline}.

Six months ago I would have disagreed with this. Now I think the people who saw it coming were just paying closer attention than the rest of us.

The hardest part of working in a fast-moving field is knowing when to update your opinions and when to hold them.

What is something in ${topic} that changed how you think this year?`,

  (headline: string, topic: string) => `Nobody talks about this part of ${topic}.

${headline}.

Everyone focuses on the flashy stuff. The tools, the frameworks, the announcements. What actually moves the needle is much quieter and far less exciting to write about.

I have spent the last few months paying more attention to the boring parts. Turns out that is where most of the real progress happens.

What is the most underrated thing you have learned about ${topic}?`,

  (headline: string, _topic: string) => `This stopped me mid-scroll today.

${headline}.

It is a reminder that the industry moves fast and opinions that felt settled six months ago are already being challenged.

Being wrong quickly and learning from it is underrated as a developer skill. The developers I respect most are the ones willing to say they got something wrong.

What is something you believed strongly that you have since changed your mind on?`,

  (headline: string, topic: string) => `Most developers get this wrong about ${topic}.

${headline}.

I got it wrong too for a long time. The mental model I was using made sense on paper but broke down the moment I tried to apply it to something real.

The gap between understanding something in theory and actually building with it is still the most humbling part of this work.

What took you the longest to actually understand in ${topic}?`,

  (headline: string, topic: string) => `The biggest mistake I see in ${topic} right now.

${headline}.

Everyone is optimizing for the wrong thing. The conversation is dominated by what is new and almost nobody is talking about what is actually working.

I have started filtering out most of the noise and paying attention to the people who are quietly shipping things that matter.

What are you ignoring right now that you probably should not be?`,

  (headline: string, topic: string) => `I tested this so you do not have to.

${headline}.

Here is what I found: most of the hype is exactly that. But underneath it there is something genuinely useful if you know where to look.

${topic} rewards people who go past the surface level. The best insights are always a few layers deeper than the headline.

What is the most surprising thing you have discovered recently while building something?`,
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
            content: `You are an experienced developer with strong opinions who writes LinkedIn posts that stop people mid-scroll.

${headlinesText}

Write a LinkedIn post about "${topic}" inspired by this. Do NOT summarize the news. Share a genuine insight, a changed mind, or a lesson learned.

HOOK EXAMPLES (pick a style like these for your first line):
- I changed my mind about AI this week.
- The biggest mistake developers make with ${topic}.
- Nobody talks about this part of ${topic}.
- I tested 21 tools so you dont have to.
- Most developers get this completely wrong.

RULES:
- First line: punchy hook, max 8 words, makes people want to read more
- Tone: ${profile?.tone || 'Professional'} but human and direct
- Length: 120-160 words total
- Short paragraphs, 1-2 sentences max
- NO emojis, NO hashtags in the body
- NO corporate words: leverage, game-changer, dive deep, unlock, journey
- End with ONE short genuine question to the reader
- Sound like a smart person talking to a friend

Return ONLY the post text. Nothing else.`
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

  const lines = content.split('\n').filter(l => l.trim())
  const firstLine = lines[0] || ''

  // Wrap text to fit within maxLen chars per line
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

  // Title: wrap at 30 chars, max 3 lines
  const titleLines = wrapText(firstLine, 30).slice(0, 3)

  // Body: next 2 paragraphs combined, wrapped at 48 chars, max 4 lines
  //const bodyText = lines.slice(1, 3).join(' ').slice(0, 200)
  const cleanLines = lines.slice(1).filter(l =>
  l.trim().length > 40 && !l.includes('DEV Community') && !l.includes('HackerNews')
)
const bodyText = cleanLines.slice(0, 2).join(' ').slice(0, 180)
  const bodyLines = wrapText(bodyText, 48).slice(0, 4)

  // Topic accent colors
  const topicColors: Record<string, string> = {
    'ai': '#6366F1', 'machinelearning': '#6366F1', 'artificialintelligence': '#6366F1',
    'javascript': '#F59E0B', 'typescript': '#3B82F6',
    'react': '#38BDF8', 'nextjs': '#FFFFFF',
    'wordpress': '#3B82F6', 'php': '#8B5CF6',
    'python': '#10B981', 'saas': '#EC4899',
    'buildinpublic': '#F97316', 'indiehacker': '#F97316',
    'startups': '#F97316', 'entrepreneurship': '#F97316',
    'career': '#14B8A6', 'careergrowth': '#14B8A6',
    'webdev': '#06B6D4', 'coding': '#06B6D4', 'programming': '#6366F1',
    'developer': '#6366F1', 'tech': '#3B82F6', 'technology': '#3B82F6',
  }
  const tag0 = (tags[0] || 'tech').toLowerCase()
  const accentColor = topicColors[tag0] || '#2563EB'

  // Calculate title block height
  const titleY = 260
  const titleLineHeight = 95
  const titleBlockEnd = titleY + titleLines.length * titleLineHeight

  // Body starts after title + gap
  const bodyStartY = titleBlockEnd + 60
  const bodyLineHeight = 50

  // Divider before footer
  const dividerY = Math.max(bodyStartY + bodyLines.length * bodyLineHeight + 40, 750)

  // Badge row
  let badgeX = 100
  const badges = tags.slice(0, 4).map(tag => {
    const label = `#${tag}`
    const width = Math.max(label.length * 13 + 36, 90)
    const b = `
    <rect x="${badgeX}" y="${dividerY + 30}" width="${width}" height="46" rx="23" fill="${accentColor}" opacity="0.12"/>
    <rect x="${badgeX}" y="${dividerY + 30}" width="${width}" height="46" rx="23" fill="none" stroke="${accentColor}" stroke-width="1.5" opacity="0.35"/>
    <text x="${badgeX + width/2}" y="${dividerY + 59}" font-family="Inter, system-ui, sans-serif" font-size="19" font-weight="600" fill="${accentColor}" text-anchor="middle">${esc(label)}</text>`
    badgeX += width + 14
    return b
  }).join('')

  const totalHeight = dividerY + 160
  //const canvasH = Math.max(totalHeight, 1000)
  const canvasH = Math.max(totalHeight, 800)

  const svg = `<svg width="1200" height="${canvasH}" viewBox="0 0 1200 ${canvasH}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F172A"/>
      <stop offset="70%" stop-color="#0F172A"/>
      <stop offset="100%" stop-color="#1E1B4B"/>
    </linearGradient>
    <radialGradient id="glow1" cx="90%" cy="5%" r="50%">
      <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#0F172A" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="10%" cy="95%" r="40%">
      <stop offset="0%" stop-color="#7C3AED" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#0F172A" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="${canvasH}" fill="url(#bg)"/>
  <rect width="1200" height="${canvasH}" fill="url(#glow1)"/>
  <rect width="1200" height="${canvasH}" fill="url(#glow2)"/>

  <!-- Subtle dot grid -->
  <pattern id="dots" width="48" height="48" patternUnits="userSpaceOnUse">
    <circle cx="24" cy="24" r="1" fill="#FFFFFF" opacity="0.025"/>
  </pattern>
  <rect width="1200" height="${canvasH}" fill="url(#dots)"/>

  <!-- Left accent bar -->
  <rect x="0" y="0" width="5" height="${canvasH}" fill="${accentColor}" opacity="0.9"/>

  <!-- Header: Logo -->
  <text x="100" y="95" font-family="Inter, system-ui, sans-serif" font-size="26" font-weight="700" fill="${accentColor}" letter-spacing="2">POSTPILOT AI</text>
  <text x="100" y="130" font-family="Inter, system-ui, sans-serif" font-size="17" fill="#475569">Your LinkedIn Growth Assistant</text>

  <!-- Divider line -->
  <line x1="100" y1="158" x2="1100" y2="158" stroke="#1E293B" stroke-width="1"/>

  <!-- Giant quotation mark watermark -->
  <text x="75" y="${titleY + 60}" font-family="Georgia, serif" font-size="260" fill="${accentColor}" opacity="0.06">"</text>

  <!-- Title lines — large, bold -->
  ${titleLines.map((line, i) => `
  <text x="100" y="${titleY + i * titleLineHeight}" font-family="Inter, system-ui, sans-serif" font-size="78" font-weight="800" fill="#F1F5F9" letter-spacing="-1.5">${esc(line)}</text>`).join('')}

  <!-- Accent rule below title -->
  <rect x="100" y="${titleBlockEnd + 20}" width="80" height="4" rx="2" fill="${accentColor}"/>

  <!-- Body text -->
  ${bodyLines.map((line, i) => `
  <text x="100" y="${bodyStartY + i * bodyLineHeight}" font-family="Inter, system-ui, sans-serif" font-size="32" fill="#94A3B8">${esc(line)}</text>`).join('')}

  <!-- Divider before footer -->
  <line x1="100" y1="${dividerY}" x2="1100" y2="${dividerY}" stroke="#1E293B" stroke-width="1"/>

  <!-- Topic badges -->
  ${badges}

  <!-- Footer text -->
  <text x="100" y="${dividerY + 140}" font-family="Inter, system-ui, sans-serif" font-size="19" fill="#334155">Generated with PostPilot AI</text>
  <text x="1100" y="${dividerY + 140}" font-family="Inter, system-ui, sans-serif" font-size="19" fill="${accentColor}" text-anchor="end">postpilot-ai-self.vercel.app</text>
</svg>`

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}