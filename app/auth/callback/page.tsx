'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    async function handleCallback() {
      try {
        // Read token from URL hash (e.g. #access_token=...&refresh_token=...)
        const hash = window.location.hash.replace('#', '')
        const params = new URLSearchParams(hash)
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')

        if (accessToken && refreshToken) {
          // Set the session using the tokens from the URL
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) {
            console.error('setSession error:', error)
            router.push('/?error=session_failed')
            return
          }
        }

        // Small delay to let session settle
        await new Promise(resolve => setTimeout(resolve, 800))

        // Get the user
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
          console.error('getUser error:', userError)
          router.push('/?error=no_user')
          return
        }

        // Check if onboarding is done
        const { data: profile } = await supabase
          .from('profiles')
          .select('topics')
          .eq('id', user.id)
          .single()

        if (profile?.topics?.length > 0) {
          router.push('/dashboard')
        } else {
          router.push('/onboarding')
        }
      } catch (err) {
        console.error('Auth callback error:', err)
        router.push('/?error=callback_failed')
      }
    }

    handleCallback()
  }, [router])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#F8FAFC',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <div style={{
        width: 36,
        height: 36,
        border: '3px solid #E2E8F0',
        borderTopColor: '#185FA5',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <p style={{ color: '#64748B', fontSize: 14, fontFamily: 'Inter, sans-serif' }}>
        Setting up your account...
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}