import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space' })

export const metadata: Metadata = {
  title: 'PostPilot AI — Your LinkedIn, Posting Itself',
  description: 'Generate authentic LinkedIn posts with AI. Review them. Publish with one click.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'PostPilot AI',
    description: 'Your AI copilot for LinkedIn growth.',
    type: 'website',
    url: 'https://postpilot-ai-self.vercel.app',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css"
        />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
