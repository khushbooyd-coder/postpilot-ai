import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Proven LinkedIn content formulas that get engagement
const CONTENT_FORMULAS = [
  {
    name: 'lesson_learned',
    prompt: (topic: string, persona: string) => `Write a LinkedIn post sharing a genuine lesson learned about "${topic}".

${persona}

Formula: Start with a surprising insight or mistake. Explain what you learned. End with advice for others.

Hook examples:
- "I made a mistake with ${topic} last year that cost me a client."
- "Nobody told me this about ${topic} when I started."
- "I used to think ${topic} was [X]. I was wrong."`,
  },
  {
    name: 'hot_take',
    prompt: (topic: string, persona: string) => `Write a LinkedIn post sharing a bold opinion about "${topic}".

${persona}

Formula: State a contrarian opinion. Back it up with 2-3 real reasons. Invite debate.

Hook examples:
- "Unpopular opinion: most [professionals] are doing ${topic} wrong."
- "Everyone talks about ${topic}. Nobody talks about [the real issue]."
- "The ${topic} advice everyone gives is actually bad advice."`,
  },
  {
    name: 'client_story',
    prompt: (topic: string, persona: string) => `Write a LinkedIn post about a client result related to "${topic}".

${persona}

Formula: Set up the client's problem. What you did. The result. The lesson.
Keep it anonymous — "a client" not a name.

Hook examples:
- "A client came to me with a ${topic} problem. Here's what happened."
- "Last month I helped a business owner fix their ${topic}. The result surprised both of us."
- "A small business owner asked me about ${topic}. My answer changed how they work."`,
  },
  {
    name: 'myth_buster',
    prompt: (topic: string, persona: string) => `Write a LinkedIn post busting a common myth about "${topic}".

${persona}

Formula: State the myth. Explain why it's wrong. Give the truth. End with a question.

Hook examples:
- "Most people get ${topic} completely wrong."
- "The biggest lie about ${topic} that nobody corrects."
- "Stop believing this about ${topic}."`,
  },
  {
    name: 'practical_tips',
    prompt: (topic: string, persona: string) => `Write a LinkedIn post sharing 3 practical tips about "${topic}".

${persona}

Formula: Strong hook. 3 short numbered tips (1-2 lines each). Closing insight. Question.

Hook examples:
- "3 things I wish I knew about ${topic} earlier."
- "After [X] projects, here's what actually works with ${topic}."
- "Quick ${topic} tips that make a real difference."`,
  },
  {
    name: 'observation',
    prompt: (topic: string, persona: string) => `Write a LinkedIn post sharing an observation or trend about "${topic}".

${persona}

Formula: What you noticed. Why it matters. What others should do about it.

Hook examples:
- "Something is changing in ${topic} and most people aren't paying attention."
- "I've noticed a pattern with ${topic} across my clients."
- "The ${topic} landscape looked very different just 2 years ago."`,
  },
  {
    name: 'personal_story',
    prompt: (topic: string, persona: string) => `Write a LinkedIn post sharing a personal experience related to "${topic}".

${persona}

Formula: Personal moment or challenge. What happened. What you learned. Relatable ending.

Hook examples:
- "This ${topic} situation changed how I work."
- "I almost gave up on ${topic}. Here's what stopped me."
- "A conversation about ${topic} changed my perspective completely."`,
  },
  {
    name: 'mindset',
    prompt: (topic: string, persona: string) => `Write a LinkedIn post about the mindset shift needed for "${topic}".

${persona}

Formula: Common mindset (wrong). Better mindset (right). Why it matters. Reflection question.

Hook examples:
- "The way most people think about ${topic} is holding them back."
- "Changing my mindset about ${topic} changed my results."
- "Success with ${topic} starts in how you think about it."`,
  },
]

// Persona is built dynamically per user — see buildPersona() below
function buildPersona(topics: string[], tone: string, headline?: string): string {
  const topicList = topics.slice(0, 4).join(", ")
  const headlinePart = headline ? `Your professional background: ${headline}.` : ""
  return `You are a professional who works in the field of ${topicList}.
${headlinePart}
You write honestly about your work, your experiences, and what you have learned.
Your tone is ${tone.toLowerCase()}.
You sound like a real person sharing genuine insights — not a content creator or marketer.
You write from your own experience and perspective in your field.`
}

