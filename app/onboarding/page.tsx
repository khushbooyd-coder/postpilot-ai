'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from './onboarding.module.css'

const CATEGORIES = [
  {
    label: 'Technology',
    topics: ['AI', 'Software Dev', 'Web Development', 'JavaScript', 'React', 'Next.js', 'PHP', 'Python', 'WordPress', 'Git & GitHub', 'TypeScript'],
  },
  {
    label: 'Business',
    topics: ['Startups', 'SaaS', 'Marketing', 'Freelancing', 'Sales'],
  },
  {
    label: 'Career',
    topics: ['Productivity', 'Leadership', 'Career Growth', 'Interviews'],
  },
]

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

type Step = 'loading' | 'welcome' | 'generating' | 'post' | 'success'

const GEN_STEPS = [
  { emoji: '📰', text: "Reading today's tech news..." },
  { emoji: '🔍', text: "Finding what's trending in your topics..." },
  { emoji: '✍️', text: 'Writing like you...' },
  { emoji: '🎯', text: 'Making it LinkedIn-friendly...' },
]

const DOT_STEPS: Step[] = ['welcome', 'generating', 'post', 'success']

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('loading')
  const [userName, setUserName] = useState('there')
  const [userHeadline, setUserHeadline] = useState('Developer')
  const [selected, setSelected] = useState<string[]>([])
  const [autoDetected, setAutoDetected] = useState<string[]>([])
  const [genStep, setGenStep] = useState(-1)
  const [post, setPost] = useState<{ id: string; content: string; image_url: string | null } | null>(null)
  const [notifyPick, setNotifyPick] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      // Wait for Supabase to process any tokens in the URL
      await new Promise(resolve => setTimeout(resolve, 1000))

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/')
        return
      }

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
            setAutoDetected(detected)
            setSelected(detected)
            setStep('welcome')
            return
          }
        } catch { /* fallback */ }
      }

      const defaults = ['Web Development', 'AI', 'SaaS']
      setAutoDetected(defaults)
      setSelected(defaults)
      setStep('welcome')
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
    selected.length === 0 ? 'Choose 3 interests to continue'
    : remaining === 2 ? '2 more to go'
    : remaining === 1 ? '1 more to go'
    : '✅ Ready!'
  const counterReady = selected.length >= 3

  async function handleContinue() {
    if (selected.length < 3) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ topics: selected }).eq('id', user.id)
    setStep('generating')
    runGenAnimation()
  }

  function runGenAnimation() {
    setGenStep(-1)
    const delays = [400, 1300, 2200, 3100]
    delays.forEach((delay, i) => setTimeout(() => setGenStep(i), delay))
    setTimeout(generatePost, 4200)
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
  const currentIdx = DOT_STEPS.indexOf(step as Step)

  // Loading state
  if (step === 'loading') {
    return (
      <div className={styles.page}>
        <div className={styles.card} style={{ textAlign: 'center', padding: '3rem' }}>
          <div className={styles.logo}>
            <i className="ti ti-brand-linkedin" aria-hidden="true" />
            Post<em>Pilot</em> AI
          </div>
          <div className={styles.spinner} style={{ margin: '2rem auto', width: 32, height: 32, borderWidth: 3 }} />
          <p style={{ color: '#64748B', fontSize: 14 }}>Setting up your account...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>

        <div className={styles.logo}>
          <i className="ti ti-brand-linkedin" aria-hidden="true" />
          Post<em>Pilot</em> AI
        </div>

        <div className={styles.dots}>
          {DOT_STEPS.map((s, i) => (
            <div
              key={s}
              className={`${styles.dot} ${i === currentIdx ? styles.dotActive : i < currentIdx ? styles.dotDone : ''}`}
            />
          ))}
        </div>

        {step === 'welcome' && (
          <>
            <div className={styles.profileCard}>
              <div className={styles.connectedBadge}>
                <i className="ti ti-circle-check" aria-hidden="true" /> LinkedIn connected
              </div>
              <div className={styles.avatar}>{userName[0]?.toUpperCase()}</div>
              <div className={styles.profileName}>Welcome, {userName}! 👋</div>
              <div className={styles.profileHeadline}>{userHeadline}</div>
              <div className={styles.oauthNote}>
                <i className="ti ti-lock" aria-hidden="true" /> Using official LinkedIn OAuth. We never see your password.
              </div>
            </div>

            <h2 className={styles.title}>Pick your topics</h2>
            <p className={styles.sub}>We&apos;ll generate posts based on these every day.</p>

            {autoDetected.length > 0 && (
              <div className={styles.autoNote}>
                <i className="ti ti-sparkles" aria-hidden="true" />
                We pre-selected a few based on your LinkedIn profile. Feel free to change them.
              </div>
            )}

            <div className={`${styles.counterPill} ${counterReady ? styles.counterReady : ''}`}>
              {counterText}
            </div>

            <div className={styles.categories}>
              {CATEGORIES.map(cat => (
                <div key={cat.label} className={styles.category}>
                  <div className={styles.catLabel}>{cat.label}</div>
                  <div className={styles.topicsRow}>
                    {cat.topics.map(topic => (
                      <button
                        key={topic}
                        className={`${styles.topic} ${selected.includes(topic) ? styles.topicSel : ''}`}
                        onClick={() => toggleTopic(topic)}
                      >
                        {selected.includes(topic) ? `✓ ${topic}` : topic}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              className={`${styles.btn} ${selected.length < 3 ? styles.btnOff : ''}`}
              onClick={handleContinue}
              disabled={selected.length < 3}
            >
              <i className="ti ti-sparkles" aria-hidden="true" /> Generate my first post
            </button>
            <p className={styles.hint}>You can update your interests anytime.</p>
          </>
        )}

        {step === 'generating' && (
          <>
            <h2 className={styles.title}>Generating your post...</h2>
            <p className={styles.sub}>This takes about 6 seconds.</p>
            <div className={styles.genSteps}>
              {GEN_STEPS.map((s, i) => (
                <div
                  key={i}
                  className={`${styles.genStep} ${i < genStep ? styles.genDone : i === genStep ? styles.genActive : ''}`}
                >
                  <div className={styles.genIcon}>
                    {i < genStep
                      ? <i className="ti ti-check" aria-hidden="true" />
                      : i === genStep
                      ? <div className={styles.spinner} />
                      : s.emoji}
                  </div>
                  {s.text}
                </div>
              ))}
            </div>
          </>
        )}

        {step === 'post' && post && (
          <>
            <h2 className={styles.title}>Here&apos;s your first post 🎉</h2>
            <p className={styles.sub}>Review it, then publish directly to LinkedIn.</p>

            <div className={styles.whyCard}>
              <div className={styles.whyTitle}>🔥 Why this topic today</div>
              <div className={styles.whyItem}><i className="ti ti-trending-up" aria-hidden="true" /> Trending in your selected topics</div>
              <div className={styles.whyItem}><i className="ti ti-star" aria-hidden="true" /> High engagement this week</div>
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
              {restContent && (
                <div className={styles.postRest} style={{ whiteSpace: 'pre-line' }}>{restContent}</div>
              )}
              {post.image_url && (
                <img src={post.image_url} alt="Post card" className={styles.postImage} />
              )}
            </div>

            <div className={styles.actionRow}>
              <button className={styles.approveBtn} onClick={handleApprove}>
                <i className="ti ti-check" aria-hidden="true" /> Approve
              </button>
              <button className={styles.publishBtn} onClick={handlePublish}>
                <i className="ti ti-brand-linkedin" aria-hidden="true" /> Publish now
              </button>
            </div>
          </>
        )}

        {step === 'success' && (
          <>
            <div className={styles.confetti}>🎉</div>
            <h2 className={styles.title}>Congratulations!</h2>
            <p className={styles.sub}>Your first LinkedIn post is live. That&apos;s the hardest part done.</p>

            <div className={styles.streakBox}>
              <div className={styles.streakEmoji}>🔥</div>
              <div>
                <div className={styles.streakCount}>1 Day Streak</div>
                <div className={styles.streakSub}>Post tomorrow to keep it going</div>
              </div>
            </div>

            <p className={styles.notifyLabel}>Want a reminder when tomorrow&apos;s draft is ready?</p>
            <div className={styles.notifyOpts}>
              {[
                { id: 'yes', icon: '📧', title: 'Yes, email me', sub: 'Daily nudge when your draft is ready' },
                { id: 'no', icon: '🙅', title: 'Not now', sub: "I'll check in myself" },
              ].map(opt => (
                <div
                  key={opt.id}
                  className={`${styles.notifyOpt} ${notifyPick === opt.id ? styles.notifyPicked : ''}`}
                  onClick={() => setNotifyPick(opt.id)}
                >
                  <span className={styles.notifyIcon}>{opt.icon}</span>
                  <div>
                    <div className={styles.notifyTitle}>{opt.title}</div>
                    <div className={styles.notifySub}>{opt.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            <button className={styles.btn} onClick={() => router.push('/dashboard')}>
              <i className="ti ti-layout-dashboard" aria-hidden="true" /> Go to dashboard
            </button>
          </>
        )}

      </div>
    </div>
  )
}