# PostPilot AI 🚀

> Your LinkedIn, posting itself.

AI-powered LinkedIn auto-posting SaaS — landing page with waitlist capture.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Database:** Supabase (waitlist storage)
- **Fonts:** Space Grotesk + Inter (Google Fonts)
- **Deploy:** Vercel

---

## Local Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Supabase
1. Go to [supabase.com](https://supabase.com) and create a new project
2. Run this SQL in the Supabase SQL editor to create the waitlist table:

```sql
create table waitlist (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  created_at timestamptz default now()
);
```

### 3. Add environment variables
```bash
cp .env.example .env.local
```
Fill in your Supabase URL and service role key from your Supabase project settings.

### 4. Run locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add the same env vars in your Vercel project dashboard under **Settings → Environment Variables**.

---

## Project Structure

```
postpilot-ai/
├── app/
│   ├── api/
│   │   └── waitlist/
│   │       └── route.ts      # Waitlist API endpoint
│   ├── globals.css           # Global styles + CSS variables
│   ├── layout.tsx            # Root layout + metadata
│   ├── page.tsx              # Landing page
│   └── page.module.css       # Landing page styles
├── lib/
│   └── supabase.ts           # Supabase client
├── .env.example
└── README.md
```

---

## Next Steps (after waitlist phase)

- [ ] LinkedIn OAuth integration
- [ ] AI post generator (Claude API)
- [ ] Post scheduler (cron jobs via Vercel Cron)
- [ ] User dashboard
- [ ] Payments (Razorpay / Stripe)
