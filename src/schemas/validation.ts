import { z } from 'zod';

const safeHttpUrl = z
  .string()
  .max(300)
  .refine(
    (val) => {
      if (!val || val.trim() === '') return true;
      try {
        const parsed = new URL(val);
        return parsed.protocol === 'https:' || parsed.protocol === 'http:';
      } catch {
        return false;
      }
    },
    { message: 'Enter a valid http:// or https:// URL' }
  );

export const studentRegistrationSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required').max(120),
  email: z.string().trim().email('Valid email required').max(200),
  password: z.string().min(8, 'Minimum 8 characters').max(100).optional(),
  phone: z.string().trim().max(30).optional().default(''),
  college: z.string().trim().min(2, 'College name is required').max(180),
  degree: z.string().trim().min(2, 'Degree/course is required').max(120),
  branch: z.string().trim().min(2, 'Branch is required').max(120),
  semester: z.coerce.number().int().min(1).max(12),
  graduationYear: z.coerce.number().int().min(2020).max(2035),
  cgpa: z.coerce.number().min(0).max(10).optional().default(0),
});

export const companyRegistrationSchema = z.object({
  companyName: z.string().trim().min(2, 'Company name is required').max(160),
  officialEmail: z.string().trim().email('Valid official email required').max(200),
  password: z.string().min(8, 'Minimum 8 characters').max(100).optional(),
  contactPerson: z.string().trim().min(2, 'Contact person is required').max(120),
  phone: z.string().trim().max(30).optional().default(''),
  website: safeHttpUrl.optional().default(''),
  industry: z.string().trim().min(2, 'Industry is required').max(120),
  companySize: z.string().trim().max(60).optional().default('51-200 employees'),
  headquarters: z.string().trim().max(160).optional().default(''),
  description: z.string().trim().min(10, 'Provide a concise company description').max(2500),
});

export const studentProfileSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional().default(''),
  college: z.string().trim().min(2).max(180),
  degree: z.string().trim().min(2).max(120),
  branch: z.string().trim().min(2).max(120),
  semester: z.coerce.number().int().min(1).max(12),
  graduationYear: z.coerce.number().int().min(2020).max(2035),
  cgpa: z.coerce.number().min(0).max(10),
  skillsText: z.string().max(1000).optional().default(''),
  interestsText: z.string().max(600).optional().default(''),
  certificationsText: z.string().max(1000).optional().default(''),
  linkedinUrl: safeHttpUrl.optional().default(''),
  githubUrl: safeHttpUrl.optional().default(''),
  portfolioUrl: safeHttpUrl.optional().default(''),
  about: z.string().trim().max(2000).optional().default(''),
  showContactToRecruiters: z.boolean().default(false),
});

export const internshipFormSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(160),
  category: z.string().trim().min(2, 'Select a category').max(80),
  description: z.string().trim().min(20, 'Description must be at least 20 characters').max(4000),
  responsibilities: z.string().trim().max(3000).optional().default(''),
  skillsText: z.string().trim().min(2, 'Enter at least one required skill').max(800),
  eligibilityText: z.string().trim().max(1000).optional().default(''),
  minCgpa: z.coerce.number().min(0).max(10).default(0),
  eligibleBranchesText: z.string().max(500).optional().default(''),
  duration: z.string().trim().min(1, 'Duration is required').max(60),
  isPaid: z.boolean().default(true),
  stipendAmount: z.coerce.number().min(0).max(1000000).default(0),
  location: z.string().trim().min(1, 'Location is required').max(140),
  workMode: z.enum(['Remote', 'Hybrid', 'On-site']),
  openings: z.coerce.number().int().min(1).max(500),
  deadline: z.string().trim().min(8, 'Application deadline is required').max(40),
  startDate: z.string().trim().max(40).optional().default(''),
  requiredDocumentsText: z.string().max(400).optional().default('Resume (PDF)'),
  contactInstructions: z.string().trim().max(1000).optional().default(''),
});

export const interviewFormSchema = z.object({
  applicationId: z.string().min(1, 'Select an applicant'),
  title: z.string().trim().min(2, 'Interview title is required').max(160),
  interviewDate: z.string().trim().min(8, 'Select an interview date').max(32),
  startTime: z.string().trim().min(4, 'Start time required').max(20),
  endTime: z.string().trim().min(4, 'End time required').max(20),
  mode: z.enum(['Online', 'In-Person', 'Phone']),
  meetingLink: safeHttpUrl.optional().default(''),
  venue: z.string().trim().max(300).optional().default(''),
  interviewer: z.string().trim().min(2, 'Interviewer name required').max(120),
  instructions: z.string().trim().max(1500).optional().default(''),
});

export const feedbackFormSchema = z.object({
  applicationId: z.string().min(1),
  stage: z.enum(['interview', 'midterm', 'final']),
  rating: z.coerce.number().int().min(1).max(5),
  strengths: z.string().trim().max(1200).optional().default(''),
  improvements: z.string().trim().max(1200).optional().default(''),
  comments: z.string().trim().min(5, 'Feedback comments are required').max(2000),
  recommendation: z.enum(['Strong Hire', 'Hire', 'Hold', 'No Hire', 'Completed']),
});

export function isSafeExternalUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function sanitizeIdSegment(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);
}
