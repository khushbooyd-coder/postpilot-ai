'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from '../dashboard.module.css'
import sStyles from './settings.module.css'

const ALL_TOPICS = ['Tech', 'AI', 'Startups', 'Career', 'No-Code', 'Web Dev', 'Productivity', 'Leadership', 'Marketing', 'SaaS']
const TONES = ['Professional', 'Casual', 'Storytelling', 'Motivational', 'Educational']
const TIMES = ['07:00', '08:00', '09:00', '10:00', '12:00', '17:00', '18:00', '19:00']

export default function SettingsPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [topics, setTopics] = useState<string[]>(['Tech', 'AI'])
  const [tone, setTone] = useState('Professional')
  const [postTime, setPostTime] = useState('09:00')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const [linkedinConnected, setLinkedinConnected] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setEmail(user.email || '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('topics, tone, post_time, linkedin_access_token')
        .eq('id', user.id)
        .single()

      if (profile) {
        setTopics(profile.topics || ['Tech', 'AI'])
        setTone(profile.tone || 'Professional')
        setPostTime(profile.post_time || '09:00')
        setLinkedinConnected(!!profile.linkedin_access_token)
      }
      setLoading(false)
    }
    load()
  }, [router])

  function toggleTopic(topic: string) {
    setTopics(prev =>
      prev.includes(topic)
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    )
  }

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('profiles')
      .update({ topics, tone, post_time: postTime })
      .eq('id', user.id)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return <div className={styles.loading}><i className="ti ti-loader-2" style={{ fontSize: 28, color: '#185FA5' }} /></div>

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <i className="ti ti-brand-linkedin" />Post<em>Pilot</em> AI
        </div>
        <nav className={styles.nav}>
          <Link href="/dashboard" className={styles.navItem}><i className="ti ti-layout-dashboard" /> Dashboard</Link>
          <Link href="/dashboard/posts" className={styles.navItem}><i className="ti ti-file-text" /> Posts</Link>
          <Link href="/dashboard/settings" className={`${styles.navItem} ${styles.active}`}><i className="ti ti-settings" /> Settings</Link>
        </nav>
        <div className={styles.sidebarBottom}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{email[0]?.toUpperCase()}</div>
            <div>
              <div className={styles.userEmail}>{email}</div>
            </div>
          </div>
          <button className={styles.signOut} onClick={handleSignOut}>
            <i className="ti ti-logout" /> Sign out
          </button>
        </div>
      </aside>

      <main className={styles.main}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>Settings</h1>
            <p className={styles.pageSubtitle}>Customize your AI post preferences</p>
          </div>
          <button className={styles.generateBtn} onClick={handleSave} disabled={saving}>
            {saved
              ? <><i className="ti ti-check" /> Saved!</>
              : saving
              ? 'Saving...'
              : <><i className="ti ti-device-floppy" /> Save changes</>
            }
          </button>
        </div>

        <div className={sStyles.sections}>

          {/* Topics */}
          <div className={sStyles.section}>
            <h2 className={sStyles.sectionTitle}>
              <i className="ti ti-tags" /> Topics
            </h2>
            <p className={sStyles.sectionDesc}>Choose what your posts will be about. Select multiple.</p>
            <div className={sStyles.chips}>
              {ALL_TOPICS.map(t => (
                <button
                  key={t}
                  className={`${sStyles.chip} ${topics.includes(t) ? sStyles.chipActive : ''}`}
                  onClick={() => toggleTopic(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Tone */}
          <div className={sStyles.section}>
            <h2 className={sStyles.sectionTitle}>
              <i className="ti ti-adjustments-horizontal" /> Tone
            </h2>
            <p className={sStyles.sectionDesc}>How should your posts sound?</p>
            <div className={sStyles.chips}>
              {TONES.map(t => (
                <button
                  key={t}
                  className={`${sStyles.chip} ${tone === t ? sStyles.chipActive : ''}`}
                  onClick={() => setTone(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Schedule */}
          <div className={sStyles.section}>
            <h2 className={sStyles.sectionTitle}>
              <i className="ti ti-clock" /> Post time
            </h2>
            <p className={sStyles.sectionDesc}>What time should your post go live each day?</p>
            <div className={sStyles.chips}>
              {TIMES.map(t => (
                <button
                  key={t}
                  className={`${sStyles.chip} ${postTime === t ? sStyles.chipActive : ''}`}
                  onClick={() => setPostTime(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* LinkedIn */}
          <div className={sStyles.section}>
            <h2 className={sStyles.sectionTitle}>
              <i className="ti ti-brand-linkedin" /> LinkedIn account
            </h2>
            <p className={sStyles.sectionDesc}>Connect your LinkedIn to enable auto-posting.</p>
            {linkedinConnected ? (
              <div className={sStyles.connectedBadge}>
                <i className="ti ti-circle-check" /> LinkedIn connected!
              </div>
            ) : (
              <a href="/api/auth/signin/linkedin" className={sStyles.linkedinBtn}>
                <i className="ti ti-brand-linkedin" /> Connect LinkedIn
              </a>
            )}
          </div>

        </div>
      </main>
    </div>
  )
}
