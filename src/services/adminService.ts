import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import type {
  AccountStatus,
  ActivityLogRecord,
  CompanyProfile,
  PlatformStatsRecord,
  StudentProfile,
  SystemSettingsRecord,
  UserRecord,
  VerificationStatus,
} from '../types';
import { createNotification, logActivity } from './activityService';

export async function listAllUsers(): Promise<UserRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    return snap.docs.map((d) => d.data() as UserRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
  }
}

export async function listAllStudentProfiles(): Promise<StudentProfile[]> {
  try {
    const snap = await getDocs(collection(db, 'studentProfiles'));
    return snap.docs.map((d) => d.data() as StudentProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'studentProfiles');
  }
}

export async function listAllCompanyProfiles(): Promise<CompanyProfile[]> {
  try {
    const snap = await getDocs(collection(db, 'companyProfiles'));
    return snap.docs.map((d) => d.data() as CompanyProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'companyProfiles');
  }
}

export async function listActivityLogs(): Promise<ActivityLogRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'activityLogs'));
    return snap.docs
      .map((d) => d.data() as ActivityLogRecord)
      .sort((a, b) => {
        const tA = a.timestamp && typeof a.timestamp === 'object' && 'toMillis' in a.timestamp ? a.timestamp.toMillis() : 0;
        const tB = b.timestamp && typeof b.timestamp === 'object' && 'toMillis' in b.timestamp ? b.timestamp.toMillis() : 0;
        return tB - tA;
      });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'activityLogs');
  }
}

