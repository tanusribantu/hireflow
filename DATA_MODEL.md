# Data Model (Firestore)

Firestore is NoSQL — collections of documents, not relational tables. IDs below are document IDs unless noted.

## `users` collection
```
users/{userId}
  role: "candidate" | "recruiter"
  name: string
  email: string
  phone: string
  emailVerified: boolean
  phoneVerified: boolean
  createdAt: timestamp

  // candidate-only fields
  skills: [string]
  experience: [{ company, role, startDate, endDate }]
  education: [{ institution, degree, year }]
  resumeUrl: string          // Firebase Storage link
  verifiedSkills: [{ skill: string, verifiedAt: timestamp }]

  // recruiter-only fields
  companyName: string
```

## `jobs` collection
```
jobs/{jobId}
  recruiterId: string        // ref to users/{userId}
  title: string
  description: string
  requiredSkills: [string]
  location: string
  employmentType: "full-time" | "internship" | "remote"
  experienceLevel: string
  salaryRange: { min: number, max: number }
  status: "open" | "closed"
  createdAt: timestamp
```

## `applications` collection
```
applications/{applicationId}
  candidateId: string        // ref to users/{userId}
  jobId: string               // ref to jobs/{jobId}
  status: "Applied" | "Under Review" | "Shortlisted" | "Interview Scheduled" | "Interview Completed" | "Offer" | "Rejected"
  statusHistory: [{ status: string, timestamp: timestamp }]
  matchScore: "Strong" | "Partial" | "Low"
  rejectionReason: string     // optional at screening stage, required after interview stage
  appliedAt: timestamp

  // Stage 3 fields
  interview: {
    proposedSlots: [timestamp],
    confirmedSlot: timestamp,
    mode: "online" | "in-person",
    link: string
  }
```
> Enforce one application per (candidateId, jobId) pair at the application layer — check for an existing doc before creating a new one.

## `quizzes` collection (Stage 2)
```
quizzes/{skillName}
  questions: [{ prompt, options: [string], correctIndex: number, timeLimitSeconds: number }]
```

## `quizAttempts` subcollection
```
users/{userId}/quizAttempts/{attemptId}
  skill: string
  score: number
  passed: boolean
  tabFocusLossCount: number
  attemptedAt: timestamp
```

## Relationships summary
- One recruiter → many jobs
- One job → many applications
- One candidate → many applications (but max 1 per job)
- One candidate → many verified skills
