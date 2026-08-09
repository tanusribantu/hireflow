# Prompts for Antigravity — Paste One Stage at a Time

Do not paste all of these at once. Finish, test, and commit each stage before moving to the next.

---

## Setup Prompt (run first)

```
I'm building a job recruitment portal. Read SPEC.md, DATA_MODEL.md, API_DESIGN.md,
and ARCHITECTURE.md in this repo before doing anything else.

Tech stack: Next.js + Tailwind CSS (frontend), Firebase Auth + Firestore + Storage
(backend), deployed on Vercel.

Set up the project scaffold: Next.js app with Tailwind configured, Firebase SDK
connected (I'll provide config keys), and the folder structure matching the API
routes in API_DESIGN.md. Show me a checklist of what you're about to do before
you start.
```

## Stage 1 Prompt

```
Build Stage 1 from SPEC.md: authentication (email/password + OTP verification,
role selection for Candidate/Recruiter), candidate profile (skills, experience,
education, resume upload to Firebase Storage), job posting for recruiters, job
browsing with filters for candidates, the apply flow (one application per job,
enforced via the /api/applications/apply route from API_DESIGN.md), and the
application status tracker UI (e-commerce style horizontal progress bar) per
DATA_MODEL.md's applications schema.

Also write Firestore security rules matching the access pattern described in
API_DESIGN.md.

Show me the checklist before you start, and build it as a sequence of small,
testable pieces rather than all at once.
```

## C++ Matching Microservice Prompt (build alongside Stage 2)

```
I need a standalone C++ HTTP microservice, completely separate from the Next.js
app, in a folder called /match-service.

Use cpp-httplib (single header, https://github.com/yhirose/cpp-httplib) for the
HTTP server and nlohmann/json (single header,
https://github.com/nlohmann/json) for JSON parsing. Download or vendor both
headers into the project.

Build a single POST endpoint at /match on port 8080 that:
- Accepts a JSON body: { "candidateSkills": [string], "jobRequiredSkills": [string] }
- Normalizes both arrays (lowercase, trim)
- Computes matched skills (intersection) and missing skills (difference) using
  sets
- Calculates score = (matched count / required count) * 100
- Buckets the score: >70 = "Strong", 40-70 = "Partial", <70 = "Low"
- Returns JSON: { "matchScore": string, "matchedSkills": [string],
  "missingSkills": [string] }

Also give me the exact g++ command to compile it, and explain each part of the
matching logic clearly since this is my core algorithm/DSA component for a
college requirement — I need to be able to explain it, not just have it work.

Then update /api/match/calculate in the Next.js app to call this service at
http://localhost:8080/match instead of computing the score in JS.
```

**Important**: after Antigravity builds this, actually read through the matching logic yourself. This is your C++/DSA deliverable — you should be able to explain the intersection/scoring logic line by line if asked, since it's likely to be evaluated separately from the web app.

---

## Stage 2 Prompt

```
Now build Stage 2 from SPEC.md: the recruiter Kanban pipeline view, the skill
verification quiz system (timed, scenario-based questions, tab-focus-loss
detection, permanent verified badges per DATA_MODEL.md's quizzes and
quizAttempts collections), the ATS match score calculation
(/api/match/calculate from API_DESIGN.md, shown as Strong/Partial/Low bands,
not raw percentages), and quick-select rejection reason dropdowns at the
screening stage.
```

## Stage 3 Prompt

```
Now build Stage 3 from SPEC.md: interview scheduling (recruiter proposes slots,
candidate confirms, via /api/interview/propose and /api/interview/confirm),
the Interview Scheduled / Interview Completed stages added to both the Kanban
pipeline and candidate status tracker, mandatory rejection-reason text field
enforced only after interview-stage rejection, and the recruiter's
match-threshold filter toggle on their dashboard.
```

## Debugging Prompt (use when stuck)

```
This isn't working as expected: [describe exact behavior vs expected behavior].
Walk through the relevant code and explain what's happening before making any
changes, so I understand the fix.
```

## Tips
- Always ask it to explain what it built if you don't fully follow — this is how you actually learn instead of shipping code you can't defend in an interview.
- If Gemini 3.5 Flash (default model) gets stuck on the same bug after 2–3 attempts, switch that specific task to Claude via API key in Antigravity's model settings.
- Commit after every stage: `git add . && git commit -m "Stage X: [summary]" && git push`
