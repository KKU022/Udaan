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
  writeBatch,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, handleFirestoreError, OperationType, storage } from '../firebase/config';
import type {
  InternshipRecord,
  ResumeDocument,
  SavedInternshipRecord,
  StudentProfile,
  StudentPublicProfile,
} from '../types';
import { calculateProfileCompletion } from '../utils/formatters';
import { sanitizeIdSegment } from '../schemas/validation';

const MAX_RESUME_BYTES = 5 * 1024 * 1024; // 5MB for Storage
const MAX_FALLBACK_PDF_BYTES = 620 * 1024; // ~620KB fits safely under Firestore 1MB doc cap

export async function getStudentProfile(uid: string): Promise<StudentProfile | null> {
  const path = `studentProfiles/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'studentProfiles', uid));
    return snap.exists() ? (snap.data() as StudentProfile) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function getStudentPublicProfile(uid: string): Promise<StudentPublicProfile | null> {
  const path = `studentPublicProfiles/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'studentPublicProfiles', uid));
    return snap.exists() ? (snap.data() as StudentPublicProfile) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export function buildSafeSlug(name: string, uid: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  const suffix = uid.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 6) || 'udaan';
  return sanitizeIdSegment(`${base || 'student'}-${suffix}`);
}

export async function getCareerPassportBySlug(slug: string): Promise<import('../types').CareerPassportRecord | null> {
  const safeSlug = sanitizeIdSegment(slug);
  const path = `careerPassports/${safeSlug}`;
  try {
    const snap = await getDoc(doc(db, 'careerPassports', safeSlug));
    return snap.exists() ? (snap.data() as import('../types').CareerPassportRecord) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveStudentProfile(
  uid: string,
  profileData: Omit<StudentProfile, 'uid' | 'profileCompletion' | 'updatedAt'>
): Promise<StudentProfile> {
  const path = `studentProfiles/${uid}`;
  try {
    const mergedSkills = Array.from(
      new Set([
        ...(profileData.skills ?? []),
        ...(profileData.skillGroups?.languages ?? []),
        ...(profileData.skillGroups?.frameworks ?? []),
        ...(profileData.skillGroups?.tools ?? []),
        ...(profileData.skillGroups?.softSkills ?? []),
      ])
    ).slice(0, 40);

    const socialLinks = {
      linkedin: (profileData.socialLinks?.linkedin ?? profileData.linkedinUrl ?? '').trim().slice(0, 300),
      github: (profileData.socialLinks?.github ?? profileData.githubUrl ?? '').trim().slice(0, 300),
      portfolio: (profileData.socialLinks?.portfolio ?? profileData.portfolioUrl ?? '').trim().slice(0, 300),
      personalWebsite: (profileData.socialLinks?.personalWebsite ?? '').trim().slice(0, 300),
      leetcode: (profileData.socialLinks?.leetcode ?? '').trim().slice(0, 300),
      hackerrank: (profileData.socialLinks?.hackerrank ?? '').trim().slice(0, 300),
      codechef: (profileData.socialLinks?.codechef ?? '').trim().slice(0, 300),
      gfg: (profileData.socialLinks?.gfg ?? '').trim().slice(0, 300),
    };

    const publicSlug = profileData.publicSlug
      ? sanitizeIdSegment(profileData.publicSlug.toLowerCase())
      : buildSafeSlug(profileData.fullName, uid);
    const isPassportPublic = profileData.isPassportPublic ?? true;

    const completion = calculateProfileCompletion({
      ...profileData,
      skills: mergedSkills,
      socialLinks,
      linkedinUrl: socialLinks.linkedin,
      githubUrl: socialLinks.github,
      portfolioUrl: socialLinks.portfolio,
      uid,
    });

    const privatePayload: Record<string, unknown> = {
      uid,
      fullName: profileData.fullName.trim().slice(0, 120),
      headline: (profileData.headline ?? '').trim().slice(0, 160),
      email: profileData.email.trim().slice(0, 200),
      phone: (profileData.phone ?? '').trim().slice(0, 30),
      college: profileData.college.trim().slice(0, 180),
      degree: profileData.degree.trim().slice(0, 120),
      branch: profileData.branch.trim().slice(0, 120),
      semester: Number(profileData.semester) || 1,
      graduationYear: Number(profileData.graduationYear) || 2027,
      cgpa: Math.min(10, Math.max(0, Number(profileData.cgpa) || 0)),
      skills: mergedSkills,
      skillGroups: profileData.skillGroups ?? {
        languages: [],
        frameworks: [],
        tools: [],
        softSkills: [],
      },
      interests: (profileData.interests ?? []).slice(0, 20),
      projects: (profileData.projects ?? []).slice(0, 15),
      certifications: (profileData.certifications ?? []).slice(0, 20),
      certificates: (profileData.certificates ?? []).slice(0, 20),
      achievements: (profileData.achievements ?? []).slice(0, 20),
      experience: (profileData.experience ?? []).slice(0, 15),
      linkedinUrl: socialLinks.linkedin,
      githubUrl: socialLinks.github,
      portfolioUrl: socialLinks.portfolio,
      socialLinks,
      publicSlug,
      isPassportPublic,
      about: (profileData.about ?? '').trim().slice(0, 2000),
      photoURL: (profileData.photoURL ?? '').trim().slice(0, 500),
      showContactToRecruiters: Boolean(profileData.showContactToRecruiters),
      profileCompletion: completion,
      updatedAt: serverTimestamp(),
    };

    if (profileData.resumeId) privatePayload.resumeId = profileData.resumeId;
    if (profileData.resumeName) privatePayload.resumeName = profileData.resumeName;
    if (profileData.resumeUrl) privatePayload.resumeUrl = profileData.resumeUrl;
    if (profileData.resumeUpdatedAt) privatePayload.resumeUpdatedAt = profileData.resumeUpdatedAt;

    const publicPayload: Record<string, unknown> = {
      uid,
      fullName: privatePayload.fullName,
      headline: privatePayload.headline,
      college: privatePayload.college,
      degree: privatePayload.degree,
      branch: privatePayload.branch,
      semester: privatePayload.semester,
      graduationYear: privatePayload.graduationYear,
      cgpa: privatePayload.cgpa,
      skills: privatePayload.skills,
      skillGroups: privatePayload.skillGroups,
      interests: privatePayload.interests,
      projects: privatePayload.projects,
      certifications: privatePayload.certifications,
      certificates: privatePayload.certificates,
      achievements: privatePayload.achievements,
      experience: privatePayload.experience,
      linkedinUrl: socialLinks.linkedin,
      githubUrl: socialLinks.github,
      portfolioUrl: socialLinks.portfolio,
      socialLinks,
      publicSlug,
      isPassportPublic,
      about: privatePayload.about,
      photoURL: privatePayload.photoURL,
      profileCompletion: completion,
      updatedAt: serverTimestamp(),
    };

    const passportPayload: Record<string, unknown> = {
      slug: publicSlug,
      studentId: uid,
      isPublic: isPassportPublic,
      fullName: privatePayload.fullName,
      headline: privatePayload.headline,
      college: privatePayload.college,
      degree: privatePayload.degree,
      branch: privatePayload.branch,
      graduationYear: privatePayload.graduationYear,
      cgpa: privatePayload.cgpa,
      about: privatePayload.about,
      photoURL: privatePayload.photoURL,
      skills: privatePayload.skills,
      skillGroups: privatePayload.skillGroups,
      projects: privatePayload.projects,
      experience: privatePayload.experience,
      achievements: privatePayload.achievements,
      certificates: privatePayload.certificates,
      socialLinks,
      resumeAvailable: Boolean(profileData.resumeId || profileData.resumeUrl),
      profileCompletion: completion,
      updatedAt: serverTimestamp(),
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'studentProfiles', uid), privatePayload, { merge: false });
    batch.set(doc(db, 'studentPublicProfiles', uid), publicPayload, { merge: false });
    batch.set(doc(db, 'careerPassports', publicSlug), passportPayload, { merge: false });
    batch.update(doc(db, 'users', uid), {
      fullName: privatePayload.fullName,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();

    return {
      ...(privatePayload as unknown as StudentProfile),
      updatedAt: new Date(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Failed to read PDF file'));
    reader.readAsDataURL(file);
  });
}

export async function uploadStudentResume(
  studentId: string,
  file: File,
  currentProfile: StudentProfile
): Promise<ResumeDocument> {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Only PDF resumes are accepted.');
  }
  if (file.size <= 0 || file.size > MAX_RESUME_BYTES) {
    throw new Error('Resume size must be between 1 byte and 5 MB.');
  }

  const resumeId = sanitizeIdSegment(`res_${studentId.slice(0, 12)}_${Date.now()}`);
  const storagePath = `resumes/${studentId}/${resumeId}.pdf`;
  let downloadUrl = '';
  let dataUrl = '';

  // Try Firebase Storage first; gracefully persist validated PDFs <= 620KB in Firestore if Storage rules/bucket are not provisioned
  try {
    const fileRef = ref(storage, storagePath);
    await uploadBytes(fileRef, file, { contentType: 'application/pdf' });
    downloadUrl = await getDownloadURL(fileRef);
  } catch {
    if (file.size > MAX_FALLBACK_PDF_BYTES) {
      throw new Error(
        'Firebase Storage is unavailable for large files. Please upload a compact PDF under 600 KB or enable Firebase Storage in the console.'
      );
    }
    dataUrl = await readFileAsDataUrl(file);
  }

  const path = `resumes/${resumeId}`;
  try {
    const resumeDoc: Record<string, unknown> = {
      resumeId,
      studentId,
      fileName: file.name.slice(0, 200),
      fileSize: file.size,
      mimeType: 'application/pdf',
      sharedWithCompanies: [],
      uploadedAt: serverTimestamp(),
    };
    if (downloadUrl) {
      resumeDoc.storagePath = storagePath;
      resumeDoc.downloadUrl = downloadUrl;
    } else {
      resumeDoc.dataUrl = dataUrl;
    }

    await setDoc(doc(db, 'resumes', resumeId), resumeDoc);

    const updatedIso = new Date().toISOString();
    const completion = calculateProfileCompletion({
      ...currentProfile,
      resumeId,
      resumeName: file.name.slice(0, 200),
      resumeUrl: downloadUrl || `firestore-resume://${resumeId}`,
    });

    await updateDoc(doc(db, 'studentProfiles', studentId), {
      resumeId,
      resumeName: file.name.slice(0, 200),
      resumeUrl: downloadUrl || `firestore-resume://${resumeId}`,
      resumeUpdatedAt: updatedIso,
      profileCompletion: completion,
      updatedAt: serverTimestamp(),
    });

    return {
      ...(resumeDoc as unknown as ResumeDocument),
      uploadedAt: new Date(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function listStudentResumes(studentId: string): Promise<ResumeDocument[]> {
  try {
    const q = query(collection(db, 'resumes'), where('studentId', '==', studentId));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => d.data() as ResumeDocument)
      .sort((a, b) => {
        const tA = a.uploadedAt && typeof a.uploadedAt === 'object' && 'toMillis' in a.uploadedAt ? a.uploadedAt.toMillis() : 0;
        const tB = b.uploadedAt && typeof b.uploadedAt === 'object' && 'toMillis' in b.uploadedAt ? b.uploadedAt.toMillis() : 0;
        return tB - tA;
      });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'resumes');
  }
}

export async function getResumeById(resumeId: string): Promise<ResumeDocument | null> {
  const path = `resumes/${resumeId}`;
  try {
    const snap = await getDoc(doc(db, 'resumes', resumeId));
    return snap.exists() ? (snap.data() as ResumeDocument) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function deleteStudentResume(resume: ResumeDocument): Promise<void> {
  const path = `resumes/${resume.resumeId}`;
  try {
    if (resume.storagePath) {
      try {
        await deleteObject(ref(storage, resume.storagePath));
      } catch {
        // Ignore storage deletion if object was already removed
      }
    }
    await deleteDoc(doc(db, 'resumes', resume.resumeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function listSavedInternships(studentId: string): Promise<SavedInternshipRecord[]> {
  try {
    const q = query(collection(db, 'savedInternships'), where('studentId', '==', studentId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as SavedInternshipRecord);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'savedInternships');
  }
}

export async function toggleSavedInternship(
  studentId: string,
  internship: InternshipRecord,
  currentlySaved: boolean
): Promise<boolean> {
  const savedId = sanitizeIdSegment(`${studentId}_${internship.internshipId}`);
  const path = `savedInternships/${savedId}`;
  try {
    if (currentlySaved) {
      await deleteDoc(doc(db, 'savedInternships', savedId));
      return false;
    }
    await setDoc(doc(db, 'savedInternships', savedId), {
      savedId,
      studentId,
      internshipId: internship.internshipId,
      internshipTitle: internship.title.slice(0, 160),
      companyName: internship.companyName.slice(0, 160),
      location: internship.location.slice(0, 140),
      workMode: internship.workMode,
      stipendDisplay: internship.stipendDisplay.slice(0, 80),
      deadline: internship.deadline.slice(0, 40),
      savedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, currentlySaved ? OperationType.DELETE : OperationType.CREATE, path);
  }
}
