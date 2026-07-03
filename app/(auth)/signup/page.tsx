'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from '../auth.module.css'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleSignup() {
    if (!email || !password) return
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setStatus('loading')
    setError('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard` }
    })

    if (error) {
      setError(error.message)
      setStatus('error')
    } else {
      setStatus('success')
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSignup()
  }

  if (status === 'success') {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.successIcon}>
            <i className="ti ti-mail-check" />
          </div>
          <h1 className={styles.title}>Check your email!</h1>
          <p className={styles.subtitle}>
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
          </p>
          <Link href="/login" className={styles.btn} style={{ display: 'block', textAlign: 'center', marginTop: '1.5rem' }}>
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <i className="ti ti-brand-linkedin" />
          Post<em>Pilot</em> AI
        </div>
        <h1 className={styles.title}>Create account</h1>
        <p className={styles.subtitle}>Start growing your LinkedIn presence</p>

        <div className={styles.fields}>
          <div className={styles.field}>
            <label>Email</label>
            <input
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={handleKey}
            />
          </div>
          <div className={styles.field}>
            <label>Password</label>
            <input
              type="password"
              placeholder="Min. 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKey}
            />
          </div>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button
          className={styles.btn}
          onClick={handleSignup}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Creating account...' : 'Create account'}
        </button>

        <p className={styles.switch}>
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
