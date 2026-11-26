import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import type { CompanyProfile, InternshipRecord, WorkMode } from '../types';
import { formatCurrencyINR } from '../utils/formatters';
import { sanitizeIdSegment } from '../schemas/validation';
import { createNotification, logActivity } from './activityService';

export async function listPublishedInternships(): Promise<InternshipRecord[]> {
  try {
    const q = query(
      collection(db, 'internships'),
      where('status', '==', 'published'),
      where('approvalStatus', '==', 'approved')
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => d.data() as InternshipRecord)
      .sort((a, b) => {
        const tA = a.createdAt && typeof a.createdAt === 'object' && 'toMillis' in a.createdAt ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt && typeof b.createdAt === 'object' && 'toMillis' in b.createdAt ? b.createdAt.toMillis() : 0;
        return tB - tA;
      });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'internships/published');
  }
}

export async function listCompanyInternships(companyId: string): Promise<InternshipRecord[]> {
  try {
    const q = query(collection(db, 'internships'), where('companyId', '==', companyId));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => d.data() as InternshipRecord)
      .sort((a, b) => {
        const tA = a.createdAt && typeof a.createdAt === 'object' && 'toMillis' in a.createdAt ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt && typeof b.createdAt === 'object' && 'toMillis' in b.createdAt ? b.createdAt.toMillis() : 0;
        return tB - tA;
      });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'internships/company');
  }
}

export async function listAllInternships(): Promise<InternshipRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'internships'));
    return snap.docs
      .map((d) => d.data() as InternshipRecord)
      .sort((a, b) => {
        const tA = a.createdAt && typeof a.createdAt === 'object' && 'toMillis' in a.createdAt ? a.createdAt.toMillis() : 0;
        const tB = b.createdAt && typeof b.createdAt === 'object' && 'toMillis' in b.createdAt ? b.createdAt.toMillis() : 0;
        return tB - tA;
      });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'internships/all');
  }
}

