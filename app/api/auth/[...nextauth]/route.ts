import NextAuth from 'next-auth'
import LinkedInProvider from 'next-auth/providers/linkedin'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const handler = NextAuth({
  providers: [
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid profile email w_member_social',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Save LinkedIn access token when user first signs in
      if (account?.provider === 'linkedin') {
        token.linkedinAccessToken = account.access_token
        token.linkedinTokenExpiry = account.expires_at
      }
      return token
    },
    async session({ session, token }) {
      // Pass token to session
      session.linkedinAccessToken = token.linkedinAccessToken ?? ""
       session.linkedinTokenExpiry = token.linkedinTokenExpiry
      return session
    },
    async signIn({ user, account }) {
      if (account?.provider === 'linkedin') {
        try {
          // Save LinkedIn token to Supabase profile
          const { error } = await supabaseAdmin
            .from('profiles')
            .update({
              linkedin_access_token: account.access_token,
              linkedin_token_expiry: account.expires_at
                ? new Date(account.expires_at * 1000).toISOString()
                : null,
            })
            .eq('email', user.email)

          if (error) console.error('Error saving LinkedIn token:', error)
        } catch (err) {
          console.error('SignIn error:', err)
        }
      }
      return true
    },
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
})

export { handler as GET, handler as POST }
