# Allowance Manager

A minimalist, elegant application to manage your monthly allowance, savings, and Mama Account transfers.

## Features

- **Wallet Balance**: Track your daily spending money.
- **Mama Account**: Manage funds allocated for family or home expenses.
- **Savings Balance**: Keep track of your long-term savings.
- **Money Flow**: Visualize how your allowance is distributed.
- **Insights**: Get smart insights into your spending habits.

## Tech Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org)
- **Styling**: [Tailwind CSS](https://tailwindcss.com)
- **Components**: [shadcn/ui](https://ui.shadcn.com)
- **Database/Auth**: [Supabase](https://supabase.com)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/allowance-manager.git
cd allowance-manager
```

### 2. Supabase Setup

This project requires a Supabase project for authentication and database storage.

1.  Create a new project on the [Supabase Dashboard](https://app.supabase.com/).
2.  Go to **Project Settings** > **API** to find your `Project URL` and `anon` key.
3.  Run the migrations located in `supabase/migrations/` in the Supabase SQL Editor to set up the database schema and RLS policies.
4.  Enable **Google Auth** in **Authentication** > **Providers** if you want to use Google Sign-In.

### 3. Environment Variables

Create a `.env.local` file in the root directory (based on `.env.example`):

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Install Dependencies & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Vercel Deployment

To deploy this project successfully on Vercel:

1.  Push your code to a GitHub repository.
2.  Import the project into Vercel.
3.  In the **Environment Variables** section, add:
    - `NEXT_PUBLIC_SUPABASE_URL`
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4.  Deploy!

## License

MIT
