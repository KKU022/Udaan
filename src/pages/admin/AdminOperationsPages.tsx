import React, { useEffect, useMemo, useState } from 'react';
import { Search, X, ExternalLink, CheckCircle2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import {
  adminReviewInternship,
  listAllInternships,
} from '../../services/internshipService';
import { listAllApplications } from '../../services/applicationService';
import {
  listAllFeedback,
  listAllInterviews,
  listAllProgress,
} from '../../services/interviewProgressService';
import { listAllCompanyProfiles, recomputePlatformStats } from '../../services/adminService';
import type {
  ApplicationRecord,
  CompanyProfile,
  FeedbackRecord,
  InternshipProgressRecord,
  InternshipRecord,
  InterviewRecord,
} from '../../types';
import {
  ApplicationTimeline,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PaginationBar,
  StatusLabel,
} from '../../components/ui/Primitives';
import { formatDate, formatDateTime, toDate } from '../../utils/formatters';

const PAGE_SIZE = 10;

export const AdminInternshipsPage: React.FC<{ pendingOnly?: boolean }> = ({
  pendingOnly = false,
}) => {
  const { userRecord } = useAuth();
  const [internships, setInternships] = useState<InternshipRecord[]>([]);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [queryText, setQueryText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(pendingOnly ? 'pending_approval' : 'all');
  const [page, setPage] = useState(1);

  const [reviewItem, setReviewItem] = useState<InternshipRecord | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStatusFilter(pendingOnly ? 'pending_approval' : 'all');
    setPage(1);
  }, [pendingOnly]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [ints, comps] = await Promise.all([listAllInternships(), listAllCompanyProfiles()]);
      setInternships(ints);
      setCompanies(comps);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load internships.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const companyMap = useMemo(() => {
    const m = new Map<string, CompanyProfile>();
    companies.forEach((c) => m.set(c.uid, c));
    return m;
  }, [companies]);

  const filtered = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    return internships.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.companyName.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.location.toLowerCase().includes(q)
      );
    });
  }, [internships, queryText, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDecision = async (decision: 'approved' | 'rejected' | 'closed') => {
    if (!userRecord || !reviewItem) return;
    if (decision === 'rejected' && !reason.trim()) {
      toast.error('Provide a clear reason when rejecting an internship posting.');
      return;
    }
    setBusy(true);
    try {
      await adminReviewInternship({
        adminId: userRecord.uid,
        adminName: userRecord.fullName,
        internship: reviewItem,
        decision,
        reason,
      });
      await recomputePlatformStats();
      toast.success(
        decision === 'approved'
          ? `"${reviewItem.title}" approved and published to student discovery.`
          : `"${reviewItem.title}" marked ${decision}.`
      );
      setReviewItem(null);
      setReason('');
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to save approval decision.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingSkeleton rows={6} />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  return (
    <div className="space-y-6 udaan-fade-in">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
          {pendingOnly ? 'Internship Approval Queue' : 'All Internships'}
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          {pendingOnly
            ? 'Internships remain hidden from student discovery until reviewed and approved by an administrator.'
            : 'Monitor all drafted, pending, published, closed, and rejected internship postings across campus.'}
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
            placeholder="Search role title, company, category, or location..."
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
            <option value="all">All Statuses</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="rejected">Rejected</option>
            <option value="closed">Closed</option>
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={pendingOnly ? 'Approval queue is clear' : 'No matching internships found'}
          description={
            pendingOnly
              ? 'All submitted internship postings have been reviewed.'
              : 'Adjust your search filters to inspect other opportunities.'
          }
        />
      ) : (
        <div className="mono-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)] text-xs text-[var(--text-muted)]">
                  <th className="py-3 px-4 font-medium">Internship</th>
                  <th className="py-3 px-4 font-medium">Company</th>
                  <th className="py-3 px-4 font-medium">Stipend & Mode</th>
                  <th className="py-3 px-4 font-medium">Deadline</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {paged.map((item) => {
                  const comp = companyMap.get(item.companyId);
                  return (
                    <tr
                      key={item.internshipId}
                      className="hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <p className="font-medium text-[var(--text-primary)]">{item.title}</p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {item.category} · {item.applicantsCount || 0} applicants
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="text-xs font-medium text-[var(--text-primary)]">
                          {item.companyName}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {comp ? `Company ${comp.verificationStatus}` : 'Recruiter'}
                        </p>
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="text-xs font-mono text-[var(--text-primary)]">
                          {item.stipendDisplay}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {item.workMode} · {item.location}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-[var(--text-muted)]">
                        {formatDate(item.deadline)}
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusLabel status={item.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setReviewItem(item);
                            setReason(item.rejectionReason || '');
                          }}
                          className="px-3 py-1.5 text-xs font-semibold mono-btn-primary"
                        >
                          Review
                        </button>
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

      {/* Review Modal */}
      {reviewItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[var(--overlay-backdrop)] backdrop-blur-[2px] flex items-center justify-center p-4"
        >
          <div className="mono-card max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto udaan-fade-in">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  {reviewItem.title}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {reviewItem.companyName} · {reviewItem.category} · {reviewItem.duration}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReviewItem(null)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-[var(--text-muted)]">Stipend</p>
                <p className="font-mono font-medium text-[var(--text-primary)] mt-0.5">
                  {reviewItem.stipendDisplay}
                </p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Work Mode</p>
                <p className="font-medium text-[var(--text-primary)] mt-0.5">
                  {reviewItem.workMode}
                </p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Openings</p>
                <p className="font-mono font-medium text-[var(--text-primary)] mt-0.5">
                  {reviewItem.openings}
                </p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Deadline</p>
                <p className="font-mono font-medium text-[var(--text-primary)] mt-0.5">
                  {formatDate(reviewItem.deadline)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-[var(--text-muted)]">Description</p>
              <p className="mt-1 text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-line">
                {reviewItem.description}
              </p>
            </div>

            {reviewItem.responsibilities && (
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)]">Responsibilities</p>
                <p className="mt-1 text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-line">
                  {reviewItem.responsibilities}
                </p>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-[var(--text-muted)]">
                Required Skills & Eligibility
              </p>
              <p className="mt-1 text-xs text-[var(--text-primary)]">
                {(reviewItem.skills || []).join(' · ')}
                {reviewItem.minCgpa ? ` · Min CGPA ${reviewItem.minCgpa}` : ''}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Review Note / Rejection Reason
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Required when rejecting a posting; optional note for closure..."
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => handleDecision('closed')}
                className="px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] border border-dashed border-[var(--border-color)] rounded-[10px] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] disabled:opacity-50 transition-colors"
              >
                Close Posting
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleDecision('rejected')}
                className="px-3.5 py-2 text-xs font-medium mono-btn-secondary disabled:opacity-50"
              >
                Reject
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleDecision('approved')}
                className="px-4 py-2 text-xs font-semibold mono-btn-primary disabled:opacity-50"
              >
                {busy ? 'Processing...' : 'Approve & Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AdminApplicationsPage: React.FC = () => {
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [queryText, setQueryText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDateFilter, setToDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedApp, setSelectedApp] = useState<ApplicationRecord | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      setApplications(await listAllApplications());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load applications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    return applications.filter((app) => {
      if (statusFilter !== 'all' && app.status !== statusFilter) return false;
      const appDate = toDate(app.appliedAt);
      if (fromDate && appDate && appDate < new Date(fromDate)) return false;
      if (toDateFilter && appDate && appDate > new Date(`${toDateFilter}T23:59:59`)) return false;
      if (!q) return true;
      return (
        app.studentName.toLowerCase().includes(q) ||
        app.companyName.toLowerCase().includes(q) ||
        app.internshipTitle.toLowerCase().includes(q) ||
        (app.studentCollege || '').toLowerCase().includes(q)
      );
    });
  }, [applications, queryText, statusFilter, fromDate, toDateFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return <LoadingSkeleton rows={6} />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  return (
    <div className="space-y-6 udaan-fade-in">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
          Application Monitoring
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Read-only institutional oversight of all student applications and status transitions. Recruiter selection decisions remain immutable to preserve hiring integrity.
        </p>
      </div>

      <div className="mono-card p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={queryText}
            onChange={(e) => {
              setQueryText(e.target.value);
              setPage(1);
            }}
            placeholder="Search student, company, or internship..."
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
          <option value="all">All Statuses</option>
          <option value="Applied">Applied</option>
          <option value="Under Review">Under Review</option>
          <option value="Shortlisted">Shortlisted</option>
          <option value="Interview Scheduled">Interview Scheduled</option>
          <option value="Selected">Selected</option>
          <option value="Rejected">Rejected</option>
          <option value="Withdrawn">Withdrawn</option>
        </select>
        <div className="flex items-center gap-2">
          <input
            type="date"
            aria-label="From date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full px-2 py-2 text-xs border border-[var(--border-color)] rounded-[10px]"
          />
          <input
            type="date"
            aria-label="To date"
            value={toDateFilter}
            onChange={(e) => setToDateFilter(e.target.value)}
            className="w-full px-2 py-2 text-xs border border-[var(--border-color)] rounded-[10px]"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No matching applications"
          description="Try broadening your status or date range filters."
        />
      ) : (
        <div className="mono-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)] text-xs text-[var(--text-muted)]">
                  <th className="py-3 px-4 font-medium">Student</th>
                  <th className="py-3 px-4 font-medium">Internship & Company</th>
                  <th className="py-3 px-4 font-medium">Applied</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {paged.map((app) => (
                  <tr
                    key={app.applicationId}
                    className="hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-[var(--text-primary)]">{app.studentName}</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {app.studentCollege} · CGPA {app.studentCgpa?.toFixed(2)}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="text-xs font-semibold text-[var(--text-primary)]">
                        {app.internshipTitle}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">{app.companyName}</p>
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-[var(--text-muted)]">
                      {formatDate(app.appliedAt)}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusLabel status={app.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedApp(app)}
                        className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        View History
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

      {selectedApp && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[var(--overlay-backdrop)] backdrop-blur-[2px] flex justify-end"
        >
          <div className="bg-[var(--bg-card)] w-full max-w-xl h-full overflow-y-auto border-l border-[var(--border-color)] p-6 space-y-6 udaan-fade-in">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
              <div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">
                  {selectedApp.studentName}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {selectedApp.internshipTitle} · {selectedApp.companyName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApp(null)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-elevated)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ApplicationTimeline status={selectedApp.status} />

            {selectedApp.coverLetter && (
              <div>
                <p className="text-xs font-medium text-[var(--text-muted)]">
                  Cover Letter / Application Message
                </p>
                <p className="mt-1.5 text-sm text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-4 rounded-[10px] leading-relaxed">
                  {selectedApp.coverLetter}
                </p>
              </div>
            )}

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                Status History
              </h4>
              <div className="space-y-3 border-l border-[var(--border-color)] pl-3.5">
                {(selectedApp.statusHistory || []).map((entry, i) => (
                  <div key={i} className="py-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <StatusLabel status={entry.status} />
                      <span className="text-xs font-mono text-[var(--text-muted)]">
                        {formatDateTime(entry.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">
                      {entry.note || 'Status updated'} · Actor role: {entry.actorRole}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AdminInterviewsPage: React.FC = () => {
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      setInterviews(await listAllInterviews());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load interviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = interviews.filter((i) => statusFilter === 'all' || i.status === statusFilter);

  if (loading) return <LoadingSkeleton rows={5} />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  return (
    <div className="space-y-6 udaan-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
            Scheduled Interviews
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Platform-wide interview schedule across all active recruiters and candidates.
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
        >
          <option value="all">All Statuses</option>
          <option value="Scheduled">Scheduled</option>
          <option value="Rescheduled">Rescheduled</option>
          <option value="Completed">Completed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No interviews recorded"
          description="When recruiters schedule candidate interviews, they appear here in real time."
        />
      ) : (
        <div className="mono-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)] text-xs text-[var(--text-muted)]">
                  <th className="py-3 px-4 font-medium">Candidate & Role</th>
                  <th className="py-3 px-4 font-medium">Company & Interviewer</th>
                  <th className="py-3 px-4 font-medium">Schedule</th>
                  <th className="py-3 px-4 font-medium">Mode</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filtered.map((iv) => (
                  <tr
                    key={iv.interviewId}
                    className="hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <p className="font-medium text-[var(--text-primary)]">{iv.studentName}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{iv.internshipTitle}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="text-xs font-medium text-[var(--text-primary)]">
                        {iv.companyName}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Interviewer: {iv.interviewer}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-[var(--text-primary)]">
                      {formatDate(iv.interviewDate)} · {iv.startTime}–{iv.endTime}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[var(--text-secondary)]">{iv.mode}</td>
                    <td className="py-3.5 px-4">
                      <StatusLabel status={iv.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export const AdminMonitoringPage: React.FC = () => {
  const [records, setRecords] = useState<InternshipProgressRecord[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [prog, fbk] = await Promise.all([listAllProgress(), listAllFeedback()]);
      setRecords(prog);
      setFeedbacks(fbk);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load internship monitoring records.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = records.filter(
    (r) => statusFilter === 'all' || r.progressStatus === statusFilter
  );

  if (loading) return <LoadingSkeleton rows={5} />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  return (
    <div className="space-y-6 udaan-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
            Internship Completion Monitoring
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Track selected students from onboarding through mentor sign-off, deliverables, and final evaluation.
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
        >
          <option value="all">All Progress Statuses</option>
          <option value="Not Started">Not Started</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
          <option value="Incomplete">Incomplete</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No active internship progress records"
          description="Progress records are created automatically when recruiters mark a candidate as Selected."
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((rec) => {
            const doneMilestones = (rec.milestones || []).filter((m) => m.completed).length;
            const totalMilestones = (rec.milestones || []).length;
            const recFeedback = feedbacks.filter((f) => f.applicationId === rec.applicationId);

            return (
              <div key={rec.progressId} className="mono-card p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      {rec.studentName} — {rec.internshipTitle}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {rec.companyName} · Mentor: {rec.mentorName || 'Unassigned'}
                    </p>
                  </div>
                  <StatusLabel status={rec.progressStatus} />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-y border-[var(--border-subtle)] py-3">
                  <div>
                    <p className="text-[var(--text-muted)]">Start Date</p>
                    <p className="font-mono text-[var(--text-primary)] mt-0.5">
                      {formatDate(rec.startDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)]">Expected End</p>
                    <p className="font-mono text-[var(--text-primary)] mt-0.5">
                      {formatDate(rec.endDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)]">Milestones</p>
                    <p className="font-mono text-[var(--text-primary)] mt-0.5">
                      {doneMilestones} / {totalMilestones} completed
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)]">Completion Confirmed</p>
                    <p className="font-medium text-[var(--text-primary)] mt-0.5 flex items-center gap-1">
                      {rec.completionConfirmed ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-[var(--text-primary)]" />
                          {rec.actualCompletionDate
                            ? formatDate(rec.actualCompletionDate)
                            : 'Confirmed'}
                        </>
                      ) : (
                        'Pending'
                      )}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="font-semibold text-[var(--text-primary)] mb-1.5">
                      Submitted Documents
                    </p>
                    {(rec.documents || []).length === 0 ? (
                      <p className="text-[var(--text-muted)]">No reports uploaded yet.</p>
                    ) : (
                      <ul className="space-y-1">
                        {rec.documents.map((d) => (
                          <li key={d.id} className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                            <a
                              href={d.referenceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[var(--text-primary)] hover:underline underline-offset-2 inline-flex items-center gap-1"
                            >
                              {d.title} <ExternalLink className="w-3 h-3" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div>
                    <p className="font-semibold text-[var(--text-primary)] mb-1.5">
                      Recruiter Feedback
                    </p>
                    {recFeedback.length === 0 ? (
                      <p className="text-[var(--text-muted)]">No evaluation recorded yet.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {recFeedback.map((fb) => (
                          <div
                            key={fb.feedbackId}
                            className="bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-2.5 rounded-[10px]"
                          >
                            <p className="font-medium text-[var(--text-primary)]">
                              {fb.stage.toUpperCase()} · {fb.rating}/5 · {fb.recommendation}
                            </p>
                            <p className="text-[var(--text-secondary)] mt-0.5">{fb.comments}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
