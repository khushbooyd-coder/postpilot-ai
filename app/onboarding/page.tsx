'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from './onboarding.module.css'

const TOPICS = [
  // Technology
  { label: 'AI', cat: 'Technology' },
  { label: 'Web Development', cat: 'Technology' },
  { label: 'JavaScript', cat: 'Technology' },
  { label: 'TypeScript', cat: 'Technology' },
  { label: 'React', cat: 'Technology' },
  { label: 'Next.js', cat: 'Technology' },
  { label: 'Node.js', cat: 'Technology' },
  { label: 'Vue.js', cat: 'Technology' },
  { label: 'Python', cat: 'Technology' },
  { label: 'PHP', cat: 'Technology' },
  { label: 'WordPress', cat: 'Technology' },
  { label: 'Flutter', cat: 'Technology' },
  { label: 'Docker', cat: 'Technology' },
  { label: 'DevOps', cat: 'Technology' },
  { label: 'AWS', cat: 'Technology' },
  { label: 'Cybersecurity', cat: 'Technology' },
  { label: 'Open Source', cat: 'Technology' },
  { label: 'Mobile Dev', cat: 'Technology' },
  { label: 'UI/UX Design', cat: 'Technology' },
  { label: 'Git & GitHub', cat: 'Technology' },

  // Business
  { label: 'SaaS', cat: 'Business' },
  { label: 'Startups', cat: 'Business' },
  { label: 'Marketing', cat: 'Business' },
  { label: 'Freelancing', cat: 'Business' },
  { label: 'Sales', cat: 'Business' },
  { label: 'Personal Branding', cat: 'Business' },

  // Career
  { label: 'Career Growth', cat: 'Career' },
  { label: 'Productivity', cat: 'Career' },
  { label: 'Leadership', cat: 'Career' },
  { label: 'Job Hunting', cat: 'Career' },
  { label: 'Remote Work', cat: 'Career' },
]

const TONES = [
  { id: 'Professional', label: 'Professional', desc: 'Clear, credible, expert' },
  { id: 'Casual', label: 'Casual', desc: 'Friendly, relaxed, real' },
  { id: 'Storytelling', label: 'Storytelling', desc: 'Narrative, personal, engaging' },
]

const TIMES = ['07:00', '08:00', '09:00', '10:00', '12:00', '17:00', '18:00']

function detectTopics(headline: string): string[] {
  const h = headline.toLowerCase()
  const detected: string[] = []
  if (h.includes('react')) detected.push('React')
  if (h.includes('wordpress') || h.includes('wp')) detected.push('WordPress')
  if (h.includes('php')) detected.push('PHP')
  if (h.includes('python')) detected.push('Python')
  if (h.includes('saas') || h.includes('founder')) detected.push('SaaS')
  if (h.includes('next')) detected.push('Next.js')
  if (h.includes('javascript')) detected.push('JavaScript')
  if (h.includes('web') || h.includes('full-stack') || h.includes('fullstack')) detected.push('Web Development')
  if (h.includes('ai')) detected.push('AI')
  if (detected.length < 3) {
    if (!detected.includes('Web Development')) detected.push('Web Development')
    if (!detected.includes('SaaS')) detected.push('SaaS')
    if (!detected.includes('AI')) detected.push('AI')
  }
  return [...new Set(detected)].slice(0, 4)
}

type Step = 'loading' | 'setup' | 'generating' | 'post' | 'success'

const DOT_STEPS: Step[] = ['setup', 'generating', 'post', 'success']

