'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './dashboard.module.css'

type Post = {
  id: string
  content: string
  status: string
  created_at: string
  posted_at: string | null
  image_url: string | null
}

type Profile = {
  topics: string[]
  tone: string
  plan: string
  is_admin: boolean
}

export default function DashboardPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [greeting, setGreeting] = useState('Good morning')

  useEffect(() => {
    const h = new Date().getHours()
    if (h < 12) setGreeting('Good morning')
    else if (h < 17) setGreeting('Good afternoon')
    else setGreeting('Good evening')

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setEmail(user.email || '')

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (prof) {
        setProfile(prof)
        // If no topics set, go to onboarding
        if (!prof.topics || prof.topics.length === 0) {
          router.push('/onboarding')
          return
        }
      }

      const { data: postsData } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (postsData) setPosts(postsData)
      setLoading(false)
    }
    load()
  }, [router])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  async function generatePost() {
    setGenerating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/generate-post', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      })
      const data = await res.json()
      if (data.success) {
        setPosts(prev => [data.post, ...prev])
        // Refresh page to show new post in today's draft
        window.location.reload()
      }
    } catch (e) {
      console.error(e)
    }
    setGenerating(false)
  }

  async function updatePostStatus(id: string, status: string) {
    await supabase.from('posts').update({ status }).eq('id', id)
    setPosts(prev => prev.map(p => p.id === id ? { ...p, status } : p))
  }

  const pendingPost = posts.find(p => p.status === 'pending')
  const approvedPost = posts.find(p => p.status === 'approved')
  const todayPost = pendingPost || approvedPost
  const postedCount = posts.filter(p => p.status === 'posted').length
  const userName = email.split('@')[0]
  const displayName = userName.charAt(0).toUpperCase() + userName.slice(1)

  if (generating) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(248,250,252,0.97)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1.5rem', zIndex: 999 }}>
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '2.5rem', textAlign: 'center', maxWidth: 380, width: '100%' }}>
          <div style={{ fontSize: 40, marginBottom: '1rem' }}>✨</div>
          <h3 style={{ fontFamily: 'var(--font-space, sans-serif)', fontSize: '1.2rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.5rem' }}>Generating your post...</h3>
          <p style={{ fontSize: 13, color: '#64748B', marginBottom: '1.5rem' }}>Reading today&apos;s news and writing in your tone. This takes about 6 seconds.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
            {['📰 Reading today's trending news...', '🔍 Finding what's hot in your topics...', '✍️ Writing in your tone...', '🎯 Making it LinkedIn-ready...'].map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#475569' }}>
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #185FA5', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                {step}
              </div>
            ))}
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <i className="ti ti-loader-2" style={{ fontSize: 28, color: '#185FA5' }} />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <i className="ti ti-brand-linkedin" aria-hidden="true" />Post<em>Pilot</em> AI
        </div>
        <nav className={styles.nav}>
          <Link href="/dashboard" className={`${styles.navItem} ${styles.active}`}>
            <i className="ti ti-layout-dashboard" /> Dashboard
          </Link>
          <Link href="/dashboard/posts" className={styles.navItem}>
            <i className="ti ti-file-text" /> Posts
          </Link>
          <Link href="/dashboard/settings" className={styles.navItem}>
            <i className="ti ti-settings" /> Settings
          </Link>
        </nav>
        <div className={styles.sidebarBottom}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{email[0]?.toUpperCase()}</div>
            <div>
              <div className={styles.userEmail}>{email}</div>
              <div className={styles.userPlan}>{profile?.is_admin ? 'Admin' : profile?.plan || 'free'} plan</div>
            </div>
          </div>
          <button className={styles.signOut} onClick={handleSignOut}>
            <i className="ti ti-logout" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className={styles.main}>

        {/* Greeting */}
        <div className={styles.greeting}>
          <h1 className={styles.greetingTitle}>{greeting}, {displayName} 👋</h1>
          <p className={styles.greetingSubtitle}>
            {todayPost ? "Today's draft is ready for review." : "Generate today's post to keep your streak going."}
          </p>
        </div>

        {/* Today's Draft — hero card */}
        {todayPost ? (
          <div className={styles.todayCard}>
            <div className={styles.todayHeader}>
              <div className={styles.todayLabel}>
                <i className="ti ti-file-text" /> Today&apos;s draft
                <span className={`${styles.todayStatus} ${todayPost.status === 'approved' ? styles.statusApproved : styles.statusPending}`}>
                  {todayPost.status === 'approved' ? '✓ Approved' : '• Pending review'}
                </span>
              </div>
              <span className={styles.todayDate}>{new Date(todayPost.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
            </div>
            <p className={styles.todayPreview}>
              {todayPost.content.split('\n')[0]}
            </p>
            <div className={styles.todayActions}>
              <Link href="/dashboard/posts" className={styles.reviewBtn}>
                <i className="ti ti-eye" /> Review & Publish
              </Link>
              {todayPost.status === 'pending' && (
                <button className={styles.approveQuickBtn} onClick={() => updatePostStatus(todayPost.id, 'approved')}>
                  <i className="ti ti-check" /> Approve
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.generateCard}>
            <div className={styles.generateCardIcon}>✨</div>
            <h3>No draft yet today</h3>
            <p>Generate today&apos;s post and keep your streak alive.</p>
            <button className={styles.generateBtn} onClick={generatePost} disabled={generating}>
              <i className="ti ti-sparkles" />
              {generating ? 'Generating...' : 'Generate today\'s post'}
            </button>
          </div>
        )}

        {/* Stats row */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <div className={styles.statEmoji}>🔥</div>
            <div className={styles.statInfo}>
              <div className={styles.statNum}>{postedCount > 0 ? `${postedCount}` : '0'}</div>
              <div className={styles.statLabel}>Day streak</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statEmoji}>📈</div>
            <div className={styles.statInfo}>
              <div className={styles.statNum}>{postedCount}</div>
              <div className={styles.statLabel}>Posts published</div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statEmoji}>🎯</div>
            <div className={styles.statInfo}>
              <div className={styles.statNum}>9:00 AM</div>
              <div className={styles.statLabel}>Next draft</div>
            </div>
          </div>
        </div>

        {/* Topics + generate button */}
        <div className={styles.bottomRow}>
          <div className={styles.topicsCard}>
            <div className={styles.topicsLabel}>Your topics</div>
            <div className={styles.topicsChips}>
              {(profile?.topics || []).slice(0, 5).map(t => (
                <span key={t} className={styles.topicChip}>{t}</span>
              ))}
              <Link href="/dashboard/settings" className={styles.topicEdit}>
                <i className="ti ti-pencil" /> Edit
              </Link>
            </div>
          </div>
          <button className={styles.generateBtn} onClick={generatePost} disabled={generating}>
            <i className="ti ti-sparkles" />
            {generating ? 'Generating...' : 'Generate new post'}
          </button>
        </div>

      </main>
    </div>
  )
}