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

- **Kanban pipeline**: New → Screening → Interview → Offer/Rejected (drag-and-drop or click-to-move)
- **Skill verification quiz**: timed (30–60s/question), scenario-based, tab-focus-loss detection, produces a permanent "Verified: [Skill]" badge with date
- **ATS match score**: keyword overlap between candidate profile/skills and job's required skills, shown as Strong/Partial/Low (not raw %)
- **Quick-select rejection reasons**: dropdown at screening stage (Skills mismatch / Experience level / Location / Position filled)

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