const RULES = `STRICT RULES:
- First line: punchy hook, max 8 words, makes people stop scrolling
- NO emojis in the body (you can use 1 max if it feels natural)
- NO hashtags in the body text
- Short paragraphs — max 2 sentences each
- NO corporate words: leverage, game-changer, dive deep, unlock, journey, delve
- Sound like a real developer/business owner talking to peers
- End with ONE short genuine question
- Total length: 120-180 words
- Return ONLY the post text. Nothing else.`

async function generateWithGroq(prompt: string): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 600,
      temperature: 0.9,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}

const TOPIC_TAGS: Record<string, string[]> = {
  'AI & Machine Learning': ['ai', 'machinelearning', 'artificialintelligence'],
  'Web Development': ['webdev', 'programming', 'webdevelopment'],
  'JavaScript': ['javascript', 'webdev', 'coding'],
  'TypeScript': ['typescript', 'javascript', 'webdev'],
  'React': ['react', 'javascript', 'webdev'],
  'Next.js': ['nextjs', 'react', 'webdev'],
  'Node.js': ['nodejs', 'javascript', 'backend'],
  'Python': ['python', 'programming', 'developer'],
  'PHP': ['php', 'webdev', 'programming'],
  'WordPress': ['wordpress', 'webdev', 'cms'],
  'Flutter & Mobile': ['flutter', 'mobiledev', 'appdev'],
  'Docker & DevOps': ['docker', 'devops', 'cloudcomputing'],
  'Cloud & AWS': ['aws', 'cloud', 'devops'],
  'Cybersecurity': ['cybersecurity', 'infosec', 'security'],
  'Data Science': ['datascience', 'machinelearning', 'python'],
  'Open Source': ['opensource', 'github', 'developer'],
  'UI/UX Design': ['uidesign', 'uxdesign', 'design'],
  'Blockchain': ['blockchain', 'web3', 'crypto'],
  'Electrical Engineering': ['electricalengineering', 'engineering', 'technology'],
  'Mechanical Engineering': ['mechanicalengineering', 'engineering', 'manufacturing'],
  'Civil Engineering': ['civilengineering', 'engineering', 'construction'],
  'Chemical Engineering': ['chemicalengineering', 'engineering', 'chemistry'],
  'Renewable Energy': ['renewableenergy', 'sustainability', 'cleanenergy'],
  'Robotics & Automation': ['robotics', 'automation', 'engineering'],
  'Research & Innovation': ['research', 'innovation', 'technology'],
  'Sustainability': ['sustainability', 'environment', 'greentech'],
  'Manufacturing': ['manufacturing', 'industry', 'engineering'],
  'Startups': ['startups', 'entrepreneurship', 'founder'],
  'SaaS': ['saas', 'buildinpublic', 'indiehacker'],
  'Entrepreneurship': ['entrepreneurship', 'business', 'startup'],
  'Digital Marketing': ['digitalmarketing', 'marketing', 'socialmedia'],
  'Social Media Marketing': ['socialmedia', 'marketing', 'contentmarketing'],
  'Content Marketing': ['contentmarketing', 'marketing', 'content'],
  'SEO': ['seo', 'digitalmarketing', 'webdev'],
  'E-commerce': ['ecommerce', 'business', 'shopify'],
  'Sales': ['sales', 'business', 'growth'],
  'Finance & Investing': ['finance', 'investing', 'money'],
  'Personal Branding': ['personalbranding', 'linkedin', 'brand'],
  'Freelancing': ['freelancing', 'remotework', 'freelancer'],
  'Medicine & Health': ['healthcare', 'medicine', 'health'],
  'Mental Health': ['mentalhealth', 'wellness', 'health'],
  'Fitness & Wellness': ['fitness', 'wellness', 'health'],
  'Nutrition': ['nutrition', 'health', 'wellness'],
  'Nursing & Care': ['nursing', 'healthcare', 'medicine'],
  'Pharmaceuticals': ['pharma', 'healthcare', 'medicine'],
  'Career Growth': ['career', 'careergrowth', 'professional'],
  'Job Hunting': ['jobsearch', 'career', 'hiring'],
  'Leadership': ['leadership', 'management', 'business'],
  'Productivity': ['productivity', 'focus', 'timemanagement'],
  'Remote Work': ['remotework', 'wfh', 'career'],
  'Public Speaking': ['publicspeaking', 'communication', 'leadership'],
  'Teaching & Training': ['teaching', 'education', 'learning'],
  'Higher Education': ['education', 'university', 'learning'],
  'Design & Creativity': ['design', 'creativity', 'art'],
  'Writing & Blogging': ['writing', 'blogging', 'content'],
  'Photography': ['photography', 'creative', 'art'],
  'Video & Content Creation': ['videocontent', 'contentcreation', 'youtube'],
  'Podcasting': ['podcast', 'audio', 'contentcreation'],
  'Social Media': ['socialmedia', 'instagram', 'contentcreation'],
}

