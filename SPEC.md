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

### Part B — ATS Matching & Skill Verification (revised)

Skill evidence tiers — a candidate's skills carry different weight depending
on how well-evidenced they are:
- Self-reported: skill listed on profile only (lowest weight)
- Project-backed: skill tagged against a project in the candidate's profile
	(medium weight) — when adding a project, candidate selects which of their
	existing skills it demonstrates
- Quiz-verified: skill has a passed, timed, scenario-based quiz badge with a
	verified date (highest weight)

Required skill importance — recruiters mark each required skill on a job
posting as Must-have (missing this drops score significantly) or Nice-to-have
(missing this has a small effect).

Weighted match score: the C++ engine computes score using both the
candidate's skill evidence tier and the job's per-skill importance, not a
flat set overlap. Still shown to candidates as Strong/Partial/Low.

Recruiter-side ATS visibility: every applicant card in the recruiter's Kanban
pipeline shows that candidate's match score. A filter dropdown ("All / Low /
Partial / Strong") lets recruiters narrow the pipeline view by match tier.

Per-job ATS toggle: recruiters can enable or disable ATS matching for a
specific job posting at creation time (default: enabled). When disabled, no
score is calculated or shown for that posting.

System-generated rejection reason: if a recruiter rejects a candidate at
screening stage without selecting a manual reason, the system generates one
from the C++ engine's missing-skills output, weighted by importance (e.g.
"Missing required skill: TypeScript (must-have)"), clearly labeled as
system-generated.

No ML required: all of the above is deterministic, rule-based weighting and
comparison — no machine learning or external AI model is used or needed.

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
