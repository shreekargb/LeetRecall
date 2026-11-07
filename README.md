# ⚡ DSA Recall

**Master DSA patterns through spaced repetition and AI-powered reviews.**

DSA Recall is a web application that helps you retain Data Structures & Algorithms concepts using a scientifically-backed spaced repetition system (D1/D4/D7 schedule). Solve problems, get quizzed, write explanations, and receive AI-generated feedback — all tracked per user.

🔗 **Live Demo:** [leet-recall.vercel.app](https://leet-recall.vercel.app)

---

## ✨ Features

- **📚 Pattern-Based Learning** — 193 problems organized across 25 DSA patterns (Two Pointers, Sliding Window, Trees, Graphs, DP, etc.)
- **🔁 Spaced Repetition** — D1/D4/D7 review schedule automatically created when you mark a problem as solved
- **🧠 Day 1 & Day 7 — MCQ Quizzes** — 965 pre-seeded questions + AI-generated personalized questions on Day 7
- **✍️ Day 4 — Written Explanations** — Explain your approach in your own words; AI identifies knowledge gaps
- **🤖 AI-Powered Feedback** — Gemini evaluates your explanations, highlights gaps, and generates targeted MCQs
- **🔐 Multi-User Auth** — Email/password authentication via Supabase Auth; each user's progress is isolated
- **📱 Responsive Dark UI** — Clean, modern interface that works on desktop, tablet, and mobile

## 🏗️ How the Spaced Repetition Works

```
Day 0: Solve a problem → Mark as solved
Day 1: MCQ Quiz (5 questions from question bank)
Day 4: Write an explanation → AI evaluates gaps → generates personalized MCQs
Day 7: MCQ Quiz (AI-personalized questions based on Day 4 gaps)
```

If you fail a Day 7 quiz, a new D1→D4→D7 cycle starts automatically. Overdue reviews (2+ days late) are expired and a fresh cycle begins.

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Server Components) |
| **Styling** | [Tailwind CSS 4](https://tailwindcss.com/) |
| **Database** | [Supabase](https://supabase.com/) (PostgreSQL) |
| **Authentication** | [Supabase Auth](https://supabase.com/auth) via `@supabase/ssr` |
| **AI** | Google Gemini API (explanation evaluation + MCQ generation) |
| **Deployment** | [Vercel](https://vercel.com/) |

## 📁 Project Structure

```
├── app/
│   ├── page.tsx                    # Homepage — hero + pattern grid
│   ├── login/page.tsx              # Auth — login / signup
│   ├── patterns/
│   │   ├── page.tsx                # All patterns with problem counts
│   │   └── [id]/page.tsx           # Problems in a pattern
│   ├── due/page.tsx                # Due reviews for today
│   ├── review/[id]/
│   │   ├── page.tsx                # Review router (quiz or explain)
│   │   ├── Quiz.tsx                # MCQ quiz component
│   │   └── ExplainForm.tsx         # Written explanation component
│   ├── api/
│   │   ├── solve/route.ts          # Mark problem solved + schedule reviews
│   │   ├── complete/route.ts       # Complete a review
│   │   ├── submit-quiz/route.ts    # Submit quiz answers + scoring
│   │   └── submit-explanation/     # Submit explanation + AI evaluation
│   └── components/
│       ├── Navbar.tsx              # Navigation bar
│       ├── NavbarUserSection.tsx   # Auth-aware nav (streamed via Suspense)
│       └── LogoutButton.tsx        # Client-side sign out
├── lib/
│   ├── supabase.ts                 # Supabase client (service role)
│   ├── supabase-server.ts          # Server component client (cookies)
│   ├── supabase-browser.ts         # Browser client (auth)
│   ├── reviews.ts                  # Due reviews + expiry logic
│   ├── scheduler.ts                # D1/D4/D7 scheduling logic
│   ├── quiz.ts                     # Question selection logic
│   └── ai.ts                       # Gemini API — evaluate + generate MCQs
├── middleware.ts                   # Session refresh + route protection
├── data/
│   ├── problems.csv                # 193 problems across 25 patterns
│   └── mcqs.json                   # 965 pre-generated MCQs
└── scripts/
    ├── importcsv.ts                # Seed problems into Supabase
    ├── import-mcqs.ts              # Seed MCQs into Supabase
    └── generate-mcqs.ts            # Generate MCQs via AI
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com/) project
- A Google AI API key (for Gemini)

### 1. Clone & Install

```bash
git clone https://github.com/shreekargb/LeetRecall.git
cd LeetRecall
npm install
```

### 2. Set Up Supabase

Create a new Supabase project and run the database schema in the SQL Editor (create tables for `patterns`, `problems`, `user_problems`, `reviews`, `explanations`, `mcqs`).

### 3. Configure Environment

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
LLM_API_KEY=your_gemini_api_key
LLM_MODEL=gemini-2.0-flash
```

### 4. Seed the Database

```bash
npx tsx scripts/importcsv.ts     # Import 193 problems
npx tsx scripts/import-mcqs.ts   # Import 965 MCQs
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — sign up, solve a problem, and your first review will be scheduled for tomorrow.

## 📄 License

This project is for educational purposes.

---

Built with ☕ and spaced repetition.
