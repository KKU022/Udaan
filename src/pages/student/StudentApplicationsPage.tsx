import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import {
  ApplicationTimeline,
  ConfirmDialog,
  EmptyState,
  LoadingSkeleton,
  StatusLabel,
} from '../../components/ui/Primitives';
import {
  listStudentApplications,
  withdrawStudentApplication,
} from '../../services/applicationService';
import type { ApplicationRecord, ApplicationStatus } from '../../types';
import { formatDate, formatDateTime } from '../../utils/formatters';

const STATUS_FILTERS: Array<'All' | ApplicationStatus> = [
  'All',
  'Applied',
  'Under Review',
  'Shortlisted',
  'Interview Scheduled',
  'Selected',
  'Rejected',
  'Withdrawn',
];

export const StudentApplicationsPage: React.FC = () => {
  const { userRecord } = useAuth();
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'All' | ApplicationStatus>('All');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [withdrawTarget, setWithdrawTarget] = useState<ApplicationRecord | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  const loadApps = async () => {
    if (!userRecord) return;
    setLoading(true);
    try {
      const list = await listStudentApplications(userRecord.uid);
      setApplications(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadApps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRecord?.uid]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applications.filter((app) => {
      if (statusFilter !== 'All' && app.status !== statusFilter) return false;
      if (q) {
        const text = `${app.internshipTitle} ${app.companyName}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [applications, statusFilter, search]);

  const handleWithdraw = async () => {
    if (!withdrawTarget || !userRecord) return;
    setWithdrawing(true);
    try {
      await withdrawStudentApplication(withdrawTarget, userRecord.uid, userRecord.fullName);
      toast.success('Application withdrawn.');
      setWithdrawTarget(null);
      await loadApps();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to withdraw application.');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="space-y-6 udaan-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
            My Applications
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Track live status transitions, audit history, and selection outcomes across all submissions.
          </p>
        </div>
        <Link
          to="/student/explore"
          className="px-4 py-2 text-xs font-semibold mono-btn-primary self-start sm:self-auto"
        >
          Find More Internships
        </Link>
      </div>

      {/* Filters */}
      <div className="mono-card p-4 space-y-3">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by role or company..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_FILTERS.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-[10px] transition-colors ${
                statusFilter === st
                  ? 'bg-[var(--action-bg)] text-[var(--action-text)]'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No applications match this view"
          description="Apply to approved internships from the discovery page to see live timelines here."
          action={
            <Link
              to="/student/explore"
              className="inline-block px-4 py-2 text-xs font-semibold mono-btn-primary"
            >
              Explore Opportunities
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((app) => {
            const expanded = expandedId === app.applicationId;
            const canWithdraw = !['Selected', 'Rejected', 'Withdrawn'].includes(app.status);
            return (
              <div key={app.applicationId} className="mono-card p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <Link
                      to={`/student/internships/${app.internshipId}`}
                      className="text-base font-semibold text-[var(--text-primary)] hover:underline underline-offset-2"
                    >
                      {app.internshipTitle}
                    </Link>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {app.companyName} · Applied {formatDate(app.appliedAt)} · Updated{' '}
                      {formatDate(app.updatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusLabel status={app.status} />
                    {canWithdraw && (
                      <button
                        type="button"
                        onClick={() => setWithdrawTarget(app)}
                        className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2"
                      >
                        Withdraw
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : app.applicationId)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      {expanded ? 'Hide details' : 'Details'}
                      {expanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
                  <ApplicationTimeline status={app.status} />
                </div>

                {expanded && (
                  <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                    <div className="space-y-2.5">
                      <p className="font-semibold text-[var(--text-primary)]">Submission Details</p>
                      <p className="text-[var(--text-secondary)]">
                        <span className="text-[var(--text-muted)]">Resume attached:</span>{' '}
                        {app.resumeName || 'Profile summary'}
                      </p>
                      {app.coverLetter && (
                        <div>
                          <p className="text-[var(--text-muted)] mb-1">Cover Letter:</p>
                          <p className="text-[var(--text-secondary)] whitespace-pre-line leading-relaxed bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-3 rounded-[10px]">
                            {app.coverLetter}
                          </p>
                        </div>
                      )}
                      {app.joiningInfo && (
                        <div className="p-3 rounded-[10px] bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)]">
                          <p className="font-semibold">Joining Details</p>
                          <p className="mt-1 text-[var(--text-secondary)]">{app.joiningInfo}</p>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="font-semibold text-[var(--text-primary)] mb-2">
                        Status Audit History
                      </p>
                      <ul className="space-y-2.5 border-l border-[var(--border-color)] pl-3">
                        {(app.statusHistory || []).map((ev, i) => (
                          <li key={i}>
                            <p className="font-medium text-[var(--text-primary)]">
                              {ev.status}{' '}
                              <span className="font-normal text-[var(--text-muted)]">
                                ({ev.actorRole})
                              </span>
                            </p>
                            {ev.note && <p className="text-[var(--text-secondary)]">{ev.note}</p>}
                            <p className="text-[11px] font-mono tabular-nums text-[var(--text-muted)]">
                              {formatDateTime(ev.timestamp)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(withdrawTarget)}
        title="Withdraw internship application?"
        description={`Are you sure you want to withdraw your application for ${withdrawTarget?.internshipTitle} at ${withdrawTarget?.companyName}? This action is final and notifies the recruiter.`}
        confirmLabel="Withdraw Application"
        destructive
        busy={withdrawing}
        onConfirm={handleWithdraw}
        onCancel={() => setWithdrawTarget(null)}
      />
    </div>
  );
};
