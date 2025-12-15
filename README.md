# CFO Buddy 💰

A personal finance app for freelancers and solopreneurs in India. Upload your bank statements, track cash flow, and make smarter financial decisions.

## Features

- 📊 **Upload Bank Statements** - CSV or PDF (AI-powered extraction)
- 💵 **Track Cash Flow** - See your monthly burn and runway
- 🎯 **Smart Insights** - Personalized recommendations based on your business
- 🔐 **Secure** - Data stored in your own Supabase instance

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Auth**: Supabase Auth (Magic Link)
- **Storage**: Supabase Storage
- **AI**: Gemini (client-side) + Groq (server-side fallback)
- **Styling**: Tailwind CSS

## Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/314yush/cfo-buddy.git
cd cfo-buddy
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Settings → API** and copy:
   - Project URL
   - anon (public) key
   - service_role key
3. Go to **Settings → Database** and copy:
   - Connection string (Transaction mode) → `DATABASE_URL`
   - Connection string (Session mode) → `DIRECT_URL`

### 3. Create Storage Bucket

In Supabase Dashboard:
1. Go to **Storage**
2. Create a new bucket called `bank-statements`
3. Set it to **Private**

### 4. Configure Environment

```bash
cp env.example .env
```

Fill in your values in `.env` (see env.example for reference)

### 5. Set up Database

```bash
npx prisma generate
npx prisma db push
```

### 6. Get AI API Keys

**Gemini (for PDF processing):**
- Get free key at [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
- Add as `NEXT_PUBLIC_GEMINI_API_KEY`

**Groq (server-side fallback):**
- Get free key at [console.groq.com/keys](https://console.groq.com/keys)
- Add as `GROQ_API_KEY`

### 7. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── (app)/           # Protected routes
│   │   ├── onboarding/  # User onboarding flow
│   │   ├── snapshot/    # Financial dashboard
│   │   ├── transactions/ # Transaction list
│   │   └── upload/      # File upload
│   ├── api/             # API routes
│   ├── auth/            # Auth callback
│   └── login/           # Login page
├── lib/
│   ├── pdf-to-csv/      # PDF processing with Gemini
│   ├── prisma.ts        # Prisma client
│   ├── snapshot.ts      # Financial calculations
│   └── supabase/        # Supabase clients
└── prisma/
    └── schema.prisma    # Database schema
```

## Supported Banks

CSV uploads work with most Indian banks including:
- HDFC Bank
- ICICI Bank
- SBI
- Axis Bank
- Kotak Mahindra
- Yes Bank

PDF uploads use AI to extract transactions from any bank statement format.

## License

MIT

## Contributing

PRs welcome! Please open an issue first to discuss what you'd like to change.