function generateImageCard(content: string, tags: string[]): string {
  function esc(str: string) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  const lines = content.split('\n').filter(l => l.trim())
  const firstLine = lines[0] || ''

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

  const titleLines = wrapText(firstLine, 30).slice(0, 3)
  const bodyText = lines.slice(1, 2).join(' ').slice(0, 130)
  const bodyLines = wrapText(bodyText, 45).slice(0, 3)

  const topicColors: Record<string, string> = {
    'ai': '#6366F1', 'machinelearning': '#6366F1', 'artificialintelligence': '#6366F1',
    'javascript': '#F59E0B', 'typescript': '#3B82F6',
    'react': '#38BDF8', 'nextjs': '#FFFFFF',
    'wordpress': '#3B82F6', 'php': '#8B5CF6',
    'python': '#10B981', 'saas': '#EC4899',
    'buildinpublic': '#F97316', 'indiehacker': '#F97316',
    'startups': '#F97316', 'entrepreneurship': '#F97316',
    'career': '#14B8A6', 'careergrowth': '#14B8A6',
    'webdev': '#06B6D4', 'webdevelopment': '#06B6D4',
    'freelancing': '#8B5CF6', 'freelancer': '#8B5CF6',
    'electricalengineering': '#F59E0B', 'engineering': '#F59E0B',
    'healthcare': '#10B981', 'medicine': '#10B981',
    'marketing': '#EC4899', 'digitalmarketing': '#EC4899',
    'leadership': '#185FA5', 'productivity': '#185FA5',
  }

  const tag0 = (tags[0] || 'webdev').toLowerCase()
  const accentColor = topicColors[tag0] || '#2563EB'

  const titleY = 260
  const titleLineHeight = 95
  const titleBlockEnd = titleY + titleLines.length * titleLineHeight
  const bodyStartY = titleBlockEnd + 60
  const bodyLineHeight = 50
  const dividerY = Math.max(bodyStartY + bodyLines.length * bodyLineHeight + 60, 850)

  let badgeX = 100
  const badges = tags.slice(0, 4).map(tag => {
    const label = `#${tag}`
    const width = Math.max(label.length * 13 + 36, 90)
    const b = `
    <rect x="${badgeX}" y="${dividerY + 30}" width="${width}" height="46" rx="23" fill="${accentColor}" opacity="0.12"/>
    <rect x="${badgeX}" y="${dividerY + 30}" width="${width}" height="46" rx="23" fill="none" stroke="${accentColor}" stroke-width="1.5" opacity="0.35"/>
    <text x="${badgeX + width / 2}" y="${dividerY + 59}" font-family="Inter, system-ui, sans-serif" font-size="19" font-weight="600" fill="${accentColor}" text-anchor="middle">${esc(label)}</text>`
    badgeX += width + 14
    return b
  }).join('')

  const canvasH = Math.max(dividerY + 160, 900)

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
  <rect width="1200" height="${canvasH}" fill="url(#bg)"/>
  <rect width="1200" height="${canvasH}" fill="url(#glow1)"/>
  <rect width="1200" height="${canvasH}" fill="url(#glow2)"/>
  <pattern id="dots" width="48" height="48" patternUnits="userSpaceOnUse">
    <circle cx="24" cy="24" r="1" fill="#FFFFFF" opacity="0.025"/>
  </pattern>
  <rect width="1200" height="${canvasH}" fill="url(#dots)"/>
  <rect x="0" y="0" width="5" height="${canvasH}" fill="${accentColor}" opacity="0.9"/>
  <text x="100" y="95" font-family="Inter, system-ui, sans-serif" font-size="26" font-weight="700" fill="${accentColor}" letter-spacing="2">POSTPILOT AI</text>
  <text x="100" y="130" font-family="Inter, system-ui, sans-serif" font-size="17" fill="#475569">Your LinkedIn Growth Assistant</text>
  <line x1="100" y1="158" x2="1100" y2="158" stroke="#1E293B" stroke-width="1"/>
  <text x="75" y="${titleY + 60}" font-family="Georgia, serif" font-size="260" fill="${accentColor}" opacity="0.06">"</text>
  ${titleLines.map((line, i) => `
  <text x="100" y="${titleY + i * titleLineHeight}" font-family="Inter, system-ui, sans-serif" font-size="78" font-weight="800" fill="#F1F5F9" letter-spacing="-1.5">${esc(line)}</text>`).join('')}
  <rect x="100" y="${titleBlockEnd + 20}" width="80" height="4" rx="2" fill="${accentColor}"/>
  ${bodyLines.map((line, i) => `
  <text x="100" y="${bodyStartY + i * bodyLineHeight}" font-family="Inter, system-ui, sans-serif" font-size="32" fill="#94A3B8">${esc(line)}</text>`).join('')}
  <line x1="100" y1="${dividerY}" x2="1100" y2="${dividerY}" stroke="#1E293B" stroke-width="1"/>
  ${badges}
  <text x="100" y="${dividerY + 140}" font-family="Inter, system-ui, sans-serif" font-size="19" fill="#334155">Generated with PostPilot AI</text>
  <text x="1100" y="${dividerY + 140}" font-family="Inter, system-ui, sans-serif" font-size="19" fill="${accentColor}" text-anchor="end">postpilot-ai-self.vercel.app</text>
</svg>`

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
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
      .select('topics, tone, is_admin, linkedin_access_token')
      .eq('id', user.id)
      .single()

    const topics: string[] = profile?.topics || ['Web Development', 'Career Growth', 'Productivity']
    const tone: string = profile?.tone || 'Professional'

    // Try to get LinkedIn headline for personalization
    let userHeadline = ''
    if (profile?.linkedin_access_token) {
      try {
        const liRes = await fetch('https://api.linkedin.com/v2/userinfo', {
          headers: { Authorization: `Bearer ${profile.linkedin_access_token}` },
        })
        const liData = await liRes.json()
        if (liData.headline) userHeadline = liData.headline
      } catch { /* ignore */ }
    }

    // Build persona dynamically from user profile
    const persona = buildPersona(topics, tone, userHeadline)

    // Pick a random topic and formula
    const topic = topics[Math.floor(Math.random() * topics.length)]
    const formula = CONTENT_FORMULAS[Math.floor(Math.random() * CONTENT_FORMULAS.length)]
    const tags = TOPIC_TAGS[topic] || ['professional', 'career', 'growth']

    // Build the full prompt
    const fullPrompt = `${formula.prompt(topic, persona)}

Tone: ${tone}

${RULES}`

    // Generate with Groq
    let content = await generateWithGroq(fullPrompt)

    // Fallback if generation fails
    if (!content || content.length < 50) {
      content = `Nobody talks about the hard part of ${topic}.

Everyone shares the wins. The good results. The easy days.

Nobody talks about the moments where you had to figure everything out yourself, make mistakes, and start over.

I have been in this field long enough to know that the difficult parts are where real growth happens.

The things that challenged you most are what made you good at what you do.

What is the hardest lesson ${topic} has taught you?`
    }

    // Add hashtags
    const hashtagLine = tags.map(t => `#${t}`).join(' ')
    const contentWithTags = `${content.trim()}\n\n${hashtagLine}`

    // Generate image card
    const imageUrl = generateImageCard(content.trim(), tags)

    // Save to database
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
        image_url: imageUrl,
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