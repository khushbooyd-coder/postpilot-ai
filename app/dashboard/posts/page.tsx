'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from '../dashboard.module.css'
import pStyles from './posts.module.css'

type Post = {
  id: string
  content: string
  status: string
  created_at: string
  posted_at: string | null
}

export default function PostsPage() {
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [email, setEmail] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setEmail(user.email || '')

      const { data } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (data) setPosts(data)
      setLoading(false)
    }
    load()
  }, [router])

  async function updateStatus(id: string, status: string) {
    await supabase.from('posts').update({ status }).eq('id', id)
    setPosts(prev => prev.map(p => p.id === id ? { ...p, status } : p))
  }

  async function deletePost(id: string) {
    if (!confirm('Delete this post?')) return
    await supabase.from('posts').delete().eq('id', id)
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const filtered = filter === 'all' ? posts : posts.filter(p => p.status === filter)

  if (loading) return <div className={styles.loading}><i className="ti ti-loader-2" style={{ fontSize: 28, color: '#185FA5' }} /></div>

  return (
    <div className={styles.page}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <i className="ti ti-brand-linkedin" />Post<em>Pilot</em> AI
        </div>
        <nav className={styles.nav}>
          <Link href="/dashboard" className={styles.navItem}><i className="ti ti-layout-dashboard" /> Dashboard</Link>
          <Link href="/dashboard/posts" className={`${styles.navItem} ${styles.active}`}><i className="ti ti-file-text" /> Posts</Link>
          <Link href="/dashboard/settings" className={styles.navItem}><i className="ti ti-settings" /> Settings</Link>
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
            <h1 className={styles.pageTitle}>All Posts</h1>
            <p className={styles.pageSubtitle}>{posts.length} posts total</p>
          </div>
          <Link href="/dashboard" className={styles.generateBtn}>
            <i className="ti ti-arrow-left" /> Back
          </Link>
        </div>

        <div className={pStyles.tabs}>
          {['all', 'pending', 'approved', 'posted', 'skipped'].map(f => (
            <button
              key={f}
              className={`${pStyles.tab} ${filter === f ? pStyles.activeTab : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className={pStyles.count}>
                {f === 'all' ? posts.length : posts.filter(p => p.status === f).length}
              </span>
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <i className="ti ti-file-plus" />
            <p>No {filter === 'all' ? '' : filter} posts yet.</p>
          </div>
        ) : (
          <div className={styles.postsList}>
            {filtered.map(post => (
              <div key={post.id} className={styles.postCard}>
                <div className={styles.postHeader}>
                  <span className={`${styles.badge} ${styles[post.status as keyof typeof styles]}`}>{post.status}</span>
                  <span className={styles.postDate}>{new Date(post.created_at).toLocaleDateString()}</span>
                </div>
                <p className={styles.postContent} style={{ whiteSpace: 'pre-line' }}>{post.content}</p>
                <div className={styles.postActions}>
                  {post.status === 'pending' && (
                    <button className={styles.approveBtn} onClick={() => updateStatus(post.id, 'approved')}>
                      <i className="ti ti-check" /> Approve
                    </button>
                  )}
                  {post.status === 'approved' && (
                    <button className={styles.approveBtn} onClick={() => updateStatus(post.id, 'pending')}>
                      <i className="ti ti-arrow-back" /> Unapprove
                    </button>
                  )}
                  {post.status !== 'skipped' && post.status !== 'posted' && (
                    <button className={styles.skipBtn} onClick={() => updateStatus(post.id, 'skipped')}>
                      <i className="ti ti-x" /> Skip
                    </button>
                  )}
                  <button className={pStyles.deleteBtn} onClick={() => deletePost(post.id)}>
                    <i className="ti ti-trash" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
