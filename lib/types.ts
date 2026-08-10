export type UserRole = "candidate" | "recruiter";

export interface UserProfile {
  role: UserRole;
  name: string;
  email: string;
  phone?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  skills?: string[];
  experience?: Array<{ company: string; role: string; startDate: string; endDate?: string }>;
  education?: Array<{ institution: string; degree: string; year: string }>;
  resumeUrl?: string;
  verifiedSkills?: Array<{ skill: string; verifiedAt: string }>;
  companyName?: string;
}

export interface JobPosting {
  recruiterId: string;
  title: string;
  description: string;
  requiredSkills: string[];
  location: string;
  employmentType: "full-time" | "internship" | "remote";
  experienceLevel: string;
  salaryRange: { min: number; max: number };
  status: "open" | "closed";
  createdAt: string;
}

export type ApplicationStatus =
  | "Applied"
  | "Under Review"
  | "Shortlisted"
  | "Interview Scheduled"
  | "Interview Completed"
  | "Offer"
  | "Rejected";

export interface ApplicationRecord {
  candidateId: string;
  jobId: string;
  status: ApplicationStatus;
  statusHistory: Array<{ status: string; timestamp: string }>;
  matchScore: "Strong" | "Partial" | "Low";
  rejectionReason?: string;
  appliedAt: string;
  interview?: {
    proposedSlots: string[];
    confirmedSlot?: string;
    mode?: "online" | "in-person";
    link?: string;
  };
}
