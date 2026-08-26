# Functional Specification

## User Roles
- **Candidate (Seeker)**: creates a profile, browses/applies to jobs, tracks application status
- **Recruiter**: posts jobs, reviews applicants, manages pipeline, schedules interviews

---

## Stage 1 — Core Loop (MVP)

### Authentication
- Email + password signup/login (Firebase Auth)
- OTP verification on signup (email or phone)
- Role selection at signup: Candidate or Recruiter

### Candidate Profile
- Name, contact info, skills (tag list), experience (list of roles/companies/dates), education, resume upload (PDF, stored in Firebase Storage)

### Job Posting (Recruiter)
- Title, description, required skills (tag list), location, salary range, employment type (full-time/internship/remote), experience level required
- Edit / close a listing

### Job Browsing (Candidate)
- List view of open jobs
- Filters: role/title keyword, location, experience level, remote/onsite

### Apply Flow
- One application per candidate per job (block duplicates)
- Application stores: candidate ID, job ID, timestamp, status

### Application Status Tracker
- Statuses: `Applied → Under Review → Shortlisted → Rejected`
- Candidate view: horizontal progress tracker (e-commerce style) on "My Applications" page
- Recruiter view: list of applicants per job, able to change status

**Stage 1 exit criteria**: A candidate can sign up, build a profile, apply to a job, and see status change. A recruiter can sign up, post a job, and see/manage applicants.

---

## Stage 2 — Recruiter Tools + Trust Layer

### Part A — Pipeline & Rejection Reasons
- Kanban pipeline: New → Screening → Interview → Offer/Rejected, reuses `/api/applications/update-status`
- Quick-select rejection reasons at screening stage (Skills mismatch / Experience level / Location / Position filled), optional
- Reason visible to candidate on their status tracker

### Part B — ATS Matching & Skill Verification
- ATS match score via the C++ microservice, shown as Strong/Partial/Low
- Skill verification quiz: timed, scenario-based, tab-focus-loss detection, permanent verified badges
- Auto-generated rejection reason using missing-skills output when a recruiter rejects without selecting a reason, clearly labeled as system-generated

### Part C — Resume Analysis & Recruiter Verification
- Resume analyzer: extract skills from uploaded resume PDF
- Recruiter/company verification via company email domain or registration document, shown as a "Verified Company" badge

### Part D — Deadlines, Notifications & Bucket List
- Application deadlines set by recruiter, visible to candidates
- Recruiter can extend/prepone deadlines
- Candidates can save jobs to a bucket list
- Notifications for saved jobs only, on deadline changes or approaching deadlines, neutral tone
- Missed section for saved jobs whose deadline passed without an application

---

## Stage 3 — Interview + Feedback Loop

- **Interview scheduling**: recruiter proposes date/time + mode (online/in-person), candidate confirms
- **Interview stage** added to Kanban pipeline and candidate's status tracker
- **Mandatory rejection reason** (free text, required) after interview-stage rejection
- **Recruiter match-threshold filter**: dashboard toggle to show only applicants above a chosen match band

---

## Stage 4 — Stretch Goals (optional, list as roadmap even if unbuilt)

- Employer email verification for work history
- Recruiter analytics dashboard (views, applications per listing)
- In-app / email notifications on status change

---

## Explicit Non-Goals for v1
- No live video calling (scheduling only, external link field)
- No AI-based resume fraud detection claims — verification is rule-based and badge-based only
- No payments / premium tiers
