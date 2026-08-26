# API Design

Most reads/writes go straight from the Next.js frontend to Firestore via the Firebase client SDK (no custom API needed for basic CRUD — this is normal for Firebase apps). You only need custom **Next.js API routes** (`/app/api/.../route.ts`) for logic that shouldn't run on the client — things involving validation, secrets, or cross-document consistency.

## Routes to build

### `POST /api/auth/send-otp`
Sends OTP to email/phone at signup.
- Input: `{ contact: string, method: "email" | "phone" }`
- Output: `{ success: boolean }`

### `POST /api/auth/verify-otp`
Verifies the OTP code entered by user.
- Input: `{ contact: string, code: string }`
- Output: `{ verified: boolean }`

### `POST /api/applications/apply`
Creates an application — server-side so you can enforce "one application per job" reliably (don't trust client-only checks).
- Input: `{ candidateId, jobId }`
- Logic: check for existing application doc for this pair → reject if found → else create with status "Applied"
- Output: `{ applicationId }` or `{ error: "already applied" }`

### `POST /api/applications/update-status`
Recruiter changes an applicant's status.
- Input: `{ applicationId, newStatus, rejectionReason? }`
- Logic: validate rejectionReason is present if newStatus === "Rejected" AND previous status was "Interview Completed" (mandatory feedback rule)
- Output: `{ success: boolean }`

### `POST /api/match/calculate`
Computes ATS match score when a candidate views a job. **This route does not compute the score itself — it fetches the required data and forwards it to the C++ matching microservice (see below), then returns that result.**
- Input: `{ candidateId, jobId }`
- Logic: fetch candidate skills + verifiedSkills from Firestore, fetch job requiredSkills, POST them to the C++ microservice at `http://localhost:8080/match`, return its response to the frontend
- Output: `{ matchScore: "Strong" | "Partial" | "Low", matchedSkills: [string], missingSkills: [string] }`

---

## C++ Matching Microservice (separate program, not a Next.js route)

A standalone C++ HTTP server, run as its own process, handling only the matching computation. This is the required C++ component of the project.

- **Library**: [`cpp-httplib`](https://github.com/yhirose/cpp-httplib) — single-header, beginner-friendly HTTP server, no complex build setup needed
- **JSON handling**: [`nlohmann/json`](https://github.com/nlohmann/json) — single-header JSON library, easy to parse/build request and response bodies
- **Port**: runs locally on `8080` (or any free port), separate from the Next.js app on `3000`

### Endpoint: `POST /match`
- **Input** (JSON body):
```json
{
  "candidateSkills": ["react", "javascript", "css"],
  "jobRequiredSkills": ["react", "typescript", "css", "node"]
}
```
- **Logic** (this is your actual DSA/algorithm work):
  1. Normalize both skill lists (lowercase, trim whitespace)
  2. Compute the intersection (matched skills) and the difference (missing skills) using sets
  3. Score = `(matched count / required count) * 100`
  4. Bucket: `>70 = "Strong"`, `40–70 = "Partial"`, `<40 = "Low"`
- **Output** (JSON body):
```json
{
  "matchScore": "Partial",
  "matchedSkills": ["react", "css"],
  "missingSkills": ["typescript", "node"]
}
```

### How it runs alongside the rest of the app
- During development: run the compiled C++ binary manually in a terminal (`./match_service`) alongside `npm run dev`
- Your Next.js API route (`/api/match/calculate`) calls it via a simple `fetch("http://localhost:8080/match", ...)`
- For deployment: since Vercel can't run a persistent C++ binary, host this microservice separately on a small always-on server (e.g. a free-tier Render.com or Railway.app instance) — mention this as a deployment note in your README even if you only run it locally for the demo

### `POST /api/quiz/submit` (Stage 2)
Submits a completed skill quiz.
- Input: `{ userId, skill, answers: [number], tabFocusLossCount }`
- Logic: grade against `quizzes/{skill}`, if passed → append to `verifiedSkills` on user doc
- Output: `{ passed: boolean, score: number }`

### Stage 2 additions

The following route contracts are inferred from the expanded Stage 2 specification:

### `POST /api/resume/analyze` (Stage 2)
Extracts skills from a candidate's uploaded resume PDF.
- Input: `{ resumeUrl }`
- Logic: verify the authenticated candidate owns the resume, extract skills, and return normalized skill names
- Output: `{ skills: [string] }`

### `POST /api/company/verify` (Stage 2)
Verifies a recruiter or company using a company email domain or registration document.
- Input: `{ companyEmail?, registrationDocumentUrl? }`
- Logic: validate the company email domain or document, then set `users/{userId}.companyVerified` to `true` when verified
- Output: `{ verified: boolean }`

### `PATCH /api/jobs/deadline` (Stage 2)
Creates or changes an application deadline for a recruiter-owned job.
- Input: `{ jobId, deadline }`
- Logic: verify job ownership, update `jobs/{jobId}.deadline`, append to `deadlineHistory`, and notify users who saved the job
- Output: `{ success: boolean }`

### `POST /api/saved-jobs` (Stage 2)
Saves a job to the authenticated candidate's bucket list.
- Input: `{ jobId }`
- Logic: create `users/{userId}/savedJobs/{jobId}` with `savedAt` and `status: "saved"`
- Output: `{ success: boolean }`

### `DELETE /api/saved-jobs` (Stage 2)
Removes a job from the authenticated candidate's bucket list.
- Input: `{ jobId }`
- Output: `{ success: boolean }`

### `GET /api/saved-jobs` (Stage 2)
Lists the authenticated candidate's saved and missed jobs.
- Output: `{ savedJobs: [...] }`

### `GET /api/notifications` (Stage 2)
Lists notifications for the authenticated candidate.
- Output: `{ notifications: [...] }`

### `PATCH /api/notifications/read` (Stage 2)
Marks one of the authenticated candidate's notifications as read.
- Input: `{ notificationId }`
- Output: `{ success: boolean }`

### `POST /api/interview/propose` (Stage 3)
Recruiter proposes interview slots.
- Input: `{ applicationId, slots: [timestamp], mode }`
- Output: `{ success: boolean }`

### `POST /api/interview/confirm` (Stage 3)
Candidate confirms a slot.
- Input: `{ applicationId, chosenSlot }`
- Output: `{ success: boolean }`

## Firestore Security Rules (important — don't skip)
- Candidates can only write to their own `users/{userId}` doc
- Recruiters can only edit `jobs/{jobId}` where `recruiterId == request.auth.uid`
- Applications: candidate can create (via API route only, not direct client write, to enforce dedup logic); only the owning recruiter or candidate can read a given application
- Tell Antigravity explicitly: "write Firestore security rules matching this access pattern" — it won't infer this unless asked