export async function updateUserAccountStatus(params: {
  adminId: string;
  adminName: string;
  targetUser: UserRecord;
  accountStatus: AccountStatus;
}): Promise<void> {
  const { adminId, adminName, targetUser, accountStatus } = params;
  const path = `users/${targetUser.uid}`;
  try {
    await updateDoc(doc(db, 'users', targetUser.uid), {
      accountStatus,
      updatedAt: serverTimestamp(),
    });
    await logActivity({
      actorId: adminId,
      actorName: adminName,
      actorRole: 'admin',
      action: `Account status changed to ${accountStatus}`,
      entityType: 'user',
      entityId: targetUser.uid,
      details: `${targetUser.fullName} (${targetUser.role})`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function reviewCompanyVerification(params: {
  adminId: string;
  adminName: string;
  company: CompanyProfile;
  status: VerificationStatus;
  reason?: string;
}): Promise<void> {
  const { adminId, adminName, company, status, reason } = params;
  const path = `companyProfiles/${company.uid}`;
  try {
    const batch = writeBatch(db);
    const verifiedAt = status === 'verified' ? new Date().toISOString() : '';

    batch.update(doc(db, 'companyProfiles', company.uid), {
      verificationStatus: status,
      verificationReason: (reason ?? '').trim().slice(0, 600),
      verifiedAt,
      verifiedBy: adminId,
      updatedAt: serverTimestamp(),
    });

    batch.set(
      doc(db, 'companiesPublic', company.uid),
      {
        uid: company.uid,
        companyName: company.companyName,
        website: company.website || '',
        industry: company.industry,
        companySize: company.companySize || '',
        headquarters: company.headquarters || '',
        description: company.description || '',
        logoText: company.logoText || company.companyName.slice(0, 2).toUpperCase(),
        verificationStatus: status,
        updatedAt: serverTimestamp(),
      },
      { merge: false }
    );

    await batch.commit();

    await Promise.all([
      createNotification({
        recipientId: company.uid,
        senderId: adminId,
        title:
          status === 'verified'
            ? 'Company verification approved'
            : status === 'rejected'
            ? 'Company verification requires changes'
            : `Company account ${status}`,
        message:
          status === 'verified'
            ? `${company.companyName} is now verified. You may submit internship postings for approval.`
            : `Your company verification status was updated to ${status}.${reason ? ` Note: ${reason}` : ''}`,
        type: 'verification',
        relatedEntityId: company.uid,
        targetRoute: '/recruiter/profile',
      }),
      logActivity({
        actorId: adminId,
        actorName: adminName,
        actorRole: 'admin',
        action: `Company verification ${status}`,
        entityType: 'company',
        entityId: company.uid,
        details: `${company.companyName}${reason ? ` — ${reason}` : ''}`,
      }),
    ]);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function getPlatformStats(): Promise<PlatformStatsRecord | null> {
  try {
    const snap = await getDoc(doc(db, 'platformStats', 'summary'));
    return snap.exists() ? (snap.data() as PlatformStatsRecord) : null;
  } catch {
    return null;
  }
}

export async function recomputePlatformStats(): Promise<PlatformStatsRecord> {
  try {
    const [studentsSnap, companiesSnap, internshipsSnap, appsSnap] = await Promise.all([
      getDocs(collection(db, 'studentProfiles')),
      getDocs(collection(db, 'companyProfiles')),
      getDocs(collection(db, 'internships')),
      getDocs(collection(db, 'applications')),
    ]);

    const students = studentsSnap.docs.map((d) => d.data() as StudentProfile);
    const companies = companiesSnap.docs.map((d) => d.data() as CompanyProfile);
    const internships = internshipsSnap.docs.map((d) => d.data());
    const applications = appsSnap.docs.map((d) => d.data());

    const stats = {
      studentsCount: students.length,
      verifiedCompaniesCount: companies.filter((c) => c.verificationStatus === 'verified').length,
      activeInternshipsCount: internships.filter(
        (i) => i.status === 'published' && i.approvalStatus === 'approved'
      ).length,
      placementsCount: applications.filter((a) => a.status === 'Selected').length,
      demoRecordsIncluded:
        students.some((s) => s.isDemo) || companies.some((c) => c.isDemo),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, 'platformStats', 'summary'), stats);
    return { ...stats, updatedAt: new Date() };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'platformStats/summary');
  }
}

export async function getSystemSettings(): Promise<SystemSettingsRecord | null> {
  try {
    const snap = await getDoc(doc(db, 'systemSettings', 'config'));
    return snap.exists() ? (snap.data() as SystemSettingsRecord) : null;
  } catch {
    return null;
  }
}

export async function saveSystemSettings(
  adminId: string,
  adminName: string,
  settings: Omit<SystemSettingsRecord, 'updatedAt'>
): Promise<void> {
  const path = 'systemSettings/config';
  try {
    await setDoc(doc(db, 'systemSettings', 'config'), {
      institutionName: settings.institutionName.trim().slice(0, 180),
      academicYear: settings.academicYear.trim().slice(0, 40),
      institutionWebsite: (settings.institutionWebsite ?? '').trim().slice(0, 300),
      institutionLinkedin: (settings.institutionLinkedin ?? '').trim().slice(0, 300),
      contactEmail: (settings.contactEmail ?? '').trim().slice(0, 200),
      contactPhone: (settings.contactPhone ?? '').trim().slice(0, 40),
      requireCompanyVerification: Boolean(settings.requireCompanyVerification),
      requireInternshipApproval: Boolean(settings.requireInternshipApproval),
      maxActiveApplicationsPerStudent: Math.min(50, Math.max(1, Number(settings.maxActiveApplicationsPerStudent) || 10)),
      allowWithdrawBeforeInterview: Boolean(settings.allowWithdrawBeforeInterview),
      updatedAt: serverTimestamp(),
    });
    await logActivity({
      actorId: adminId,
      actorName: adminName,
      actorRole: 'admin',
      action: 'Updated system settings',
      entityType: 'settings',
      entityId: 'config',
      details: `${settings.institutionName} (${settings.academicYear})`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function grantAdminRole(params: {
  adminId: string;
  adminName: string;
  targetUser: UserRecord;
}): Promise<void> {
  const { adminId, adminName, targetUser } = params;
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'admins', targetUser.uid), {
      uid: targetUser.uid,
      email: targetUser.email,
      grantedBy: adminId,
      createdAt: serverTimestamp(),
    });
    batch.update(doc(db, 'users', targetUser.uid), {
      role: 'admin',
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
    await logActivity({
      actorId: adminId,
      actorName: adminName,
      actorRole: 'admin',
      action: 'Granted administrator privileges',
      entityType: 'admin',
      entityId: targetUser.uid,
      details: targetUser.email,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `admins/${targetUser.uid}`);
  }
}
