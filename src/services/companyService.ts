import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import type { CompanyProfile } from '../types';
import { getInitials } from '../utils/formatters';

export async function getCompanyProfile(uid: string): Promise<CompanyProfile | null> {
  const path = `companyProfiles/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'companyProfiles', uid));
    return snap.exists() ? (snap.data() as CompanyProfile) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function updateCompanyProfile(
  uid: string,
  existingProfile: CompanyProfile,
  updates: {
    companyName: string;
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
  }
): Promise<void> {
  const path = `companyProfiles/${uid}`;
  try {
    const logoText = getInitials(updates.companyName).slice(0, 4);
    const batch = writeBatch(db);
    batch.update(doc(db, 'companyProfiles', uid), {
      companyName: updates.companyName.trim().slice(0, 160),
      contactPerson: updates.contactPerson.trim().slice(0, 120),
      phone: (updates.phone ?? '').trim().slice(0, 30),
      website: (updates.website ?? '').trim().slice(0, 300),
      industry: updates.industry.trim().slice(0, 120),
      companySize: (updates.companySize ?? '').trim().slice(0, 60),
      headquarters: (updates.headquarters ?? '').trim().slice(0, 160),
      description: (updates.description ?? '').trim().slice(0, 2500),
      linkedinUrl: (updates.linkedinUrl ?? '').trim().slice(0, 300),
      githubUrl: (updates.githubUrl ?? '').trim().slice(0, 300),
      twitterUrl: (updates.twitterUrl ?? '').trim().slice(0, 300),
      instagramUrl: (updates.instagramUrl ?? '').trim().slice(0, 300),
      logoText,
      updatedAt: serverTimestamp(),
    });
    batch.set(
      doc(db, 'companiesPublic', uid),
      {
        uid,
        companyName: updates.companyName.trim().slice(0, 160),
        website: (updates.website ?? '').trim().slice(0, 300),
        industry: updates.industry.trim().slice(0, 120),
        companySize: (updates.companySize ?? '').trim().slice(0, 60),
        headquarters: (updates.headquarters ?? '').trim().slice(0, 160),
        description: (updates.description ?? '').trim().slice(0, 2500),
        linkedinUrl: (updates.linkedinUrl ?? '').trim().slice(0, 300),
        githubUrl: (updates.githubUrl ?? '').trim().slice(0, 300),
        twitterUrl: (updates.twitterUrl ?? '').trim().slice(0, 300),
        instagramUrl: (updates.instagramUrl ?? '').trim().slice(0, 300),
        logoText,
        verificationStatus: existingProfile.verificationStatus,
        updatedAt: serverTimestamp(),
      },
      { merge: false }
    );
    batch.update(doc(db, 'users', uid), {
      fullName: updates.companyName.trim().slice(0, 120),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function listVerifiedCompaniesPublic(): Promise<
  Array<{
    uid: string;
    companyName: string;
    industry: string;
    headquarters?: string;
    website?: string;
    companySize?: string;
    description?: string;
    logoText?: string;
    verificationStatus: string;
  }>
> {
  try {
    const q = query(collection(db, 'companiesPublic'), where('verificationStatus', '==', 'verified'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as CompanyProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'companiesPublic');
  }
}