const GEN_STEPS = [
  { emoji: '📰', text: "Reading today's trending news..." },
  { emoji: '🔍', text: "Finding what's hot in your topics..." },
  { emoji: '✍️', text: 'Writing like you...' },
  { emoji: '🎯', text: 'Making it LinkedIn-friendly...' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('loading')
  const [userName, setUserName] = useState('there')
  const [userHeadline, setUserHeadline] = useState('Developer')
  const [selected, setSelected] = useState<string[]>([])
  const [tone, setTone] = useState('Professional')
  const [postTime, setPostTime] = useState('09:00')
  const [genStep, setGenStep] = useState(-1)
  const [post, setPost] = useState<{ id: string; content: string; image_url: string | null } | null>(null)
  const [notifyPick, setNotifyPick] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      await new Promise(resolve => setTimeout(resolve, 800))

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('topics, linkedin_access_token')
        .eq('id', user.id)
        .single()

      if (profile?.topics?.length > 0) {
        router.push('/dashboard')
        return
      }

      const name = user.user_metadata?.name || user.email?.split('@')[0] || 'there'
      setUserName(name.split(' ')[0])

      if (profile?.linkedin_access_token) {
        try {
          const res = await fetch('https://api.linkedin.com/v2/userinfo', {
            headers: { Authorization: `Bearer ${profile.linkedin_access_token}` },
          })
          const data = await res.json()
          if (data.name) setUserName(data.name.split(' ')[0])
          if (data.headline) {
            setUserHeadline(data.headline)
            const detected = detectTopics(data.headline)
            setSelected(detected)
            setStep('setup')
            return
          }
        } catch { /* fallback */ }
      }

      setSelected(['AI', 'Web Development', 'SaaS'])
      setStep('setup')
    }
    load()
  }, [router])

  function toggleTopic(topic: string) {
    setSelected(prev =>
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    )
  }

  const remaining = Math.max(0, 3 - selected.length)
  const counterText =
    selected.length === 0 ? 'Pick at least 3 topics'
    : remaining === 2 ? '2 more to go'
    : remaining === 1 ? '1 more to go'
    : '✅ Ready!'

  async function handleContinue() {
    if (selected.length < 3) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({
      topics: selected,
      tone,
      post_time: postTime,
    }).eq('id', user.id)
    setStep('generating')
    runGenAnimation()
  }

  function runGenAnimation() {
    setGenStep(-1)
    const delays = [400, 1300, 2200, 3100]
    delays.forEach((delay, i) => setTimeout(() => setGenStep(i), delay))
    setTimeout(generatePost, 4500)
  }

  async function generatePost() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/generate-post', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      if (data.success) {
        setPost(data.post)
        setStep('post')
      } else {
        router.push('/dashboard')
      }
    } catch {
      router.push('/dashboard')
    }
  }

  async function handlePublish() {
    if (!post) return
    const { data: { session } } = await supabase.auth.getSession()
    await fetch('/api/linkedin/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ postId: post.id }),
    })
    setStep('success')
  }

  async function handleApprove() {
    if (!post) return
    await supabase.from('posts').update({ status: 'approved' }).eq('id', post.id)
    setStep('success')
  }

  const firstLine = post?.content?.split('\n').find(l => l.trim()) || ''
  const restContent = post?.content?.split('\n').slice(1).join('\n') || ''
  const currentIdx = DOT_STEPS.indexOf(step as any)

  // Group topics by category
  const cats = ['Technology', 'Business', 'Career']

  if (step === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.loadingCard}>
          <div className={styles.logo}>
            <i className="ti ti-brand-linkedin" aria-hidden="true" />
            Post<em>Pilot</em> AI
          </div>
          <div className={styles.spinner} style={{ margin: '2rem auto', width: 32, height: 32, borderWidth: 3 }} />
          <p className={styles.loadingText}>Setting up your account...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>

        {/* Logo */}
        <div className={styles.logo}>
          <i className="ti ti-brand-linkedin" aria-hidden="true" />
          Post<em>Pilot</em> AI
        </div>

        {/* Progress dots */}
        <div className={styles.dots}>
          {DOT_STEPS.map((s, i) => (
            <div key={s} className={`${styles.dot} ${i === currentIdx ? styles.dotActive : i < currentIdx ? styles.dotDone : ''}`} />
          ))}
        </div>

        {/* ── SETUP ── */}
        {step === 'setup' && (
          <>
            {/* Profile */}
            <div className={styles.profileCard}>
              <div className={styles.connectedBadge}>
                <i className="ti ti-circle-check" /> LinkedIn connected
              </div>
              <div className={styles.avatar}>{userName[0]?.toUpperCase()}</div>
              <div className={styles.profileName}>Welcome, {userName}! 👋</div>
              <div className={styles.profileHeadline}>{userHeadline}</div>
              <div className={styles.oauthNote}>
                <i className="ti ti-lock" /> Official LinkedIn OAuth — we never see your password.
              </div>
            </div>

            {/* SECTION 1 — Topics */}
            <div className={styles.section}>
              <div className={styles.sectionNum}>1</div>
              <div className={styles.sectionBody}>
                <div className={styles.sectionTitle}>What do you want to post about?</div>
                <div className={styles.sectionSub}>Pick at least 3. We'll find relevant news and write posts based on these.</div>
                <div className={`${styles.counterPill} ${selected.length >= 3 ? styles.counterReady : ''}`}>
                  {counterText}
                </div>
                {cats.map(cat => (
                  <div key={cat} className={styles.topicGroup}>
                    <div className={styles.catLabel}>{cat}</div>
                    <div className={styles.topicsRow}>
                      {TOPICS.filter(t => t.cat === cat).map(t => (
                        <button
                          key={t.label}
                          className={`${styles.topic} ${selected.includes(t.label) ? styles.topicSel : ''}`}
                          onClick={() => toggleTopic(t.label)}
                        >
                          {selected.includes(t.label) ? `✓ ${t.label}` : t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.divider} />

            {/* SECTION 2 — Tone */}
            <div className={styles.section}>
              <div className={styles.sectionNum}>2</div>
              <div className={styles.sectionBody}>
                <div className={styles.sectionTitle}>How should your posts sound?</div>
                <div className={styles.sectionSub}>Pick the tone that matches your personal style.</div>
                <div className={styles.toneRow}>
                  {TONES.map(t => (
                    <button
                      key={t.id}
                      className={`${styles.toneCard} ${tone === t.id ? styles.toneSel : ''}`}
                      onClick={() => setTone(t.id)}
                    >
                      <div className={styles.toneLabel}>{t.label}</div>
                      <div className={styles.toneDesc}>{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.divider} />

            {/* SECTION 3 — Post time */}
            <div className={styles.section}>
              <div className={styles.sectionNum}>3</div>
              <div className={styles.sectionBody}>
                <div className={styles.sectionTitle}>When should your post go live?</div>
                <div className={styles.sectionSub}>We'll generate and queue your daily post for this time.</div>
                <div className={styles.timeRow}>
                  {TIMES.map(t => (
                    <button
                      key={t}
                      className={`${styles.timeBtn} ${postTime === t ? styles.timeSel : ''}`}
                      onClick={() => setPostTime(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.divider} />

            {/* CTA */}
            <button
              className={`${styles.btn} ${selected.length < 3 ? styles.btnOff : ''}`}
              onClick={handleContinue}
              disabled={selected.length < 3}
            >
              <i className="ti ti-sparkles" /> Generate my first post
            </button>
            <p className={styles.hint}>You can change all of this anytime.</p>
          </>
        )}

        {/* ── GENERATING ── */}
        {step === 'generating' && (
          <>
            <h2 className={styles.title}>Generating your first post...</h2>
            <p className={styles.sub}>Hang tight, this takes about 6 seconds.</p>
            <div className={styles.genSteps}>
              {GEN_STEPS.map((s, i) => (
                <div key={i} className={`${styles.genStep} ${i < genStep ? styles.genDone : i === genStep ? styles.genActive : ''}`}>
                  <div className={styles.genIcon}>
                    {i < genStep ? <i className="ti ti-check" /> : i === genStep ? <div className={styles.spinner} /> : s.emoji}
                  </div>
                  {s.text}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── POST READY ── */}
        {step === 'post' && post && (
          <>
            <h2 className={styles.title}>Here's your first post 🎉</h2>
            <p className={styles.sub}>Review it, edit if needed, then publish.</p>

            <div className={styles.whyCard}>
              <div className={styles.whyTitle}>🔥 Why this topic today</div>
              <div className={styles.whyItem}><i className="ti ti-trending-up" /> Trending in your selected topics</div>
              <div className={styles.whyItem}><i className="ti ti-star" /> High engagement this week</div>
            </div>

            <div className={styles.postCard}>
              <div className={styles.postAuthor}>
                <div className={styles.postAvatar}>{userName[0]?.toUpperCase()}</div>
                <div>
                  <div className={styles.postName}>{userName}</div>
                  <div className={styles.postRole}>{userHeadline}</div>
                </div>
              </div>
              <div className={styles.postFirstLine}>{firstLine}</div>
              {restContent && <div className={styles.postRest} style={{ whiteSpace: 'pre-line' }}>{restContent}</div>}
              {post.image_url && <img src={post.image_url} alt="Post card" className={styles.postImage} />}
            </div>

            <div className={styles.actionRow}>
              <button className={styles.approveBtn} onClick={handleApprove}>
                <i className="ti ti-check" /> Approve
              </button>
              <button className={styles.publishBtn} onClick={handlePublish}>
                <i className="ti ti-brand-linkedin" /> Publish now
              </button>
            </div>
          </>
        )}

        {/* ── SUCCESS ── */}
        {step === 'success' && (
          <>
            <div className={styles.confetti}>🎉</div>
            <h2 className={styles.title}>You're all set!</h2>
            <p className={styles.sub}>Your first LinkedIn post is live. That's the hardest part done.</p>

            <div className={styles.streakBox}>
              <div className={styles.streakEmoji}>🔥</div>
              <div>
                <div className={styles.streakCount}>1 Day Streak</div>
                <div className={styles.streakSub}>Post tomorrow to keep it going</div>
              </div>
            </div>

            <div className={styles.tomorrowNote}>
              <i className="ti ti-clock" />
              We'll have a fresh draft ready for you tomorrow at {postTime}. Check back to review and publish.
            </div>

            <p className={styles.notifyLabel}>Want a reminder when tomorrow's draft is ready?</p>
            <div className={styles.notifyOpts}>
              {[
                { id: 'yes', icon: '📧', title: 'Yes, email me', sub: 'Daily nudge when your draft is ready' },
                { id: 'no', icon: '🙅', title: 'Not now', sub: "I'll check in myself" },
              ].map(opt => (
                <div key={opt.id} className={`${styles.notifyOpt} ${notifyPick === opt.id ? styles.notifyPicked : ''}`} onClick={() => setNotifyPick(opt.id)}>
                  <span className={styles.notifyIcon}>{opt.icon}</span>
                  <div>
                    <div className={styles.notifyTitle}>{opt.title}</div>
                    <div className={styles.notifySub}>{opt.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            <button className={styles.btn} onClick={() => router.push('/dashboard')}>
              <i className="ti ti-layout-dashboard" /> Go to dashboard
            </button>
          </>
        )}

      </div>
    </div>
  )
}