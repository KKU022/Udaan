import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import type {
  ApplicationRecord,
  ApplicationStatus,
  InternshipRecord,
  ResumeDocument,
  StudentProfile,
} from '../types';
import { isDeadlinePassed } from '../utils/formatters';
import { sanitizeIdSegment } from '../schemas/validation';
import { createNotification, logActivity } from './activityService';

export async function applyForInternship(params: {
  student: StudentProfile;
  internship: InternshipRecord;
  resume?: ResumeDocument | null;
  coverLetter: string;
}): Promise<string> {
  const { student, internship, resume, coverLetter } = params;

  if (internship.status !== 'published' || internship.approvalStatus !== 'approved') {
    throw new Error('This internship is not currently accepting applications.');
  }
  if (isDeadlinePassed(internship.deadline)) {
    throw new Error('The application deadline for this internship has passed.');
  }
  if (internship.minCgpa && internship.minCgpa > 0 && student.cgpa < internship.minCgpa) {
    throw new Error(`Minimum CGPA requirement is ${internship.minCgpa.toFixed(1)}. Your profile shows ${student.cgpa.toFixed(2)}.`);
  }

  const applicationId = `${internship.internshipId}_${student.uid}`;
  const path = `applications/${applicationId}`;

  try {
    const existingSnap = await getDoc(doc(db, 'applications', applicationId));
    if (existingSnap.exists()) {
      throw new Error('You have already applied for this internship.');
    }

    const nowIso = new Date().toISOString();
    const appDoc: Record<string, unknown> = {
      applicationId,
      internshipId: internship.internshipId,
      internshipTitle: internship.title.slice(0, 160),
      studentId: student.uid,
      studentName: student.fullName.slice(0, 120),
      studentEmail: student.email.slice(0, 200),
      studentCollege: student.college.slice(0, 180),
      studentBranch: student.branch.slice(0, 120),
      studentCgpa: Number(student.cgpa) || 0,
      studentSkills: (student.skills ?? []).slice(0, 30),
      companyId: internship.companyId,
      companyName: internship.companyName.slice(0, 160),
      resumeId: resume?.resumeId || student.resumeId || '',
      resumeName: resume?.fileName || student.resumeName || '',
      resumeUrl: resume?.downloadUrl || student.resumeUrl || '',
      coverLetter: coverLetter.trim().slice(0, 3000),
      status: 'Applied' as ApplicationStatus,
      statusHistory: [
        {
          status: 'Applied',
          changedBy: student.uid,
          actorRole: 'student',
          note: 'Application submitted by student',
          timestamp: nowIso,
        },
      ],
      appliedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'applications', applicationId), appDoc);
    batch.update(doc(db, 'internships', internship.internshipId), {
      applicantsCount: (internship.applicantsCount || 0) + 1,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();

    // Share resume access with this company so recruiter can preview/download it
    const activeResumeId = resume?.resumeId || student.resumeId;
    if (activeResumeId) {
      try {
        await updateDoc(doc(db, 'resumes', activeResumeId), {
          sharedWithCompanies: arrayUnion(internship.companyId),
        });
      } catch {
        // Non-blocking if resume is legacy or external
      }
    }

    await Promise.all([
      createNotification({
        recipientId: internship.companyId,
        senderId: student.uid,
        title: 'New internship application',
        message: `${student.fullName} (${student.college}) applied for ${internship.title}.`,
        type: 'application',
        relatedEntityId: applicationId,
        targetRoute: '/recruiter/applicants',
      }),
      createNotification({
        recipientId: student.uid,
        senderId: student.uid,
        title: 'Application submitted',
        message: `Your application for ${internship.title} at ${internship.companyName} has been received.`,
        type: 'application',
        relatedEntityId: applicationId,
        targetRoute: '/student/applications',
      }),
      logActivity({
        actorId: student.uid,
        actorName: student.fullName,
        actorRole: 'student',
        action: 'Submitted internship application',
        entityType: 'application',
        entityId: applicationId,
        details: `${internship.title} at ${internship.companyName}`,
      }),
    ]);

    return applicationId;
  } catch (error) {
    if (error instanceof Error && error.message.includes('already applied')) throw error;
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

function sortApplicationsDesc(items: ApplicationRecord[]): ApplicationRecord[] {
  return items.sort((a, b) => {
    const tA = a.appliedAt && typeof a.appliedAt === 'object' && 'toMillis' in a.appliedAt ? a.appliedAt.toMillis() : 0;
    const tB = b.appliedAt && typeof b.appliedAt === 'object' && 'toMillis' in b.appliedAt ? b.appliedAt.toMillis() : 0;
    return tB - tA;
  });
}

export async function listStudentApplications(studentId: string): Promise<ApplicationRecord[]> {
  try {
    const q = query(collection(db, 'applications'), where('studentId', '==', studentId));
    const snap = await getDocs(q);
    return sortApplicationsDesc(snap.docs.map((d) => d.data() as ApplicationRecord));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'applications/student');
  }
}

export async function listCompanyApplications(companyId: string): Promise<ApplicationRecord[]> {
  try {
    const q = query(collection(db, 'applications'), where('companyId', '==', companyId));
    const snap = await getDocs(q);
    return sortApplicationsDesc(snap.docs.map((d) => d.data() as ApplicationRecord));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'applications/company');
  }
}

export async function listAllApplications(): Promise<ApplicationRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'applications'));
    return sortApplicationsDesc(snap.docs.map((d) => d.data() as ApplicationRecord));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'applications/all');
  }
}

