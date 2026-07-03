'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import styles from './page.module.css'

const DEMO_POSTS = [
  {
    text: "Most developers I know are building interesting things.\n\nBut almost none of them post about it.\n\nThey think their work is too basic or too obvious to share. It is not.\n\nThe people reading your posts are not all senior engineers. Some of them are exactly where you were 6 months ago — your experience is what they need.\n\nWhat have you built recently that you never talked about?",
    tags: ['#webdev', '#buildinpublic', '#developer']
  },
  {
    text: "AI is not replacing developers.\n\nIt is replacing the parts of development that nobody enjoyed — boilerplate, repetitive debugging, writing documentation nobody reads.\n\nThe developers who will struggle are not those who use AI. They are those who never built strong fundamentals to begin with.\n\nHow has AI changed your daily workflow?",
    tags: ['#ai', '#developer', '#programming']
  },
  {
    text: "Code reviews are not just about catching bugs.\n\nThey are how knowledge spreads across a team. When a senior developer leaves a comment, a junior developer learns something that might take months to discover on their own.\n\nThe best teams treat code review as a teaching moment, not a gate.\n\nHow does your team approach code reviews?",
    tags: ['#webdev', '#programming', '#teamwork']
  },
]

function TypingDemo() {
  const textRef = useRef<HTMLDivElement>(null)
  const tagsRef = useRef<HTMLDivElement>(null)
  const pi = useRef(0)
  const ci = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    function type() {
      const el = textRef.current
      const tg = tagsRef.current
      if (!el) return
      const post = DEMO_POSTS[pi.current]
      if (ci.current < post.text.length) {
        el.innerHTML = post.text.slice(0, ci.current + 1).replace(/\n/g, '<br>') + '<span class="typing-cursor"></span>'
        ci.current++
        timer.current = setTimeout(type, ci.current < 5 ? 80 : Math.random() * 18 + 12)
      } else {
        el.innerHTML = post.text.replace(/\n/g, '<br>')
        if (tg) tg.innerHTML = post.tags.map(t => `<span class="${styles.demoTag}">${t}</span>`).join('')
        timer.current = setTimeout(() => {
          if (tg) tg.innerHTML = ''
          ci.current = 0
          pi.current = (pi.current + 1) % DEMO_POSTS.length
          if (el) el.innerHTML = '<span class="typing-cursor"></span>'
          timer.current = setTimeout(type, 800)
        }, 4200)
      }
    }
    type()
    return () => clearTimeout(timer.current)
  }, [])

  return (
    <div className={styles.demoCard}>
      <div className={styles.demoBadge}>
        <i className="ti ti-sparkles" aria-hidden="true" /> AI is writing right now
      </div>
      <div className={styles.demoAuthor}>
        <div className={styles.demoAvatar}>YO</div>
        <div>
          <div className={styles.demoName}>Your Name</div>
          <div className={styles.demoRole}>Your title · 2nd</div>
        </div>
      </div>
      <div className={styles.demoText} ref={textRef}>
        <span className="typing-cursor" />
      </div>
      <div className={styles.demoTags} ref={tagsRef} />
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    async function checkSession() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
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
      }
    }
    checkSession()
  }, [router])

  return (
    <main>
      {/* Nav */}
      <nav className={styles.nav}>
        <div>
          <div className={styles.logo}>
            <i className="ti ti-brand-linkedin" aria-hidden="true" />
            Post<em>Pilot</em> AI
          </div>
          <span className={styles.logoSub}>Your LinkedIn growth assistant</span>
        </div>
        <a href="/api/auth/linkedin" className={styles.navCta}>
          <i className="ti ti-brand-linkedin" aria-hidden="true" /> Continue with LinkedIn
        </a>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroTag}>
          <i className="ti ti-sparkles" aria-hidden="true" /> Now in Beta · Free to try
        </div>
        <h1>Stay consistent on LinkedIn<br />without <em>spending hours writing.</em></h1>
        <p className={styles.heroHook}>Your AI copilot for LinkedIn growth.</p>
        <p className={styles.heroSub}>
          Generate <strong>authentic</strong> LinkedIn posts from topics you care about.
          Review them. Publish with one click.
        </p>
        <p className={styles.heroDiff}>No prompts. No copy-paste. No writer&apos;s block.</p>
        <div className={styles.diffBox}>
          <strong>Unlike ChatGPT,</strong> PostPilot discovers relevant topics for you daily, writes posts in your style, and lets you publish directly to LinkedIn — all from one place. No copy-paste. No prompting.
        </div>
        <a href="/api/auth/linkedin" className={styles.mainCta}>
          <i className="ti ti-brand-linkedin" aria-hidden="true" /> Generate My First LinkedIn Post
        </a>
        <p className={styles.ctaNote}>No password needed. One click and you&apos;re in.</p>
        <p className={styles.ctaTrust}>Trusted by developers, founders &amp; freelancers · Free during beta · No credit card</p>
      </section>

      {/* Beta bar */}
      <div className={styles.betaBar}>
        🚀 <strong>Now in Beta</strong> — Helping developers, founders and freelancers grow on LinkedIn.
      </div>

      {/* Demo */}
      <section className={styles.demoSection}>
        <p className={styles.sLabel}>Live preview</p>
        <h2 className={styles.sTitle}>Here&apos;s what your next LinkedIn post could look like</h2>
        <TypingDemo />
      </section>

      <hr className={styles.divider} />

      {/* Who */}
      <section className={styles.whoSection}>
        <p className={styles.sLabel}>Who it&apos;s for</p>
        <h2 className={styles.sTitle}>Built for people who want to grow on LinkedIn</h2>
        <div className={styles.whoGrid}>
          {[
            { icon: 'ti-code', title: 'Developers', desc: 'Share what you build without spending hours writing' },
            { icon: 'ti-rocket', title: 'Founders', desc: 'Build in public and grow your audience on autopilot' },
            { icon: 'ti-briefcase', title: 'Freelancers', desc: 'Stay visible to clients without the content grind' },
            { icon: 'ti-search', title: 'Job Seekers', desc: 'Build your personal brand while landing your next role' },
          ].map(w => (
            <div key={w.title} className={styles.whoCard}>
              <i className={`ti ${w.icon}`} aria-hidden="true" />
              <h4>{w.title}</h4>
              <p>{w.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <hr className={styles.divider} />

      {/* How it works */}
      <section className={styles.stepsSection}>
        <p className={styles.sLabel} style={{ textAlign: 'center' }}>How it works</p>
        <h2 className={styles.sTitle} style={{ textAlign: 'center' }}>From zero to posted in under 60 seconds</h2>
        <div className={styles.steps}>
          {[
            { n: 1, title: 'Click Generate', desc: 'Sign in with LinkedIn. One click, no passwords.' },
            { n: 2, title: 'Choose your topics', desc: 'Pick from 20+ categories — AI, Web Dev, WordPress and more.' },
            { n: 3, title: 'AI writes for you', desc: 'Get an authentic post that sounds like you, not a robot.' },
            { n: 4, title: 'Review & publish', desc: 'Approve and publish directly to LinkedIn in one click.' },
          ].map(s => (
            <div key={s.n} className={styles.step}>
              <div className={styles.stepNum}>{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <hr className={styles.divider} />

      {/* Features */}
      <section className={styles.featsSection}>
        <p className={styles.sLabel} style={{ textAlign: 'center' }}>What you get</p>
        <h2 className={styles.sTitle} style={{ textAlign: 'center' }}>Stop thinking about LinkedIn. Start growing.</h2>
        <div className={styles.feats}>
          {[
            { icon: 'ti-bulb', title: 'Never wonder what to post next.', desc: 'AI pulls from real news and trends. Fresh ideas every single day.' },
            { icon: 'ti-eye', title: 'Always in control.', desc: 'Review every post before it goes live. We only post when you approve.' },
            { icon: 'ti-send', title: 'Publish directly to LinkedIn.', desc: 'One click. No copy-paste. No switching apps.' },
            { icon: 'ti-calendar', title: 'Stay consistent without the effort.', desc: 'Daily generation runs automatically. Set it and forget it.' },
            { icon: 'ti-adjustments-horizontal', title: 'Posts that sound like you.', desc: 'Choose your tone — professional, casual, or storytelling.' },
            { icon: 'ti-trending-up', title: 'Grow your LinkedIn presence.', desc: 'More visibility, more leads, more opportunities. On autopilot.' },
          ].map(f => (
            <div key={f.title} className={styles.feat}>
              <i className={`ti ${f.icon}`} aria-hidden="true" />
              <h4>{f.title}</h4>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <hr className={styles.divider} />

      {/* Trust */}
      <section className={styles.trustSection}>
        <div className={styles.trustCard}>
          <h3>Why sign in with LinkedIn?</h3>
          <div className={styles.trustItems}>
            {[
              'We never see your LinkedIn password',
              'Uses official LinkedIn OAuth — same as every major app',
              'We only post when you approve',
              'You can disconnect anytime from LinkedIn settings',
            ].map(item => (
              <div key={item} className={styles.trustItem}>
                <i className="ti ti-circle-check" aria-hidden="true" /> {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <hr className={styles.divider} />

      {/* FAQ */}
      <section className={styles.faqSection}>
        <p className={styles.sLabel} style={{ textAlign: 'center' }}>FAQ</p>
        <h2 className={styles.sTitle} style={{ textAlign: 'center' }}>Quick answers</h2>
        <div className={styles.faqList}>
          {[
            { q: 'Does AI automatically post to my LinkedIn?', a: 'No. Every post must be approved by you before anything goes live. You are always in full control of what gets published.' },
            { q: 'Does PostPilot know my LinkedIn password?', a: 'Never. We use official LinkedIn OAuth — the same secure standard used by Buffer, Hootsuite, and Notion. Your password is never shared with us.' },
            { q: 'Can I edit posts before publishing?', a: 'Yes. Every generated post is fully editable. Think of AI as a first draft — you review, tweak if needed, then publish.' },
            { q: 'Is it free?', a: 'Free during beta. No credit card required. When we launch paid plans, beta users will get early access and special pricing.' },
          ].map(f => (
            <div key={f.q} className={styles.faqItem}>
              <div className={styles.faqQ}>
                <i className="ti ti-question-mark" aria-hidden="true" /> {f.q}
              </div>
              <div className={styles.faqA}>{f.a}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <div className={styles.bottomCta}>
        <h2>Stop thinking about what to post.<br />Let AI help.</h2>
        <p>Generate your first LinkedIn post in under 60 seconds. Free during beta.</p>
        <a href="/api/auth/linkedin" className={styles.mainCta}>
          <i className="ti ti-brand-linkedin" aria-hidden="true" /> Generate My First LinkedIn Post
        </a>
        <p className={styles.bottomNote}>No password needed · Free during beta · Disconnect anytime</p>
      </div>

      <footer className={styles.footer}>
        © 2025 PostPilot AI · Your LinkedIn growth assistant ·{' '}
        <a href="/login" style={{ color: '#185FA5' }}>Sign in</a>
      </footer>
    </main>
  )
}