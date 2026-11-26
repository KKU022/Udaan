# InternFlow Security Specification (Phase 0 — Payload-First Security TDD)

## 1. Data Invariants
1. **No Self-Promoted Admins**: Public registration can only create `users/{uid}` with `role` in `['student', 'company']` and `accountStatus == 'active'`. Users cannot modify their own `role` or `accountStatus`.
2. **Email Verification Gate**: All privileged write operations and admin email checks require `request.auth.token.email_verified == true`.
3. **Strict PII Isolation**: `users/{uid}`, `studentProfiles/{uid}`, and `companyProfiles/{uid}` contain emails/phones and are strictly readable only by the document owner or a verified Admin.
4. **Admin-Gated Company Verification**: A company cannot set `verificationStatus` to `'verified'` on create or update; only an Admin can approve/reject/suspend verification.
5. **Admin-Gated Internship Publishing**: A company cannot create or update an internship directly to `approvalStatus == 'approved'` or `status == 'published'`. Unapproved internships are invisible to students and public users.
6. **Zero Duplicate / Cross-Company Application Leaks**: Applications use deterministic IDs (`${internshipId}_${studentId}`), require an existing published/approved internship on create, and are readable/listable ONLY where `resource.data.studentId == request.auth.uid`, `resource.data.companyId == request.auth.uid`, or `isAdmin()`.
7. **State Transition Integrity**: Students can only transition their own active application to `'Withdrawn'`; they can NEVER set `'Shortlisted'` or `'Selected'`. Terminal states (`'Withdrawn'`, `'Selected'`, `'Rejected'`) lock non-admin updates.
8. **Resume Access Confinement**: Resumes in `resumes/{resumeId}` are readable only by the student owner, an Admin, or companies explicitly listed in `sharedWithCompanies` (capped at 50 entries).
9. **Temporal & ID Integrity**: All document IDs match `^[a-zA-Z0-9_\-]+$` (max 128 chars), strings enforce strict `.size()` limits, arrays enforce bounded `.size()` limits, and `createdAt`/`updatedAt` timestamps use `request.time`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Privilege Escalation on Signup**: Student attempts `create /users/{uid}` with `{ role: "admin" }`. Expected: `PERMISSION_DENIED`.
2. **Self-Role Escalation on Update**: Student attempts `update /users/{uid}` changing `role` from `"student"` to `"admin"`. Expected: `PERMISSION_DENIED`.
3. **Email Spoofing Attack**: Unverified account (`email_verified: false`) using admin email attempts `get /activityLogs/log_1`. Expected: `PERMISSION_DENIED`.
4. **Cross-User PII Read**: Authenticated recruiter attempts `get /studentProfiles/{otherStudentId}`. Expected: `PERMISSION_DENIED`.
5. **Company Self-Verification**: Company attempts `update /companyProfiles/{uid}` setting `verificationStatus: "verified"`. Expected: `PERMISSION_DENIED`.
6. **Unapproved Internship Self-Publishing**: Company attempts `create /internships/int_99` with `status: "published", approvalStatus: "approved"`. Expected: `PERMISSION_DENIED`.
7. **Student Self-Selection**: Student attempts `update /applications/{appId}` changing `status: "Selected"`. Expected: `PERMISSION_DENIED`.
8. **Cross-Company Application Snooping**: Recruiter A attempts `get /applications/{companyBAppId}` or `list /applications` without scoping to `companyId == request.auth.uid`. Expected: `PERMISSION_DENIED`.
9. **Shadow Field Injection**: Company attempts `update /internships/{id}` injecting undocumented ghost field `isFeaturedOverride: true`. Expected: `PERMISSION_DENIED`.
10. **ID Poisoning**: Attacker attempts `create /internships/invalid$id..slash` or a 200-char document ID. Expected: `PERMISSION_DENIED`.
11. **Timestamp Forgery**: Student attempts `create /applications/{id}` with backdated client timestamp `appliedAt != request.time`. Expected: `PERMISSION_DENIED`.
12. **Terminal State Tampering**: Recruiter attempts `update /applications/{withdrawnAppId}` after student already withdrew (`status == "Withdrawn"`). Expected: `PERMISSION_DENIED`.
