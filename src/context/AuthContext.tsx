import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import {
  auth,
  BOOTSTRAP_ADMIN_EMAIL,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../firebase/config';
import type { CompanyProfile, NotificationRecord, StudentProfile, UserRecord, UserRole } from '../types';
import { calculateProfileCompletion, getInitials } from '../utils/formatters';
import { createNotification, subscribeNotifications } from '../services/activityService';
import { buildSafeSlug } from '../services/studentService';

interface StudentOnboardingInput {
  fullName: string;
  phone?: string;
  college: string;
  degree: string;
  branch: string;
  semester: number;
  graduationYear: number;
  cgpa?: number;
}

interface CompanyOnboardingInput {
  companyName: string;
  contactPerson: string;
  phone?: string;
  website?: string;
  industry: string;
  companySize?: string;
  headquarters?: string;
  description: string;
}

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  userRecord: UserRecord | null;
  studentProfile: StudentProfile | null;
  companyProfile: CompanyProfile | null;
  notifications: NotificationRecord[];
  unreadCount: number;
  loading: boolean;
  needsOnboarding: boolean;
  needsEmailVerification: boolean;
  isBootstrapAdmin: boolean;
  signInWithGoogle: () => Promise<UserRecord | null>;
  loginWithEmail: (email: string, password: string) => Promise<UserRecord | null>;
  registerStudentWithEmail: (email: string, password: string, data: StudentOnboardingInput) => Promise<void>;
  registerCompanyWithEmail: (email: string, password: string, data: CompanyOnboardingInput) => Promise<void>;
  completeStudentOnboarding: (data: StudentOnboardingInput) => Promise<UserRecord>;
  completeCompanyOnboarding: (data: CompanyOnboardingInput) => Promise<UserRecord>;
  sendResetEmail: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshVerificationState: () => Promise<boolean>;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userRecord, setUserRecord] = useState<UserRecord | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const isBootstrapAdmin = Boolean(
    firebaseUser?.emailVerified &&
      firebaseUser.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()
  );

  const loadUserRecords = useCallback(async (fbUser: FirebaseUser): Promise<UserRecord | null> => {
    if (!fbUser.emailVerified) {
      setUserRecord(null);
      setStudentProfile(null);
      setCompanyProfile(null);
      return null;
    }

    try {
      const userRef = doc(db, 'users', fbUser.uid);
      const userSnap = await getDoc(userRef);

      // Auto-provision bootstrap administrator on first verified Google login
      if (!userSnap.exists() && fbUser.email?.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()) {
        const adminPayload = {
          uid: fbUser.uid,
          fullName: (fbUser.displayName || 'College Administrator').slice(0, 120),
          email: fbUser.email,
          role: 'admin' as UserRole,
          accountStatus: 'active' as const,
          emailVerified: true,
          photoURL: fbUser.photoURL || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        const batch = writeBatch(db);
        batch.set(userRef, adminPayload);
        batch.set(doc(db, 'admins', fbUser.uid), {
          uid: fbUser.uid,
          email: fbUser.email,
          grantedBy: fbUser.uid,
          createdAt: serverTimestamp(),
        });
        await batch.commit();
        const created: UserRecord = { ...adminPayload, createdAt: new Date(), updatedAt: new Date() };
        setUserRecord(created);
        setStudentProfile(null);
        setCompanyProfile(null);
        return created;
      }

      if (!userSnap.exists()) {
        setUserRecord(null);
        setStudentProfile(null);
        setCompanyProfile(null);
        return null;
      }

      const record = userSnap.data() as UserRecord;
      setUserRecord(record);

      if (record.role === 'student') {
        const sSnap = await getDoc(doc(db, 'studentProfiles', fbUser.uid));
        setStudentProfile(sSnap.exists() ? (sSnap.data() as StudentProfile) : null);
        setCompanyProfile(null);
      } else if (record.role === 'company') {
        const cSnap = await getDoc(doc(db, 'companyProfiles', fbUser.uid));
        setCompanyProfile(cSnap.exists() ? (cSnap.data() as CompanyProfile) : null);
        setStudentProfile(null);
      } else {
        setStudentProfile(null);
        setCompanyProfile(null);
      }
      return record;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `users/${fbUser.uid}`);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (!fbUser) {
        setUserRecord(null);
        setStudentProfile(null);
        setCompanyProfile(null);
        setNotifications([]);
        setLoading(false);
        return;
      }
      try {
        await loadUserRecords(fbUser);
      } catch (err) {
        console.error('Failed loading user session:', err);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [loadUserRecords]);

  useEffect(() => {
    if (!firebaseUser || !firebaseUser.emailVerified || !userRecord) {
      setNotifications([]);
      return;
    }
    const unsub = subscribeNotifications(firebaseUser.uid, userRecord.role, setNotifications);
    return () => unsub();
  }, [firebaseUser, userRecord]);

  const signInWithGoogle = async (): Promise<UserRecord | null> => {
    const result = await signInWithPopup(auth, googleProvider);
    return loadUserRecords(result.user);
  };

  const loginWithEmail = async (email: string, password: string): Promise<UserRecord | null> => {
    const result = await signInWithEmailAndPassword(auth, email.trim(), password);
    return loadUserRecords(result.user);
  };

  const completeStudentOnboarding = async (data: StudentOnboardingInput): Promise<UserRecord> => {
    const current = auth.currentUser;
    if (!current || !current.emailVerified) {
      throw new Error('Please sign in with a verified email account first.');
    }
    const completion = calculateProfileCompletion({
      fullName: data.fullName,
      phone: data.phone,
      college: data.college,
      degree: data.degree,
      branch: data.branch,
      cgpa: data.cgpa ?? 0,
      skills: [],
    });

    const userPayload = {
      uid: current.uid,
      fullName: data.fullName.trim().slice(0, 120),
      email: (current.email || '').slice(0, 200),
      role: 'student' as UserRole,
      accountStatus: 'active' as const,
      emailVerified: true,
      photoURL: current.photoURL || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const publicSlug = buildSafeSlug(userPayload.fullName, current.uid);

    const profilePayload = {
      uid: current.uid,
      fullName: userPayload.fullName,
      headline: `${data.degree.trim()} in ${data.branch.trim()}`,
      email: userPayload.email,
      phone: (data.phone ?? '').trim().slice(0, 30),
      college: data.college.trim().slice(0, 180),
      degree: data.degree.trim().slice(0, 120),
      branch: data.branch.trim().slice(0, 120),
      semester: Number(data.semester) || 1,
      graduationYear: Number(data.graduationYear) || 2027,
      cgpa: Math.min(10, Math.max(0, Number(data.cgpa) || 0)),
      skills: [] as string[],
      interests: [] as string[],
      projects: [],
      certifications: [],
      achievements: [],
      experience: [],
      linkedinUrl: '',
      githubUrl: '',
      portfolioUrl: '',
      socialLinks: {},
      publicSlug,
      isPassportPublic: true,
      about: '',
      photoURL: current.photoURL || '',
      showContactToRecruiters: false,
      profileCompletion: completion,
      updatedAt: serverTimestamp(),
    };

    const publicPayload = {
      uid: current.uid,
      fullName: userPayload.fullName,
      headline: profilePayload.headline,
      college: profilePayload.college,
      degree: profilePayload.degree,
      branch: profilePayload.branch,
      semester: profilePayload.semester,
      graduationYear: profilePayload.graduationYear,
      cgpa: profilePayload.cgpa,
      skills: [] as string[],
      interests: [] as string[],
      projects: [],
      certifications: [],
      achievements: [],
      experience: [],
      linkedinUrl: '',
      githubUrl: '',
      portfolioUrl: '',
      socialLinks: {},
      publicSlug,
      isPassportPublic: true,
      about: '',
      photoURL: current.photoURL || '',
      profileCompletion: completion,
      updatedAt: serverTimestamp(),
    };

    const passportPayload = {
      slug: publicSlug,
      studentId: current.uid,
      isPublic: true,
      fullName: userPayload.fullName,
      headline: profilePayload.headline,
      college: profilePayload.college,
      degree: profilePayload.degree,
      branch: profilePayload.branch,
      graduationYear: profilePayload.graduationYear,
      cgpa: profilePayload.cgpa,
      about: '',
      photoURL: current.photoURL || '',
      skills: [] as string[],
      projects: [],
      experience: [],
      achievements: [],
      certificates: [],
      socialLinks: {},
      resumeAvailable: false,
      profileCompletion: completion,
      updatedAt: serverTimestamp(),
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'users', current.uid), userPayload);
    batch.set(doc(db, 'studentProfiles', current.uid), profilePayload);
    batch.set(doc(db, 'studentPublicProfiles', current.uid), publicPayload);
    batch.set(doc(db, 'careerPassports', publicSlug), passportPayload);
    await batch.commit();

    const loaded = await loadUserRecords(current);
    if (!loaded) throw new Error('Unable to load student profile after registration.');
    return loaded;
  };

  const completeCompanyOnboarding = async (data: CompanyOnboardingInput): Promise<UserRecord> => {
    const current = auth.currentUser;
    if (!current || !current.emailVerified) {
      throw new Error('Please sign in with a verified email account first.');
    }
    const logoText = getInitials(data.companyName).slice(0, 4);
    const userPayload = {
      uid: current.uid,
      fullName: data.companyName.trim().slice(0, 120),
      email: (current.email || '').slice(0, 200),
      role: 'company' as UserRole,
      accountStatus: 'active' as const,
      emailVerified: true,
      photoURL: current.photoURL || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const companyPayload = {
      uid: current.uid,
      companyName: data.companyName.trim().slice(0, 160),
      officialEmail: userPayload.email,
      contactPerson: data.contactPerson.trim().slice(0, 120),
      phone: (data.phone ?? '').trim().slice(0, 30),
      website: (data.website ?? '').trim().slice(0, 300),
      industry: data.industry.trim().slice(0, 120),
      companySize: (data.companySize ?? '51-200 employees').slice(0, 60),
      headquarters: (data.headquarters ?? '').trim().slice(0, 160),
      description: data.description.trim().slice(0, 2500),
      linkedinUrl: '',
      logoText,
      verificationStatus: 'pending' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const publicPayload = {
      uid: current.uid,
      companyName: companyPayload.companyName,
      website: companyPayload.website,
      industry: companyPayload.industry,
      companySize: companyPayload.companySize,
      headquarters: companyPayload.headquarters,
      description: companyPayload.description,
      logoText,
      verificationStatus: 'pending' as const,
      updatedAt: serverTimestamp(),
    };

    const batch = writeBatch(db);
    batch.set(doc(db, 'users', current.uid), userPayload);
    batch.set(doc(db, 'companyProfiles', current.uid), companyPayload);
    batch.set(doc(db, 'companiesPublic', current.uid), publicPayload);
    await batch.commit();

    await createNotification({
      recipientId: 'admin_broadcast',
      senderId: current.uid,
      title: 'New company verification request',
      message: `${companyPayload.companyName} registered and is awaiting administrator verification.`,
      type: 'verification',
      relatedEntityId: current.uid,
      targetRoute: '/admin/verifications',
    });

    const loaded = await loadUserRecords(current);
    if (!loaded) throw new Error('Unable to load company profile after registration.');
    return loaded;
  };

  const registerStudentWithEmail = async (
    email: string,
    password: string,
    data: StudentOnboardingInput
  ): Promise<void> => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(cred.user, { displayName: data.fullName.trim() });
    await sendEmailVerification(cred.user);
    // Persist pending onboarding draft in sessionStorage (not auth token) so once verified they finish seamlessly
    sessionStorage.setItem('udaan_pending_onboarding', JSON.stringify({ role: 'student', data }));
  };

  const registerCompanyWithEmail = async (
    email: string,
    password: string,
    data: CompanyOnboardingInput
  ): Promise<void> => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(cred.user, { displayName: data.companyName.trim() });
    await sendEmailVerification(cred.user);
    sessionStorage.setItem('udaan_pending_onboarding', JSON.stringify({ role: 'company', data }));
  };

  const sendResetEmail = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const resendVerificationEmail = async () => {
    if (!auth.currentUser) throw new Error('No signed-in user.');
    await sendEmailVerification(auth.currentUser);
  };

  const refreshVerificationState = async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    await reload(auth.currentUser);
    const verified = auth.currentUser.emailVerified;
    setFirebaseUser({ ...auth.currentUser });
    if (verified) {
      const pendingRaw = sessionStorage.getItem('udaan_pending_onboarding');
      if (pendingRaw) {
        try {
          const parsed = JSON.parse(pendingRaw) as
            | { role: 'student'; data: StudentOnboardingInput }
            | { role: 'company'; data: CompanyOnboardingInput };
          sessionStorage.removeItem('udaan_pending_onboarding');
          if (parsed.role === 'student') {
            await completeStudentOnboarding(parsed.data);
          } else {
            await completeCompanyOnboarding(parsed.data);
          }
          return true;
        } catch {
          // Fall through to standard load
        }
      }
      await loadUserRecords(auth.currentUser);
    }
    return verified;
  };

  const refreshProfile = async () => {
    if (auth.currentUser) {
      await loadUserRecords(auth.currentUser);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUserRecord(null);
    setStudentProfile(null);
    setCompanyProfile(null);
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;
  const needsEmailVerification = Boolean(firebaseUser && !firebaseUser.emailVerified);
  const needsOnboarding = Boolean(firebaseUser && firebaseUser.emailVerified && !userRecord && !loading);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userRecord,
        studentProfile,
        companyProfile,
        notifications,
        unreadCount,
        loading,
        needsOnboarding,
        needsEmailVerification,
        isBootstrapAdmin,
        signInWithGoogle,
        loginWithEmail,
        registerStudentWithEmail,
        registerCompanyWithEmail,
        completeStudentOnboarding,
        completeCompanyOnboarding,
        sendResetEmail,
        resendVerificationEmail,
        refreshVerificationState,
        refreshProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
