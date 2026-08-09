# System Architecture — The Bigger Picture

## High-level flow

```
┌─────────────────┐         ┌──────────────────────┐
│   Browser (UI)   │◄───────►│  Next.js App (Vercel) │
│  Candidate/      │         │  - Pages/Components    │
│  Recruiter       │         │  - Tailwind UI          │
└─────────────────┘         │  - API routes (/api/*)  │
                              └──────────┬───────────┘
                                         │
                ┌────────────────────┬───┴────┬────────────────────┐
                ▼                    ▼         ▼                    ▼
        ┌───────────────┐   ┌────────────────┐   ┌─────────────────┐   ┌──────────────────────┐
        │ Firebase Auth  │   │   Firestore     │   │ Firebase Storage │   │ C++ Match Microservice │
        │ (login/signup) │   │ (users, jobs,   │   │ (resume PDFs)    │   │ (cpp-httplib, port 8080)│
        │                │   │ applications)   │   │                  │   │ Computes ATS match score│
        └───────────────┘   └────────────────┘   └─────────────────┘   └──────────────────────┘
```

**Note on the C++ service**: this is a genuinely separate program, not part of the Next.js codebase. It's the required C++ component — a small, focused HTTP microservice that only handles the skill-matching algorithm. The `/api/match/calculate` Next.js route acts as a bridge: it gathers data from Firestore, forwards it to the C++ service, and returns the result to the frontend.

## How the pieces connect

1. **Frontend (Next.js)** — handles all UI: candidate dashboard, recruiter dashboard, job listings, application tracker. Talks to Firebase directly for simple reads, and to your own `/api/*` routes for anything needing validation logic (applying, status changes, matching).

2. **Firebase Auth** — handles signup/login/session tokens. Every API route checks the user's auth token before acting, so someone can't fake being a different user.

3. **Firestore** — the database. Structured as described in `DATA_MODEL.md`: three main collections (`users`, `jobs`, `applications`) plus supporting ones for quizzes.

4. **Firebase Storage** — holds uploaded resume PDFs. `users` documents just store a URL reference to the file, not the file itself.

5. **Vercel** — hosts the deployed Next.js app, auto-deploys on every `git push` to your main branch once connected.

## Data flow example: candidate applies to a job

1. Candidate clicks "Apply" on a job listing (frontend)
2. Frontend calls `POST /api/applications/apply` with `candidateId` + `jobId`
3. API route checks Firestore for an existing application with that pair → if found, returns error
4. If not found, creates new doc in `applications` collection with status `"Applied"`
5. Frontend re-fetches candidate's application list → status tracker updates
6. Recruiter, viewing their job's applicant list, sees the new applicant appear in real time (Firestore listeners) or on next page load

## Why this structure (for your resume/interview explanation)

- **Firebase over a custom backend**: faster to build correctly as a solo/beginner dev, handles auth/scaling out of the box, and is a legitimate real-world choice many startups make — not "just a student shortcut."
- **API routes only where needed**: most Firebase apps write directly from client to Firestore; you're adding server-side API routes specifically where business logic (duplicate-check, mandatory feedback rule, match scoring) needs to be enforced reliably rather than trusted to the client. This is a genuine architectural decision worth explaining in an interview.
- **Staged builds**: each stage in `SPEC.md` maps to a deployable, demoable version — this is intentional incremental delivery, not just "getting it done in parts."
