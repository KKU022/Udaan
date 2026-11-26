import React, { useEffect, useMemo, useState } from 'react';
import { Search, ShieldCheck, X, ExternalLink, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import {
  grantAdminRole,
  listAllCompanyProfiles,
  listAllStudentProfiles,
  listAllUsers,
  recomputePlatformStats,
  reviewCompanyVerification,
  updateUserAccountStatus,
} from '../../services/adminService';
import { listAllApplications } from '../../services/applicationService';
import type {
  AccountStatus,
  ApplicationRecord,
  CompanyProfile,
  StudentProfile,
  UserRecord,
  VerificationStatus,
} from '../../types';
import {
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PaginationBar,
  StatusLabel,
  UserAvatar,
} from '../../components/ui/Primitives';
import { formatDate } from '../../utils/formatters';

const PAGE_SIZE = 10;

export const AdminStudentsPage: React.FC = () => {
  const { userRecord } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [profiles, setProfiles] = useState<StudentProfile[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [queryText, setQueryText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<{
    user: UserRecord;
    nextStatus: AccountStatus;
  } | null>(null);
  const [promoteConfirm, setPromoteConfirm] = useState<UserRecord | null>(null);
  const [busy, setBusy] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [u, p, a] = await Promise.all([
        listAllUsers(),
        listAllStudentProfiles(),
        listAllApplications(),
      ]);
      setUsers(u);
      setProfiles(p);
      setApplications(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load student records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const userMap = useMemo(() => {
    const map = new Map<string, UserRecord>();
    users.forEach((u) => map.set(u.uid, u));
    return map;
  }, [users]);

  const filtered = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    return profiles.filter((s) => {
      const u = userMap.get(s.uid);
      const acctStatus = u?.accountStatus || 'active';
      if (statusFilter !== 'all' && acctStatus !== statusFilter) return false;
      if (!q) return true;
      return (
        s.fullName.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.college.toLowerCase().includes(q) ||
        s.branch.toLowerCase().includes(q) ||
        (s.skills || []).some((sk) => sk.toLowerCase().includes(q))
      );
    });
  }, [profiles, userMap, queryText, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleStatusChange = async () => {
    if (!statusConfirm || !userRecord) return;
    setBusy(true);
    try {
      await updateUserAccountStatus({
        adminId: userRecord.uid,
        adminName: userRecord.fullName,
        targetUser: statusConfirm.user,
        accountStatus: statusConfirm.nextStatus,
      });
      toast.success(
        `${statusConfirm.user.fullName} account marked ${statusConfirm.nextStatus}. Historical data preserved.`
      );
      setStatusConfirm(null);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update account status.');
    } finally {
      setBusy(false);
    }
  };

  const handlePromoteAdmin = async () => {
    if (!promoteConfirm || !userRecord) return;
    setBusy(true);
    try {
      await grantAdminRole({
        adminId: userRecord.uid,
        adminName: userRecord.fullName,
        targetUser: promoteConfirm,
      });
      toast.success(`${promoteConfirm.fullName} has been granted administrator privileges.`);
      setPromoteConfirm(null);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to grant admin privileges.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingSkeleton rows={6} />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  const selectedApps = selectedStudent
    ? applications.filter((a) => a.studentId === selectedStudent.uid)
    : [];

  return (
    <div className="space-y-6 udaan-fade-in">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
          Student Directory
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Review student profiles, track application outcomes, and manage account access without deleting historical records.
        </p>
      </div>

      {/* Filters */}
      <div className="mono-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={queryText}
            onChange={(e) => {
              setQueryText(e.target.value);
              setPage(1);
            }}
            placeholder="Search by student name, email, college, branch, or skill..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
        >
          <option value="all">All Account Statuses</option>
          <option value="active">Active</option>
          <option value="deactivated">Deactivated</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No matching students found"
          description="Try clearing your search filter or seed demonstration records from the Overview page."
        />
      ) : (
        <div className="mono-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)] text-xs text-[var(--text-muted)]">
                  <th className="py-3 px-4 font-medium">Student</th>
                  <th className="py-3 px-4 font-medium">College & Branch</th>
                  <th className="py-3 px-4 font-medium">CGPA</th>
                  <th className="py-3 px-4 font-medium">Applications</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {paged.map((student) => {
                  const u = userMap.get(student.uid);
                  const acctStatus = u?.accountStatus || 'active';
                  const studentAppsCount = applications.filter(
                    (a) => a.studentId === student.uid
                  ).length;
                  return (
                    <tr
                      key={student.uid}
                      className="hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            name={student.fullName}
                            photoURL={student.photoURL}
                            size="sm"
                          />
                          <div className="min-w-0">
                            <p className="font-medium text-[var(--text-primary)] truncate">
                              {student.fullName}
                              {student.isDemo && (
                                <span className="ml-1.5 text-[11px] font-mono text-[var(--text-muted)]">
                                  (Demo)
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)] truncate">
                              {student.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="text-xs font-medium text-[var(--text-primary)]">
                          {student.college}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {student.degree} · {student.branch} · Class of {student.graduationYear}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-[var(--text-primary)]">
                        {student.cgpa ? student.cgpa.toFixed(2) : '—'}
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-[var(--text-primary)]">
                        {studentAppsCount}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusLabel status={acctStatus} />
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-3">
                        <button
                          type="button"
                          onClick={() => setSelectedStudent(student)}
                          className="text-xs font-medium text-[var(--text-primary)] hover:underline underline-offset-2"
                        >
                          Inspect
                        </button>
                        {u && (
                          <button
                            type="button"
                            onClick={() =>
                              setStatusConfirm({
                                user: u,
                                nextStatus: acctStatus === 'active' ? 'deactivated' : 'active',
                              })
                            }
                            className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2"
                          >
                            {acctStatus === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 pb-4">
            <PaginationBar
              page={page}
              totalPages={totalPages}
              totalItems={filtered.length}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}

      {/* Student Inspection Drawer */}
      {selectedStudent && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[var(--overlay-backdrop)] backdrop-blur-[2px] flex justify-end"
        >
          <div className="bg-[var(--bg-card)] w-full max-w-xl h-full overflow-y-auto border-l border-[var(--border-color)] p-6 space-y-6 udaan-fade-in">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={selectedStudent.fullName}
                  photoURL={selectedStudent.photoURL}
                  size="md"
                />
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">
                    {selectedStudent.fullName}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">{selectedStudent.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-elevated)]"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-[var(--text-muted)]">Institution</p>
                <p className="font-medium text-[var(--text-primary)] mt-0.5">
                  {selectedStudent.college}
                </p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Program</p>
                <p className="font-medium text-[var(--text-primary)] mt-0.5">
                  {selectedStudent.degree} · {selectedStudent.branch}
                </p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">CGPA / Semester</p>
                <p className="font-mono text-[var(--text-primary)] mt-0.5">
                  {selectedStudent.cgpa?.toFixed(2) || '—'} · Sem {selectedStudent.semester}
                </p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Profile Completion</p>
                <p className="font-mono text-[var(--text-primary)] mt-0.5">
                  {selectedStudent.profileCompletion}%
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-[var(--text-muted)]">Skills</p>
              <p className="mt-1 text-sm text-[var(--text-primary)]">
                {(selectedStudent.skills || []).join(' · ') || 'No skills listed'}
              </p>
            </div>

            {selectedStudent.about && (
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)]">Summary</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)] leading-relaxed">
                  {selectedStudent.about}
                </p>
              </div>
            )}

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                Applications ({selectedApps.length})
              </h4>
              {selectedApps.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">
                  No internship applications submitted yet.
                </p>
              ) : (
                <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-color)] rounded-[10px]">
                  {selectedApps.map((app) => (
                    <div
                      key={app.applicationId}
                      className="p-3 flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-xs font-semibold text-[var(--text-primary)]">
                          {app.internshipTitle}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {app.companyName} · Applied {formatDate(app.appliedAt)}
                        </p>
                      </div>
                      <StatusLabel status={app.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {(() => {
              const u = userMap.get(selectedStudent.uid);
              if (!u || u.role === 'admin' || selectedStudent.isDemo) return null;
              return (
                <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
                  <p className="text-xs text-[var(--text-secondary)]">
                    Institutional role escalation
                  </p>
                  <button
                    type="button"
                    onClick={() => setPromoteConfirm(u)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium mono-btn-secondary"
                  >
                    <UserCog className="w-3.5 h-3.5" />
                    Grant Admin Access
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(statusConfirm)}
        title={
          statusConfirm?.nextStatus === 'active'
            ? 'Reactivate student account?'
            : 'Deactivate student account?'
        }
        description={
          statusConfirm?.nextStatus === 'active'
            ? `Restore active sign-in access for ${statusConfirm?.user.fullName}.`
            : `Deactivating ${statusConfirm?.user.fullName} pauses portal access while preserving all existing applications and academic records.`
        }
        confirmLabel={
          statusConfirm?.nextStatus === 'active' ? 'Activate Account' : 'Deactivate Account'
        }
        destructive={statusConfirm?.nextStatus !== 'active'}
        busy={busy}
        onConfirm={handleStatusChange}
        onCancel={() => setStatusConfirm(null)}
      />

      <ConfirmDialog
        open={Boolean(promoteConfirm)}
        title="Grant administrator privileges?"
        description={`Promote ${promoteConfirm?.fullName} (${promoteConfirm?.email}) to College Administrator. This grants full institutional access and is recorded in the audit log.`}
        confirmLabel="Grant Admin Access"
        busy={busy}
        onConfirm={handlePromoteAdmin}
        onCancel={() => setPromoteConfirm(null)}
      />
    </div>
  );
};

export const AdminCompaniesPage: React.FC<{ pendingOnly?: boolean }> = ({
  pendingOnly = false,
}) => {
  const { userRecord } = useAuth();
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [queryText, setQueryText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(pendingOnly ? 'pending' : 'all');
  const [page, setPage] = useState(1);

  const [reviewTarget, setReviewTarget] = useState<CompanyProfile | null>(null);
  const [reasonText, setReasonText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStatusFilter(pendingOnly ? 'pending' : 'all');
    setPage(1);
  }, [pendingOnly]);

  const loadCompanies = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listAllCompanyProfiles();
      setCompanies(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load company profiles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const filtered = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    return companies.filter((c) => {
      if (statusFilter !== 'all' && c.verificationStatus !== statusFilter) return false;
      if (!q) return true;
      return (
        c.companyName.toLowerCase().includes(q) ||
        c.industry.toLowerCase().includes(q) ||
        c.officialEmail.toLowerCase().includes(q) ||
        (c.headquarters || '').toLowerCase().includes(q)
      );
    });
  }, [companies, queryText, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDecision = async (company: CompanyProfile, status: VerificationStatus) => {
    if (!userRecord) return;
    if ((status === 'rejected' || status === 'suspended') && !reasonText.trim()) {
      toast.error('Please enter a brief review note or reason before rejecting or suspending.');
      return;
    }
    setBusy(true);
    try {
      await reviewCompanyVerification({
        adminId: userRecord.uid,
        adminName: userRecord.fullName,
        company,
        status,
        reason: reasonText,
      });
      await recomputePlatformStats();
      toast.success(`${company.companyName} marked ${status}. Recruiter notified.`);
      setReviewTarget(null);
      setReasonText('');
      await loadCompanies();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to update verification status.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingSkeleton rows={5} />;
  if (error) return <ErrorState message={error} onRetry={loadCompanies} />;

  return (
    <div className="space-y-6 udaan-fade-in">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
          {pendingOnly ? 'Company Verification Queue' : 'Registered Companies'}
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {pendingOnly
            ? 'Verify recruiter credentials before allowing companies to publish campus internships.'
            : 'Manage company verification status, audit organizational details, and enforce compliance.'}
        </p>
      </div>

      <div className="mono-card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={queryText}
            onChange={(e) => {
              setQueryText(e.target.value);
              setPage(1);
            }}
            placeholder="Search company name, industry, email, or city..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
          />
        </div>
        {!pendingOnly && (
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
          >
            <option value="all">All Verification Statuses</option>
            <option value="pending">Pending Verification</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={pendingOnly ? 'No pending verifications' : 'No matching companies found'}
          description={
            pendingOnly
              ? 'All company verification requests have been processed.'
              : 'Adjust your search filters to view other registered recruiters.'
          }
        />
      ) : (
        <div className="mono-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)] text-xs text-[var(--text-muted)]">
                  <th className="py-3 px-4 font-medium">Company</th>
                  <th className="py-3 px-4 font-medium">Industry & HQ</th>
                  <th className="py-3 px-4 font-medium">Contact Person</th>
                  <th className="py-3 px-4 font-medium">Verification</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {paged.map((c) => (
                  <tr key={c.uid} className="hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-[var(--text-primary)]">{c.companyName}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{c.officialEmail}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="text-xs font-medium text-[var(--text-primary)]">{c.industry}</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {c.headquarters || '—'}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="text-xs font-medium text-[var(--text-primary)]">
                        {c.contactPerson}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">{c.phone || '—'}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusLabel status={c.verificationStatus} />
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setReviewTarget(c);
                          setReasonText(c.verificationReason || '');
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold mono-btn-primary"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 pb-4">
            <PaginationBar
              page={page}
              totalPages={totalPages}
              totalItems={filtered.length}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}

      {/* Company Review Modal */}
      {reviewTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[var(--overlay-backdrop)] backdrop-blur-[2px] flex items-center justify-center p-4"
        >
          <div className="mono-card max-w-xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto udaan-fade-in">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  {reviewTarget.companyName}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {reviewTarget.industry} · {reviewTarget.companySize || 'Size not specified'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewTarget(null)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-elevated)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs border-y border-[var(--border-subtle)] py-4">
              <div>
                <p className="text-[var(--text-muted)]">Official Email</p>
                <p className="font-medium text-[var(--text-primary)] mt-0.5">
                  {reviewTarget.officialEmail}
                </p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Contact Person</p>
                <p className="font-medium text-[var(--text-primary)] mt-0.5">
                  {reviewTarget.contactPerson}
                </p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Headquarters</p>
                <p className="font-medium text-[var(--text-primary)] mt-0.5">
                  {reviewTarget.headquarters || '—'}
                </p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Website</p>
                {reviewTarget.website ? (
                  <a
                    href={reviewTarget.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-[var(--text-primary)] hover:underline underline-offset-2 mt-0.5"
                  >
                    Visit site <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <p className="text-[var(--text-muted)] mt-0.5">Not provided</p>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-[var(--text-muted)]">Company Description</p>
              <p className="mt-1 text-sm text-[var(--text-primary)] leading-relaxed">
                {reviewTarget.description || 'No description provided.'}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Verification Note / Rejection Reason
              </label>
              <textarea
                rows={3}
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder="Required if rejecting or suspending; optional note when approving..."
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => handleDecision(reviewTarget, 'suspended')}
                className="px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] border border-dashed border-[var(--border-color)] rounded-[10px] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] disabled:opacity-50 transition-colors"
              >
                Suspend
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleDecision(reviewTarget, 'rejected')}
                className="px-3.5 py-2 text-xs font-medium mono-btn-secondary disabled:opacity-50"
              >
                Reject Request
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleDecision(reviewTarget, 'verified')}
                className="px-4 py-2 text-xs font-semibold mono-btn-primary disabled:opacity-50"
              >
                {busy ? 'Saving...' : 'Verify Company'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
