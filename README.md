# hireflow

## Abstract

Most job portals stop at listing jobs and collecting applications — they don't solve the actual friction both sides deal with. Seekers apply into a black hole with no visibility into their status, no idea if they're even a fit, and get silently rejected without explanation. Recruiters, meanwhile, drown in unqualified applicants, can't trust the resumes in front of them, and manage candidates through spreadsheets instead of a real system.

This project is a job recruitment platform built to fix that gap on both sides — combining a transparent, e-commerce-style application experience for seekers with efficient, trust-aware screening tools for recruiters.

## Project Structure

| File | Purpose |
|---|---|
| `README.md` | This file — project overview |
| `SPEC.md` | Full functional specification, staged by version |
| `DATA_MODEL.md` | Firestore collections, fields, relationships |
| `API_DESIGN.md` | API routes / server functions needed |
| `ARCHITECTURE.md` | System-level diagram and data flow (the "bigger picture") |
| `PROMPTS.md` | Ready-to-paste prompts for Antigravity, staged |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js, Tailwind CSS |
| Backend / Database | Firebase Authentication, Firestore |
| Hosting | Vercel |
| Development Workflow | Google Antigravity |
| Version Control | Git, GitHub |

## How to Use This Package

1. Create a GitHub repo, add all these files to it, push.
2. Install dependencies: `npm install`.
3. Add your Firebase config values to `.env.local` using the placeholders in `lib/firebase.ts`.
4. Run the app locally with `npm run dev`.
5. Use the `/app/api` routes for server-side validation and Firestore enforcement.
6. When deploying, connect the GitHub repo to Vercel and set the same Firebase env vars in Vercel.

## Notes

- The frontend uses Firebase Auth, Firestore, and Storage.
- The `app/api/match/calculate` route is intended to forward match data to a separate C++ microservice running on `http://localhost:8080/match`.
- `firestore.rules` includes starter security rules for user documents, recruiter job writes, and restricted application writes.
