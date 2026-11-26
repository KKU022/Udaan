import type { Timestamp } from 'firebase/firestore';

export type UserRole = 'student' | 'company' | 'admin';
export type AccountStatus = 'active' | 'deactivated' | 'suspended';
export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'suspended';
export type WorkMode = 'Remote' | 'Hybrid' | 'On-site';

export type InternshipStatus =
  | 'draft'
  | 'pending_approval'
  | 'published'
  | 'rejected'
  | 'closed'
  | 'expired';

export type ApprovalStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export type ApplicationStatus =
  | 'Applied'
  | 'Under Review'
  | 'Shortlisted'
  | 'Interview Scheduled'
  | 'Selected'
  | 'Rejected'
  | 'Withdrawn';

export type InterviewMode = 'Online' | 'In-Person' | 'Phone';
export type InterviewStatus = 'Scheduled' | 'Completed' | 'Rescheduled' | 'Cancelled';
export type ProgressStatus = 'Not Started' | 'In Progress' | 'Completed' | 'Incomplete';
export type NotificationType =
  | 'application'
  | 'status'
  | 'interview'
  | 'verification'
  | 'approval'
  | 'progress'
  | 'system';

export type FirestoreTimestamp = Timestamp | Date | string | null;

export interface UserRecord {
  uid: string;
  fullName: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  emailVerified: boolean;
  photoURL?: string;
  isDemo?: boolean;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface ProjectItem {
  title: string;
  description: string;
  techStack: string;
  role?: string;
  githubUrl?: string;
  liveUrl?: string;
  imageUrl?: string;
  link?: string;
}

export interface ExperienceItem {
  role: string;
  organization: string;
  duration: string;
  summary: string;
}

export interface AchievementItem {
  title: string;
  category: 'Hackathon' | 'Certification' | 'Award' | 'Competition' | 'Academic';
  issuer?: string;
  date?: string;
  description?: string;
}

export interface CertificateItem {
  title: string;
  issuer: string;
  date?: string;
  credentialUrl?: string;
}

export interface SkillGroups {
  languages: string[];
  frameworks: string[];
  tools: string[];
  softSkills: string[];
}

export interface StudentSocialLinks {
  linkedin?: string;
  github?: string;
  portfolio?: string;
  personalWebsite?: string;
  leetcode?: string;
  hackerrank?: string;
  codechef?: string;
  gfg?: string;
}

export interface StudentProfile {
  uid: string;
  fullName: string;
  headline?: string;
  email: string;
  phone?: string;
  college: string;
  degree: string;
  branch: string;
  semester: number;
  graduationYear: number;
  cgpa: number;
  skills: string[];
  skillGroups?: SkillGroups;
  interests?: string[];
  projects?: ProjectItem[];
  certifications?: string[];
  certificates?: CertificateItem[];
  achievements?: AchievementItem[];
  experience?: ExperienceItem[];
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  socialLinks?: StudentSocialLinks;
  publicSlug?: string;
  isPassportPublic?: boolean;
  about?: string;
  photoURL?: string;
  resumeId?: string;
  resumeName?: string;
  resumeUrl?: string;
  resumeUpdatedAt?: string;
  showContactToRecruiters?: boolean;
  profileCompletion: number;
  isDemo?: boolean;
  updatedAt: FirestoreTimestamp;
}

export interface StudentPublicProfile {
  uid: string;
  fullName: string;
  headline?: string;
  college: string;
  degree: string;
  branch: string;
  semester: number;
  graduationYear: number;
  cgpa: number;
  skills: string[];
  skillGroups?: SkillGroups;
  interests?: string[];
  projects?: ProjectItem[];
  certifications?: string[];
  certificates?: CertificateItem[];
  achievements?: AchievementItem[];
  experience?: ExperienceItem[];
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  socialLinks?: StudentSocialLinks;
  publicSlug?: string;
  isPassportPublic?: boolean;
  about?: string;
  photoURL?: string;
  profileCompletion: number;
  isDemo?: boolean;
  updatedAt: FirestoreTimestamp;
}

export interface CareerPassportRecord {
  slug: string;
  studentId: string;
  isPublic: boolean;
  fullName: string;
  headline?: string;
  college: string;
  degree: string;
  branch: string;
  graduationYear: number;
  cgpa: number;
  about?: string;
  photoURL?: string;
  skills: string[];
  skillGroups?: SkillGroups;
  projects?: ProjectItem[];
  experience?: ExperienceItem[];
  achievements?: AchievementItem[];
  certificates?: CertificateItem[];
  socialLinks?: StudentSocialLinks;
  resumeAvailable: boolean;
  profileCompletion: number;
  isDemo?: boolean;
  updatedAt: FirestoreTimestamp;
}

export interface ResumeDocument {
  resumeId: string;
  studentId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath?: string;
  downloadUrl?: string;
  dataUrl?: string;
  sharedWithCompanies: string[];
  isDemo?: boolean;
  uploadedAt: FirestoreTimestamp;
}

export interface CompanyProfile {
  uid: string;
  companyName: string;
  officialEmail: string;
  contactPerson: string;
  phone?: string;
  website?: string;
  industry: string;
  companySize?: string;
  headquarters?: string;
  description?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  twitterUrl?: string;
  instagramUrl?: string;
  logoText?: string;
  verificationStatus: VerificationStatus;
  verificationReason?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  isDemo?: boolean;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface InternshipRecord {
  internshipId: string;
  companyId: string;
  companyName: string;
  companyIndustry?: string;
  title: string;
  category: string;
  description: string;
  responsibilities?: string;
  skills: string[];
  eligibilityText?: string;
  minCgpa?: number;
  eligibleBranches?: string[];
  eligibleSemesters?: number[];
  eligibleGradYears?: number[];
  duration: string;
  isPaid: boolean;
  stipendAmount: number;
  stipendDisplay: string;
  location: string;
  workMode: WorkMode;
  openings: number;
  deadline: string;
  startDate?: string;
  requiredDocuments?: string[];
  contactInstructions?: string;
  status: InternshipStatus;
  approvalStatus: ApprovalStatus;
  rejectionReason?: string;
  applicantsCount: number;
  isDemo?: boolean;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface ApplicationStatusEvent {
  status: ApplicationStatus;
  changedBy: string;
  actorRole: UserRole;
  note?: string;
  timestamp: string;
}

export interface ApplicationRecord {
  applicationId: string;
  internshipId: string;
  internshipTitle: string;
  studentId: string;
  studentName: string;
  studentEmail?: string;
  studentCollege?: string;
  studentBranch?: string;
  studentCgpa?: number;
  studentSkills?: string[];
  companyId: string;
  companyName: string;
  resumeId?: string;
  resumeName?: string;
  resumeUrl?: string;
  coverLetter?: string;
  status: ApplicationStatus;
  statusHistory: ApplicationStatusEvent[];
  joiningInfo?: string;
  isDemo?: boolean;
  appliedAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface InterviewRecord {
  interviewId: string;
  applicationId: string;
  studentId: string;
  studentName: string;
  companyId: string;
  companyName: string;
  internshipId: string;
  internshipTitle: string;
  title: string;
  interviewDate: string;
  startTime: string;
  endTime: string;
  mode: InterviewMode;
  meetingLink?: string;
  venue?: string;
  interviewer: string;
  instructions?: string;
  status: InterviewStatus;
  isDemo?: boolean;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface NotificationRecord {
  notificationId: string;
  recipientId: string;
  senderId: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedEntityId?: string;
  targetRoute?: string;
  read: boolean;
  isDemo?: boolean;
  createdAt: FirestoreTimestamp;
}

export interface SavedInternshipRecord {
  savedId: string;
  studentId: string;
  internshipId: string;
  internshipTitle: string;
  companyName: string;
  location?: string;
  workMode?: string;
  stipendDisplay?: string;
  deadline?: string;
  savedAt: FirestoreTimestamp;
}

export interface ProgressMilestone {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
}

export interface WeeklyProgressUpdate {
  id: string;
  weekLabel: string;
  summary: string;
  submittedAt: string;
}

export interface ProgressDocument {
  id: string;
  title: string;
  referenceUrl: string;
  submittedAt: string;
}

export interface InternshipProgressRecord {
  progressId: string;
  applicationId: string;
  studentId: string;
  studentName: string;
  companyId: string;
  companyName: string;
  internshipId: string;
  internshipTitle: string;
  mentorName?: string;
  mentorEmail?: string;
  startDate?: string;
  endDate?: string;
  actualCompletionDate?: string;
  progressStatus: ProgressStatus;
  milestones: ProgressMilestone[];
  weeklyUpdates: WeeklyProgressUpdate[];
  documents: ProgressDocument[];
  completionConfirmed: boolean;
  isDemo?: boolean;
  createdAt: FirestoreTimestamp;
  updatedAt: FirestoreTimestamp;
}

export interface FeedbackRecord {
  feedbackId: string;
  applicationId: string;
  internshipId: string;
  internshipTitle?: string;
  studentId: string;
  studentName?: string;
  companyId: string;
  companyName?: string;
  stage: 'interview' | 'midterm' | 'final';
  rating: number;
  strengths?: string;
  improvements?: string;
  comments: string;
  recommendation: 'Strong Hire' | 'Hire' | 'Hold' | 'No Hire' | 'Completed';
  isDemo?: boolean;
  submittedAt: FirestoreTimestamp;
}

export interface ActivityLogRecord {
  activityId: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  details?: string;
  isDemo?: boolean;
  timestamp: FirestoreTimestamp;
}

export interface PlatformStatsRecord {
  studentsCount: number;
  verifiedCompaniesCount: number;
  activeInternshipsCount: number;
  placementsCount: number;
  demoRecordsIncluded?: boolean;
  updatedAt: FirestoreTimestamp;
}

export interface SystemSettingsRecord {
  institutionName: string;
  academicYear: string;
  institutionWebsite?: string;
  institutionLinkedin?: string;
  contactEmail?: string;
  contactPhone?: string;
  requireCompanyVerification: boolean;
  requireInternshipApproval: boolean;
  maxActiveApplicationsPerStudent?: number;
  allowWithdrawBeforeInterview?: boolean;
  updatedAt: FirestoreTimestamp;
}