export async function getInternshipById(internshipId: string): Promise<InternshipRecord | null> {
  const path = `internships/${internshipId}`;
  try {
    const snap = await getDoc(doc(db, 'internships', internshipId));
    return snap.exists() ? (snap.data() as InternshipRecord) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export interface CreateInternshipInput {
  title: string;
  category: string;
  description: string;
  responsibilities?: string;
  skills: string[];
  eligibilityText?: string;
  minCgpa?: number;
  eligibleBranches?: string[];
  duration: string;
  isPaid: boolean;
  stipendAmount: number;
  location: string;
  workMode: WorkMode;
  openings: number;
  deadline: string;
  startDate?: string;
  requiredDocuments?: string[];
  contactInstructions?: string;
  submitForApproval: boolean;
}

export async function createInternship(
  company: CompanyProfile,
  input: CreateInternshipInput
): Promise<string> {
  if (company.verificationStatus !== 'verified') {
    throw new Error('Your company account must be verified by an administrator before posting internships.');
  }

  const internshipId = sanitizeIdSegment(`int_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const path = `internships/${internshipId}`;
  const stipendAmount = input.isPaid ? Math.max(0, Number(input.stipendAmount) || 0) : 0;
  const status = input.submitForApproval ? 'pending_approval' : 'draft';
  const approvalStatus = input.submitForApproval ? 'pending' : 'draft';

  try {
    await setDoc(doc(db, 'internships', internshipId), {
      internshipId,
      companyId: company.uid,
      companyName: company.companyName.slice(0, 160),
      companyIndustry: company.industry.slice(0, 120),
      title: input.title.trim().slice(0, 160),
      category: input.category.trim().slice(0, 80),
      description: input.description.trim().slice(0, 4000),
      responsibilities: (input.responsibilities ?? '').trim().slice(0, 3000),
      skills: input.skills.slice(0, 20),
      eligibilityText: (input.eligibilityText ?? '').trim().slice(0, 1000),
      minCgpa: Math.min(10, Math.max(0, Number(input.minCgpa) || 0)),
      eligibleBranches: (input.eligibleBranches ?? []).slice(0, 15),
      duration: input.duration.trim().slice(0, 60),
      isPaid: Boolean(input.isPaid),
      stipendAmount,
      stipendDisplay: input.isPaid ? formatCurrencyINR(stipendAmount) : 'Unpaid',
      location: input.location.trim().slice(0, 140),
      workMode: input.workMode,
      openings: Math.max(1, Number(input.openings) || 1),
      deadline: input.deadline.trim().slice(0, 40),
      startDate: (input.startDate ?? '').trim().slice(0, 40),
      requiredDocuments: (input.requiredDocuments ?? ['Resume (PDF)']).slice(0, 10),
      contactInstructions: (input.contactInstructions ?? '').trim().slice(0, 1000),
      status,
      approvalStatus,
      applicantsCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (input.submitForApproval) {
      await createNotification({
        recipientId: 'admin_broadcast',
        senderId: company.uid,
        title: 'Internship pending approval',
        message: `${company.companyName} submitted "${input.title.trim()}" for review.`,
        type: 'approval',
        relatedEntityId: internshipId,
        targetRoute: '/admin/approvals',
      });
    }

    await logActivity({
      actorId: company.uid,
      actorName: company.companyName,
      actorRole: 'company',
      action: input.submitForApproval ? 'Submitted internship for approval' : 'Saved internship draft',
      entityType: 'internship',
      entityId: internshipId,
      details: input.title.trim(),
    });

    return internshipId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateInternshipByCompany(
  company: CompanyProfile,
  internshipId: string,
  input: CreateInternshipInput
): Promise<void> {
  const path = `internships/${internshipId}`;
  const stipendAmount = input.isPaid ? Math.max(0, Number(input.stipendAmount) || 0) : 0;
  const status = input.submitForApproval ? 'pending_approval' : 'draft';
  const approvalStatus = input.submitForApproval ? 'pending' : 'draft';

  try {
    await updateDoc(doc(db, 'internships', internshipId), {
      title: input.title.trim().slice(0, 160),
      category: input.category.trim().slice(0, 80),
      description: input.description.trim().slice(0, 4000),
      responsibilities: (input.responsibilities ?? '').trim().slice(0, 3000),
      skills: input.skills.slice(0, 20),
      eligibilityText: (input.eligibilityText ?? '').trim().slice(0, 1000),
      minCgpa: Math.min(10, Math.max(0, Number(input.minCgpa) || 0)),
      eligibleBranches: (input.eligibleBranches ?? []).slice(0, 15),
      duration: input.duration.trim().slice(0, 60),
      isPaid: Boolean(input.isPaid),
      stipendAmount,
      stipendDisplay: input.isPaid ? formatCurrencyINR(stipendAmount) : 'Unpaid',
      location: input.location.trim().slice(0, 140),
      workMode: input.workMode,
      openings: Math.max(1, Number(input.openings) || 1),
      deadline: input.deadline.trim().slice(0, 40),
      startDate: (input.startDate ?? '').trim().slice(0, 40),
      requiredDocuments: (input.requiredDocuments ?? ['Resume (PDF)']).slice(0, 10),
      contactInstructions: (input.contactInstructions ?? '').trim().slice(0, 1000),
      status,
      approvalStatus,
      updatedAt: serverTimestamp(),
    });

    if (input.submitForApproval) {
      await createNotification({
        recipientId: 'admin_broadcast',
        senderId: company.uid,
        title: 'Internship resubmitted for approval',
        message: `${company.companyName} updated and submitted "${input.title.trim()}" for approval.`,
        type: 'approval',
        relatedEntityId: internshipId,
        targetRoute: '/admin/approvals',
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function closeInternshipPosting(
  actorId: string,
  actorName: string,
  actorRole: 'company' | 'admin',
  internshipId: string,
  title: string
): Promise<void> {
  const path = `internships/${internshipId}`;
  try {
    await updateDoc(doc(db, 'internships', internshipId), {
      status: 'closed',
      updatedAt: serverTimestamp(),
    });
    await logActivity({
      actorId,
      actorName,
      actorRole,
      action: 'Closed internship posting',
      entityType: 'internship',
      entityId: internshipId,
      details: title,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteDraftInternship(internshipId: string): Promise<void> {
  const path = `internships/${internshipId}`;
  try {
    await deleteDoc(doc(db, 'internships', internshipId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function adminReviewInternship(params: {
  adminId: string;
  adminName: string;
  internship: InternshipRecord;
  decision: 'approved' | 'rejected' | 'closed';
  reason?: string;
}): Promise<void> {
  const { adminId, adminName, internship, decision, reason } = params;
  const path = `internships/${internship.internshipId}`;
  try {
    const nextStatus =
      decision === 'approved' ? 'published' : decision === 'rejected' ? 'rejected' : 'closed';
    const nextApproval =
      decision === 'approved' ? 'approved' : decision === 'rejected' ? 'rejected' : internship.approvalStatus;

    await updateDoc(doc(db, 'internships', internship.internshipId), {
      status: nextStatus,
      approvalStatus: nextApproval,
      rejectionReason: reason ? reason.trim().slice(0, 600) : '',
      updatedAt: serverTimestamp(),
    });

    await createNotification({
      recipientId: internship.companyId,
      senderId: adminId,
      title:
        decision === 'approved'
          ? 'Internship approved and published'
          : decision === 'rejected'
          ? 'Internship posting rejected'
          : 'Internship closed by administrator',
      message:
        decision === 'approved'
          ? `"${internship.title}" is now live in student discovery.`
          : `"${internship.title}" was marked ${decision}.${reason ? ` Note: ${reason}` : ''}`,
      type: 'approval',
      relatedEntityId: internship.internshipId,
      targetRoute: '/recruiter/internships',
    });

    await logActivity({
      actorId: adminId,
      actorName: adminName,
      actorRole: 'admin',
      action: `Internship ${decision}`,
      entityType: 'internship',
      entityId: internship.internshipId,
      details: `${internship.title} (${internship.companyName})`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
