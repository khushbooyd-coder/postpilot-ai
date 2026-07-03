import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const RSS_FEEDS: Record<string, string[]> = {
  'JavaScript': ['https://dev.to/feed/tag/javascript', 'https://hnrss.org/frontpage?q=javascript'],
  'TypeScript': ['https://dev.to/feed/tag/typescript', 'https://hnrss.org/frontpage?q=typescript'],
  'Python': ['https://dev.to/feed/tag/python', 'https://hnrss.org/frontpage?q=python'],
  'PHP': ['https://dev.to/feed/tag/php', 'https://wptavern.com/feed'],
  'HTML & CSS': ['https://dev.to/feed/tag/css', 'https://dev.to/feed/tag/html'],
  'React': ['https://dev.to/feed/tag/react', 'https://hnrss.org/frontpage?q=react'],
  'Next.js': ['https://dev.to/feed/tag/nextjs', 'https://hnrss.org/frontpage?q=nextjs'],
  'Node.js': ['https://dev.to/feed/tag/node', 'https://hnrss.org/frontpage?q=nodejs'],
  'FastAPI': ['https://dev.to/feed/tag/fastapi', 'https://hnrss.org/frontpage?q=fastapi'],
  'WordPress': ['https://wptavern.com/feed', 'https://dev.to/feed/tag/wordpress'],
  'Shopify': ['https://dev.to/feed/tag/shopify', 'https://hnrss.org/frontpage?q=shopify'],
  'WooCommerce': ['https://wptavern.com/feed', 'https://dev.to/feed/tag/woocommerce'],
  'Git & GitHub': ['https://dev.to/feed/tag/git', 'https://hnrss.org/frontpage?q=github+OR+git'],
  'Web Dev': ['https://dev.to/feed/tag/webdev', 'https://hnrss.org/frontpage?q=webdev'],
  'AI': ['https://hnrss.org/frontpage?q=AI+OR+LLM+OR+GPT', 'https://dev.to/feed/tag/ai'],
  'No-Code': ['https://dev.to/feed/tag/nocode'],
  'Tech': ['https://hnrss.org/frontpage', 'https://dev.to/feed'],
  'SaaS': ['https://hnrss.org/frontpage?q=saas', 'https://dev.to/feed/tag/saas'],
  'Startups': ['https://hnrss.org/frontpage?q=startup+OR+founder', 'https://dev.to/feed/tag/startup'],
  'Career': ['https://dev.to/feed/tag/career'],
  'Productivity': ['https://dev.to/feed/tag/productivity'],
  'Leadership': ['https://dev.to/feed/tag/leadership'],
  'Marketing': ['https://dev.to/feed/tag/marketing'],
}

const TOPIC_TAGS: Record<string, string[]> = {
  'JavaScript': ['javascript', 'webdev', 'programming'],
  'TypeScript': ['typescript', 'javascript', 'webdev'],
  'Python': ['python', 'programming', 'developer'],
  'PHP': ['php', 'webdev', 'programming'],
  'HTML & CSS': ['html', 'css', 'webdev'],
  'React': ['react', 'javascript', 'webdev'],
  'Next.js': ['nextjs', 'react', 'webdev'],
  'Node.js': ['nodejs', 'javascript', 'backend'],
  'FastAPI': ['fastapi', 'python', 'backend'],
  'WordPress': ['wordpress', 'webdev', 'cms'],
  'Shopify': ['shopify', 'ecommerce', 'webdev'],
  'WooCommerce': ['woocommerce', 'wordpress', 'ecommerce'],
  'Git & GitHub': ['git', 'github', 'developer'],
  'Web Dev': ['webdev', 'programming', 'coding'],
  'AI': ['ai', 'machinelearning', 'developer'],
  'No-Code': ['nocode', 'buildinpublic', 'maker'],
  'Tech': ['tech', 'technology', 'developer'],
  'SaaS': ['saas', 'buildinpublic', 'indiehacker'],
  'Startups': ['startups', 'entrepreneurship', 'founder'],
  'Career': ['career', 'careergrowth', 'programming'],
  'Productivity': ['productivity', 'focus', 'developer'],
  'Leadership': ['leadership', 'management', 'teamwork'],
  'Marketing': ['marketing', 'growth', 'socialmedia'],
}

