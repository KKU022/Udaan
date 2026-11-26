/**
 * InternFlow Firestore Security Rules Verification Spec
 * Maps the 12 adversarial payloads from security_spec.md to concrete rule invariants.
 * Run with Firebase Emulator Suite (`@firebase/rules-unit-testing`) when testing locally.
 */
export interface SecurityTestCase {
  id: string;
  name: string;
  actor: 'anonymous' | 'student' | 'companyA' | 'companyB' | 'unverifiedSpoofAdmin';
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
  enforcedBy: string;
}

export const DIRTY_DOZEN_SECURITY_CASES: SecurityTestCase[] = [
  {
    id: 'DD-01',
    name: 'Privilege Escalation on Signup',
    actor: 'student',
    operation: 'create',
    path: 'users/student_01',
    payload: { uid: 'student_01', role: 'admin', accountStatus: 'active' },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'users create enforces incoming().role in ["student", "company"]',
  },
  {
    id: 'DD-02',
    name: 'Self-Role Escalation on Update',
    actor: 'student',
    operation: 'update',
    path: 'users/student_01',
    payload: { role: 'admin' },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'users update enforces incoming().role == existing().role and affectedKeys().hasOnly',
  },
  {
    id: 'DD-03',
    name: 'Unverified Admin Email Spoofing',
    actor: 'unverifiedSpoofAdmin',
    operation: 'get',
    path: 'activityLogs/log_01',
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'isBootstrapAdmin requires request.auth.token.email_verified == true',
  },
  {
    id: 'DD-04',
    name: 'Cross-User Student PII Read',
    actor: 'companyA',
    operation: 'get',
    path: 'studentProfiles/student_01',
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'studentProfiles get restricted strictly to isOwner(studentId) || isAdmin()',
  },
  {
    id: 'DD-05',
    name: 'Company Self-Verification',
    actor: 'companyA',
    operation: 'update',
    path: 'companyProfiles/company_a',
    payload: { verificationStatus: 'verified' },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'companyProfiles update requires verificationStatus == existing().verificationStatus',
  },
  {
    id: 'DD-06',
    name: 'Unapproved Internship Self-Publishing',
    actor: 'companyA',
    operation: 'create',
    path: 'internships/int_99',
    payload: { status: 'published', approvalStatus: 'approved' },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'internships create restricts companies to draft or pending_approval',
  },
  {
    id: 'DD-07',
    name: 'Student Self-Selection on Application',
    actor: 'student',
    operation: 'update',
    path: 'applications/int_01_student_01',
    payload: { status: 'Selected' },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'applications update restricts student owner strictly to status == "Withdrawn"',
  },
  {
    id: 'DD-08',
    name: 'Cross-Company Application Snooping',
    actor: 'companyA',
    operation: 'get',
    path: 'applications/int_b_student_01',
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'applications get/list restricted to studentId, companyId, or admin',
  },
  {
    id: 'DD-09',
    name: 'Shadow Field Injection',
    actor: 'companyA',
    operation: 'update',
    path: 'internships/int_01',
    payload: { isFeaturedOverride: true },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'isValidInternship enforces keys().hasOnly() and update affectedKeys().hasOnly()',
  },
  {
    id: 'DD-10',
    name: 'Document ID Poisoning',
    actor: 'companyA',
    operation: 'create',
    path: 'internships/invalid$id..slash',
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'isValidId enforces ^[a-zA-Z0-9_\\-]+$ with max 128 chars',
  },
  {
    id: 'DD-11',
    name: 'Backdated Client Timestamp Forgery',
    actor: 'student',
    operation: 'create',
    path: 'applications/int_01_student_01',
    payload: { appliedAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'applications create requires incoming().appliedAt == request.time',
  },
  {
    id: 'DD-12',
    name: 'Terminal State Tampering After Withdrawal',
    actor: 'companyA',
    operation: 'update',
    path: 'applications/int_01_student_withdrawn',
    payload: { status: 'Shortlisted' },
    expected: 'PERMISSION_DENIED',
    enforcedBy: 'applications update blocks non-admin updates when existing().status in ["Selected","Rejected","Withdrawn"]',
  },
];