export async function withdrawStudentApplication(
  application: ApplicationRecord,
  studentId: string,
  studentName: string
): Promise<void> {
  if (['Selected', 'Rejected', 'Withdrawn'].includes(application.status)) {
    throw new Error('This application can no longer be withdrawn.');
  }
  const path = `applications/${application.applicationId}`;
  try {
    const nextHistory = [
      ...(application.statusHistory || []),
      {
        status: 'Withdrawn' as ApplicationStatus,
        changedBy: studentId,
        actorRole: 'student' as const,
        note: 'Withdrawn by student',
        timestamp: new Date().toISOString(),
      },
    ].slice(-25);

    await updateDoc(doc(db, 'applications', application.applicationId), {
      status: 'Withdrawn',
      statusHistory: nextHistory,
      updatedAt: serverTimestamp(),
    });

    await createNotification({
      recipientId: application.companyId,
      senderId: studentId,
      title: 'Application withdrawn',
      message: `${studentName} withdrew their application for ${application.internshipTitle}.`,
      type: 'status',
      relatedEntityId: application.applicationId,
      targetRoute: '/recruiter/applicants',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateApplicationStatusByRecruiter(params: {
  application: ApplicationRecord;
  recruiterId: string;
  recruiterName: string;
  nextStatus: Exclude<ApplicationStatus, 'Applied' | 'Withdrawn'>;
  note?: string;
  joiningInfo?: string;
}): Promise<void> {
  const { application, recruiterId, recruiterName, nextStatus, note, joiningInfo } = params;
  if (['Selected', 'Rejected', 'Withdrawn'].includes(application.status)) {
    throw new Error(`Cannot change status after application is marked ${application.status}.`);
  }

  const path = `applications/${application.applicationId}`;
  try {
    const nextHistory = [
      ...(application.statusHistory || []),
      {
        status: nextStatus,
        changedBy: recruiterId,
        actorRole: 'company' as const,
        note: note?.trim() || `Moved to ${nextStatus}`,
        timestamp: new Date().toISOString(),
      },
    ].slice(-25);

    const payload: Record<string, unknown> = {
      status: nextStatus,
      statusHistory: nextHistory,
      updatedAt: serverTimestamp(),
    };
    if (joiningInfo !== undefined) {
      payload.joiningInfo = joiningInfo.trim().slice(0, 1000);
    }

    await updateDoc(doc(db, 'applications', application.applicationId), payload);

    // Automatically initialize Internship Progress tracking when a candidate is Selected
    if (nextStatus === 'Selected') {
      const progressId = sanitizeIdSegment(`prog_${application.applicationId}`);
      const existingProgress = await getDoc(doc(db, 'internshipProgress', progressId));
      if (!existingProgress.exists()) {
        await setDoc(doc(db, 'internshipProgress', progressId), {
          progressId,
          applicationId: application.applicationId,
          studentId: application.studentId,
          studentName: application.studentName,
          companyId: application.companyId,
          companyName: application.companyName,
          internshipId: application.internshipId,
          internshipTitle: application.internshipTitle,
          mentorName: recruiterName.slice(0, 120),
          mentorEmail: '',
          startDate: '',
          endDate: '',
          progressStatus: 'Not Started',
          milestones: [
            { id: 'ms_1', title: 'Onboarding & Environment Setup', dueDate: '', completed: false },
            { id: 'ms_2', title: 'Mid-Internship Review', dueDate: '', completed: false },
            { id: 'ms_3', title: 'Final Deliverable & Sign-Off', dueDate: '', completed: false },
          ],
          weeklyUpdates: [],
          documents: [],
          completionConfirmed: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    const messageMap: Record<typeof nextStatus, string> = {
      'Under Review': `Your application for ${application.internshipTitle} at ${application.companyName} is now under review.`,
      Shortlisted: `Good news — you have been shortlisted for ${application.internshipTitle} at ${application.companyName}.`,
      'Interview Scheduled': `An interview stage has been initiated for ${application.internshipTitle} at ${application.companyName}.`,
      Selected: `Congratulations! You have been selected for ${application.internshipTitle} at ${application.companyName}.`,
      Rejected: `Thank you for applying. ${application.companyName} did not move forward for ${application.internshipTitle}.`,
    };

    await Promise.all([
      createNotification({
        recipientId: application.studentId,
        senderId: recruiterId,
        title: `Application ${nextStatus}`,
        message: messageMap[nextStatus],
        type: 'status',
        relatedEntityId: application.applicationId,
        targetRoute: nextStatus === 'Selected' ? '/student/progress' : '/student/applications',
      }),
      logActivity({
        actorId: recruiterId,
        actorName: recruiterName,
        actorRole: 'company',
        action: `Updated application to ${nextStatus}`,
        entityType: 'application',
        entityId: application.applicationId,
        details: `${application.studentName} — ${application.internshipTitle}`,
      }),
    ]);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