const TECH_KEYWORDS = [
  'developer', 'code', 'programming', 'software', 'javascript', 'python',
  'react', 'next', 'node', 'api', 'web', 'app', 'ai', 'tool', 'build',
  'startup', 'saas', 'wordpress', 'plugin', 'github', 'open source',
  'framework', 'library', 'typescript', 'database', 'cloud', 'deploy',
  'engineer', 'tech', 'product', 'launch', 'update', 'release', 'version',
  'performance', 'security', 'design', 'backend', 'frontend', 'fullstack'
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
        const titleLower = title.toLowerCase()
        const isRelevant = TECH_KEYWORDS.some(kw => titleLower.includes(kw))
        const isClean = title.length > 15 &&
          !titleLower.includes('rss') &&
          !titleLower.includes('feed') &&
          !titleLower.includes('comments on') &&
          count < 4
        if (isRelevant && isClean) {
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

async function generateWithGroq(prompt: string): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1000,
      temperature: 0.85,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
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
    const tone = profile?.tone || 'Professional'
    const topic = topics[Math.floor(Math.random() * topics.length)]
    const tags = TOPIC_TAGS[topic] || ['tech', 'developer', 'buildinpublic']

    // Fetch real headlines
    const headlines = await fetchRSSHeadlines(topic)

    const fallbackHeadlines: Record<string, string> = {
  'JavaScript': 'JavaScript continues to dominate web development in 2025',
  'TypeScript': 'TypeScript adoption is growing faster than any other language',
  'Python': 'Python remains the most popular language for AI and data work',
  'PHP': 'PHP 8 has changed how modern backend development works',
  'HTML & CSS': 'CSS has become more powerful than most developers realize',
  'React': 'React 19 is changing how we think about state management',
  'Next.js': 'Next.js server components are replacing traditional API routes',
  'Node.js': 'Node.js is still the backbone of modern backend development',
  'FastAPI': 'FastAPI is becoming the go-to choice for Python APIs',
  'WordPress': 'WordPress block editor is changing how developers build themes',
  'Shopify': 'Shopify developers are in higher demand than ever',
  'WooCommerce': 'WooCommerce powers more online stores than any other platform',
  'Git & GitHub': 'Git workflows are evolving with AI-assisted development',
  'Web Dev': 'Web development has never had more options or more complexity',
  'AI': 'AI coding tools are changing how developers write and review code',
  'No-Code': 'No-code tools are changing what developers actually need to build',
  'Tech': 'The tools developers use are evolving faster than ever',
  'SaaS': 'Solo developers are shipping full SaaS products in weeks not months',
  'Startups': 'More developers are going indie and reaching profitability without funding',
  'Career': 'The skills that get you hired as a developer in 2025 look different',
  'Productivity': 'Developers who write less code and ship more are winning',
  'Leadership': 'The best engineering managers write code less and communicate more',
  'Marketing': 'Developers who understand distribution build more successful products',
}

    const headline = headlines.length > 0
      ? headlines[Math.floor(Math.random() * headlines.length)]
      : fallbackHeadlines[topic] || 'The way we build software is changing fast'

    const prompt = `You are a full-stack developer writing a genuine LinkedIn post. You write like a real person — direct, thoughtful, no fluff.

Use this recent news as inspiration: "${headline}"

Write a LinkedIn post about ${topic} inspired by this. Do NOT just summarize the news. Share a real opinion, insight, or lesson from your experience as a developer.

STRICT RULES:
- First line must be a short punchy hook (max 8 words) — no question in the first line
- NO emojis at all
- NO hashtags
- Short paragraphs, 1-3 sentences each
- Numbered lists are OK if it fits naturally (like "3 things I learned")
- NO corporate words: leverage, game-changer, dive deep, in today's world, unlock
- Sound like a developer writing for themselves, not a marketing team
- End with ONE genuine question to the reader
- Total length: 120-180 words

Return ONLY the post text. Nothing else. No intro, no explanation.`

    const content = await generateWithGroq(prompt)
    const formatted = content.trim().replace(/\n(?!\n)/g, '\n\n')

    if (!content) {
      return NextResponse.json({ error: 'Failed to generate post' }, { status: 500 })
    }

    const hashtagLine = tags.map(t => `#${t}`).join(' ')
    const contentWithTags = `${content.trim()}\n\n${hashtagLine}`
    const imageUrl = generateTerminalCard(content.trim(), tags)

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