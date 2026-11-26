import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import type {
  ApplicationRecord,
  FeedbackRecord,
  InternshipProgressRecord,
  InterviewMode,
  InterviewRecord,
  InterviewStatus,
  ProgressDocument,
  ProgressMilestone,
  ProgressStatus,
  WeeklyProgressUpdate,
} from '../types';
import { sanitizeIdSegment } from '../schemas/validation';
import { createNotification, logActivity } from './activityService';
import { updateApplicationStatusByRecruiter } from './applicationService';

export async function scheduleInterview(params: {
  application: ApplicationRecord;
  recruiterId: string;
  recruiterName: string;
  title: string;
  interviewDate: string;
  startTime: string;
  endTime: string;
  mode: InterviewMode;
  meetingLink?: string;
  venue?: string;
  interviewer: string;
  instructions?: string;
}): Promise<string> {
  const { application, recruiterId, recruiterName } = params;
  if (params.startTime >= params.endTime) {
    throw new Error('Interview end time must be after start time.');
  }

  const interviewId = sanitizeIdSegment(`ivw_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const path = `interviews/${interviewId}`;

  try {
    await setDoc(doc(db, 'interviews', interviewId), {
      interviewId,
      applicationId: application.applicationId,
      studentId: application.studentId,
      studentName: application.studentName.slice(0, 120),
      companyId: application.companyId,
      companyName: application.companyName.slice(0, 160),
      internshipId: application.internshipId,
      internshipTitle: application.internshipTitle.slice(0, 160),
      title: params.title.trim().slice(0, 160),
      interviewDate: params.interviewDate.trim().slice(0, 32),
      startTime: params.startTime.trim().slice(0, 20),
      endTime: params.endTime.trim().slice(0, 20),
      mode: params.mode,
      meetingLink: (params.meetingLink ?? '').trim().slice(0, 500),
      venue: (params.venue ?? '').trim().slice(0, 300),
      interviewer: params.interviewer.trim().slice(0, 120),
      instructions: (params.instructions ?? '').trim().slice(0, 1500),
      status: 'Scheduled' as InterviewStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (!['Selected', 'Rejected', 'Withdrawn', 'Interview Scheduled'].includes(application.status)) {
      await updateApplicationStatusByRecruiter({
        application,
        recruiterId,
        recruiterName,
        nextStatus: 'Interview Scheduled',
        note: `Interview "${params.title.trim()}" scheduled on ${params.interviewDate} at ${params.startTime}`,
      });
    }

    await createNotification({
      recipientId: application.studentId,
      senderId: recruiterId,
      title: 'Interview scheduled',
      message: `${application.companyName} scheduled "${params.title.trim()}" on ${params.interviewDate} (${params.startTime}–${params.endTime}).`,
      type: 'interview',
      relatedEntityId: interviewId,
      targetRoute: '/student/interviews',
    });

    await logActivity({
      actorId: recruiterId,
      actorName: recruiterName,
      actorRole: 'company',
      action: 'Scheduled interview',
      entityType: 'interview',
      entityId: interviewId,
      details: `${application.studentName} — ${params.interviewDate} ${params.startTime}`,
    });

    return interviewId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateInterviewStatus(params: {
  interview: InterviewRecord;
  recruiterId: string;
  status: InterviewStatus;
  interviewDate?: string;
  startTime?: string;
  endTime?: string;
  meetingLink?: string;
}): Promise<void> {
  const { interview, recruiterId, status } = params;
  const path = `interviews/${interview.interviewId}`;
  try {
    const payload: Record<string, unknown> = {
      status,
      updatedAt: serverTimestamp(),
    };
    if (params.interviewDate) payload.interviewDate = params.interviewDate.slice(0, 32);
    if (params.startTime) payload.startTime = params.startTime.slice(0, 20);
    if (params.endTime) payload.endTime = params.endTime.slice(0, 20);
    if (params.meetingLink !== undefined) payload.meetingLink = params.meetingLink.slice(0, 500);

    await updateDoc(doc(db, 'interviews', interview.interviewId), payload);

    await createNotification({
      recipientId: interview.studentId,
      senderId: recruiterId,
      title: `Interview ${status.toLowerCase()}`,
      message: `Your interview "${interview.title}" with ${interview.companyName} is now marked ${status}.`,
      type: 'interview',
      relatedEntityId: interview.interviewId,
      targetRoute: '/student/interviews',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

function sortByDateAsc(items: InterviewRecord[]): InterviewRecord[] {
  return items.sort((a, b) => a.interviewDate.localeCompare(b.interviewDate));
}

export async function listStudentInterviews(studentId: string): Promise<InterviewRecord[]> {
  try {
    const q = query(collection(db, 'interviews'), where('studentId', '==', studentId));
    const snap = await getDocs(q);
    return sortByDateAsc(snap.docs.map((d) => d.data() as InterviewRecord));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'interviews/student');
  }
}

export async function listCompanyInterviews(companyId: string): Promise<InterviewRecord[]> {
  try {
    const q = query(collection(db, 'interviews'), where('companyId', '==', companyId));
    const snap = await getDocs(q);
    return sortByDateAsc(snap.docs.map((d) => d.data() as InterviewRecord));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'interviews/company');
  }
}

export async function listAllInterviews(): Promise<InterviewRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'interviews'));
    return sortByDateAsc(snap.docs.map((d) => d.data() as InterviewRecord));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'interviews/all');
  }
}

// =========================================================================
// Internship Progress
// =========================================================================

export async function listStudentProgress(studentId: string): Promise<InternshipProgressRecord[]> {
  try {
    const q = query(collection(db, 'internshipProgress'), where('studentId', '==', studentId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as InternshipProgressRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'internshipProgress/student');
  }
}

export async function listCompanyProgress(companyId: string): Promise<InternshipProgressRecord[]> {
  try {
    const q = query(collection(db, 'internshipProgress'), where('companyId', '==', companyId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as InternshipProgressRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'internshipProgress/company');
  }
}

export async function listAllProgress(): Promise<InternshipProgressRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'internshipProgress'));
    return snap.docs.map((d) => d.data() as InternshipProgressRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'internshipProgress/all');
  }
}

export async function updateProgressByCompany(params: {
  progress: InternshipProgressRecord;
  recruiterId: string;
  mentorName?: string;
  mentorEmail?: string;
  startDate?: string;
  endDate?: string;
  actualCompletionDate?: string;
  progressStatus: ProgressStatus;
  milestones: ProgressMilestone[];
  completionConfirmed: boolean;
}): Promise<void> {
  const { progress, recruiterId } = params;
  const path = `internshipProgress/${progress.progressId}`;
  try {
    await updateDoc(doc(db, 'internshipProgress', progress.progressId), {
      mentorName: (params.mentorName ?? '').trim().slice(0, 120),
      mentorEmail: (params.mentorEmail ?? '').trim().slice(0, 200),
      startDate: (params.startDate ?? '').trim().slice(0, 40),
      endDate: (params.endDate ?? '').trim().slice(0, 40),
      actualCompletionDate: (params.actualCompletionDate ?? '').trim().slice(0, 40),
      progressStatus: params.progressStatus,
      milestones: params.milestones.slice(0, 20),
      completionConfirmed: Boolean(params.completionConfirmed),
      updatedAt: serverTimestamp(),
    });

    await createNotification({
      recipientId: progress.studentId,
      senderId: recruiterId,
      title: params.completionConfirmed ? 'Internship completion confirmed' : 'Internship progress updated',
      message: params.completionConfirmed
        ? `${progress.companyName} confirmed completion of your ${progress.internshipTitle} internship.`
        : `${progress.companyName} updated your milestones and status (${params.progressStatus}).`,
      type: 'progress',
      relatedEntityId: progress.progressId,
      targetRoute: '/student/progress',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function addStudentWeeklyUpdate(
  progress: InternshipProgressRecord,
  weekLabel: string,
  summary: string
): Promise<void> {
  const path = `internshipProgress/${progress.progressId}`;
  try {
    const nextUpdate: WeeklyProgressUpdate = {
      id: sanitizeIdSegment(`wk_${Date.now()}`),
      weekLabel: weekLabel.trim().slice(0, 60),
      summary: summary.trim().slice(0, 1200),
      submittedAt: new Date().toISOString(),
    };
    const weeklyUpdates = [...(progress.weeklyUpdates || []), nextUpdate].slice(-30);
    await updateDoc(doc(db, 'internshipProgress', progress.progressId), {
      weeklyUpdates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function addStudentProgressDocument(
  progress: InternshipProgressRecord,
  title: string,
  referenceUrl: string
): Promise<void> {
  const path = `internshipProgress/${progress.progressId}`;
  try {
    const nextDoc: ProgressDocument = {
      id: sanitizeIdSegment(`doc_${Date.now()}`),
      title: title.trim().slice(0, 120),
      referenceUrl: referenceUrl.trim().slice(0, 500),
      submittedAt: new Date().toISOString(),
    };
    const documents = [...(progress.documents || []), nextDoc].slice(-15);
    await updateDoc(doc(db, 'internshipProgress', progress.progressId), {
      documents,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// =========================================================================
// Feedback
// =========================================================================

export async function submitRecruiterFeedback(params: {
  application: ApplicationRecord;
  recruiterId: string;
  stage: 'interview' | 'midterm' | 'final';
  rating: number;
  strengths?: string;
  improvements?: string;
  comments: string;
  recommendation: 'Strong Hire' | 'Hire' | 'Hold' | 'No Hire' | 'Completed';
}): Promise<string> {
  const feedbackId = sanitizeIdSegment(`fbk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const path = `feedback/${feedbackId}`;
  try {
    await setDoc(doc(db, 'feedback', feedbackId), {
      feedbackId,
      applicationId: params.application.applicationId,
      internshipId: params.application.internshipId,
      internshipTitle: params.application.internshipTitle.slice(0, 160),
      studentId: params.application.studentId,
      studentName: params.application.studentName.slice(0, 120),
      companyId: params.application.companyId,
      companyName: params.application.companyName.slice(0, 160),
      stage: params.stage,
      rating: Math.min(5, Math.max(1, Number(params.rating) || 4)),
      strengths: (params.strengths ?? '').trim().slice(0, 1200),
      improvements: (params.improvements ?? '').trim().slice(0, 1200),
      comments: params.comments.trim().slice(0, 2000),
      recommendation: params.recommendation,
      submittedAt: serverTimestamp(),
    });

    await createNotification({
      recipientId: params.application.studentId,
      senderId: params.recruiterId,
      title: 'New recruiter evaluation shared',
      message: `${params.application.companyName} recorded ${params.stage} feedback for ${params.application.internshipTitle}.`,
      type: 'progress',
      relatedEntityId: feedbackId,
      targetRoute: '/student/progress',
    });

    return feedbackId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function listCompanyFeedback(companyId: string): Promise<FeedbackRecord[]> {
  try {
    const q = query(collection(db, 'feedback'), where('companyId', '==', companyId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as FeedbackRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'feedback/company');
  }
}

export async function listStudentFeedback(studentId: string): Promise<FeedbackRecord[]> {
  try {
    const q = query(collection(db, 'feedback'), where('studentId', '==', studentId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as FeedbackRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'feedback/student');
  }
}

export async function listAllFeedback(): Promise<FeedbackRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'feedback'));
    return snap.docs.map((d) => d.data() as FeedbackRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'feedback/all');
  }
}
