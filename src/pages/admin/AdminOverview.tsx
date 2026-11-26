import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Database, RefreshCw, ArrowRight, ShieldCheck, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  listActivityLogs,
  listAllCompanyProfiles,
  listAllStudentProfiles,
  recomputePlatformStats,
} from '../../services/adminService';
import { listAllInternships } from '../../services/internshipService';
import { listAllApplications } from '../../services/applicationService';
import { seedDemoEcosystem } from '../../services/seedService';
import type {
  ActivityLogRecord,
  ApplicationRecord,
  CompanyProfile,
  InternshipRecord,
  StudentProfile,
} from '../../types';
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  StatCard,
  StatusLabel,
} from '../../components/ui/Primitives';
import { formatDateTime } from '../../utils/formatters';

export const AdminOverview: React.FC = () => {
  const { userRecord } = useAuth();
  const { theme } = useTheme();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [internships, setInternships] = useState<InternshipRecord[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [logs, setLogs] = useState<ActivityLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [syncingStats, setSyncingStats] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [stu, comp, ints, apps, act] = await Promise.all([
        listAllStudentProfiles(),
        listAllCompanyProfiles(),
        listAllInternships(),
        listAllApplications(),
        listActivityLogs(),
      ]);
      setStudents(stu);
      setCompanies(comp);
      setInternships(ints);
      setApplications(apps);
      setLogs(act);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load administrator overview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSeedDemo = async () => {
    if (!userRecord) return;
    setSeeding(true);
    try {
      const res = await seedDemoEcosystem(userRecord.uid, userRecord.fullName);
      toast.success(`Demo dataset synced (${res.seededCount} records, labeled as demo).`);
      await loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to seed demo ecosystem.');
    } finally {
      setSeeding(false);
    }
  };

  const handleSyncStats = async () => {
    setSyncingStats(true);
    try {
      await recomputePlatformStats();
      toast.success('Public platform statistics synchronized with Firestore.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to refresh public stats.');
    } finally {
      setSyncingStats(false);
    }
  };

  const verifiedCompanies = companies.filter((c) => c.verificationStatus === 'verified');
  const pendingCompanies = companies.filter((c) => c.verificationStatus === 'pending');
  const pendingInternships = internships.filter(
    (i) => i.approvalStatus === 'pending' || i.status === 'pending_approval'
  );
  const selectedApps = applications.filter((a) => a.status === 'Selected');

  const stageChartData = useMemo(() => {
    const stages = ['Applied', 'Under Review', 'Shortlisted', 'Interview Scheduled', 'Selected', 'Rejected'];
    return stages.map((stage) => ({
      stage: stage === 'Interview Scheduled' ? 'Interview' : stage,
      count: applications.filter((a) => a.status === stage).length,
    }));
  }, [applications]);

  const categoryChartData = useMemo(() => {
    const counts = new Map<string, number>();
    internships.forEach((item) => {
      counts.set(item.category, (counts.get(item.category) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);
  }, [internships]);

  const companyActivityData = useMemo(() => {
    const counts = new Map<string, { name: string; internships: number; applications: number }>();
    companies.forEach((c) => {
      counts.set(c.uid, {
        name: c.companyName.replace(' (Demo)', '').slice(0, 18),
        internships: 0,
        applications: 0,
      });
    });
    internships.forEach((i) => {
      const entry = counts.get(i.companyId);
      if (entry) entry.internships += 1;
    });
    applications.forEach((a) => {
      const entry = counts.get(a.companyId);
      if (entry) entry.applications += 1;
    });
    return Array.from(counts.values())
      .sort((a, b) => b.applications - a.applications)
      .slice(0, 6);
  }, [companies, internships, applications]);

  const gridColor = theme === 'dark' ? '#262626' : '#E5E5E5';
  const tickColor = theme === 'dark' ? '#A3A3A3' : '#525252';
  const tickStrongColor = theme === 'dark' ? '#E5E5E5' : '#111111';
  const barPrimary = theme === 'dark' ? '#FFFFFF' : '#111111';
  const barSecondary = theme === 'dark' ? '#D4D4D4' : '#404040';
  const barTertiary = theme === 'dark' ? '#A3A3A3' : '#666666';
  const tooltipStyle = {
    backgroundColor: theme === 'dark' ? '#171717' : '#FFFFFF',
    border: `1px solid ${theme === 'dark' ? '#303030' : '#D4D4D4'}`,
    borderRadius: '10px',
    color: theme === 'dark' ? '#FFFFFF' : '#111111',
    fontSize: '12px',
  };
  const cursorStyle = {
    fill: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(17,17,17,0.05)',
  };

  if (loading) return <LoadingSkeleton rows={6} />;
  if (error) return <ErrorState message={error} onRetry={loadAll} />;

  const hasDemoRecords =
    students.some((s) => s.isDemo) || companies.some((c) => c.isDemo);

  return (
    <div className="space-y-8 udaan-fade-in">
      {/* Header & Operational Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--text-primary)] tracking-tight">
            Administration Overview
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Live campus internship metrics, verification queues, and institutional audit trail.
            {hasDemoRecords && ' Includes clearly labeled demonstration records.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={syncingStats}
            onClick={handleSyncStats}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium mono-btn-secondary disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncingStats ? 'animate-spin' : ''}`} />
            {syncingStats ? 'Syncing...' : 'Sync Public Stats'}
          </button>
          <button
            type="button"
            disabled={seeding}
            onClick={handleSeedDemo}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold mono-btn-primary disabled:opacity-50"
          >
            <Database className="w-3.5 h-3.5" />
            {seeding ? 'Seeding Demo Data...' : 'Seed Demo Dataset'}
          </button>
        </div>
      </div>

      {/* 8 Core KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={students.length} detail="Registered profiles" />
        <StatCard label="Total Companies" value={companies.length} detail="Recruiter accounts" />
        <StatCard
          label="Verified Companies"
          value={verifiedCompanies.length}
          detail="Authorized to publish"
        />
        <StatCard
          label="Pending Verifications"
          value={pendingCompanies.length}
          detail="Awaiting admin review"
        />
        <StatCard label="Total Internships" value={internships.length} detail="All statuses" />
        <StatCard
          label="Pending Approvals"
          value={pendingInternships.length}
          detail="Postings in queue"
        />
        <StatCard label="Total Applications" value={applications.length} detail="Across all roles" />
        <StatCard
          label="Selected Students"
          value={selectedApps.length}
          detail="Confirmed offers"
        />
      </div>

      {/* Priority Review Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="mono-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[var(--text-secondary)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Company Verification Queue ({pendingCompanies.length})
              </h3>
            </div>
            <Link
              to="/admin/verifications"
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Review queue <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {pendingCompanies.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] py-4">
              All submitted company profiles have been reviewed.
            </p>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {pendingCompanies.slice(0, 4).map((c) => (
                <div key={c.uid} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {c.companyName}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] truncate">
                      {c.industry} · {c.headquarters || 'Location pending'}
                    </p>
                  </div>
                  <StatusLabel status={c.verificationStatus} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mono-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-[var(--text-secondary)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Internship Approval Queue ({pendingInternships.length})
              </h3>
            </div>
            <Link
              to="/admin/approvals"
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Open approvals <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {pendingInternships.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] py-4">
              No internship postings are awaiting approval right now.
            </p>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {pendingInternships.slice(0, 4).map((item) => (
                <div key={item.internshipId} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {item.title}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] truncate">
                      {item.companyName} · {item.category} · {item.stipendDisplay}
                    </p>
                  </div>
                  <StatusLabel status={item.approvalStatus} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="mono-card p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Application Funnel Distribution
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Live count by selection stage
          </p>
          <div className="mt-5 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageChartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="stage"
                  tick={{ fontSize: 11, fill: tickColor }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: tickColor }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={cursorStyle} />
                <Bar dataKey="count" fill={barPrimary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mono-card p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Internships by Category
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Distribution across technical and business tracks
          </p>
          <div className="mt-5 h-60">
            {categoryChartData.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] pt-8 text-center">
                No internships posted yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryChartData}
                  layout="vertical"
                  margin={{ top: 4, right: 12, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: tickColor }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    width={105}
                    tick={{ fontSize: 11, fill: tickStrongColor }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={tooltipStyle} cursor={cursorStyle} />
                  <Bar dataKey="count" fill={barSecondary} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="mono-card p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Company Recruitment Activity
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Applications received per company
          </p>
          <div className="mt-5 h-60">
            {companyActivityData.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] pt-8 text-center">
                No company records yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={companyActivityData}
                  margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: tickColor }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: tickColor }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={tooltipStyle} cursor={cursorStyle} />
                  <Bar dataKey="applications" name="Applications" fill={barTertiary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Audit Activity Log */}
      <div className="mono-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Recent Institutional Activity
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Immutable audit records for verifications, approvals, and workflow updates
            </p>
          </div>
          <Link
            to="/admin/reports"
            className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Open reports →
          </Link>
        </div>

        {logs.length === 0 ? (
          <EmptyState
            title="No audit activity recorded yet"
            description="Administrative actions, company verifications, and student applications will appear here automatically."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-xs text-[var(--text-muted)]">
                  <th className="py-2.5 pr-4 font-medium">Action</th>
                  <th className="py-2.5 pr-4 font-medium">Actor</th>
                  <th className="py-2.5 pr-4 font-medium">Entity</th>
                  <th className="py-2.5 pr-4 font-medium">Details</th>
                  <th className="py-2.5 font-medium text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {logs.slice(0, 10).map((log) => (
                  <tr
                    key={log.activityId}
                    className="hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <td className="py-3 pr-4 font-medium text-[var(--text-primary)] whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="py-3 pr-4 text-xs text-[var(--text-secondary)] whitespace-nowrap">
                      {log.actorName} ({log.actorRole})
                    </td>
                    <td className="py-3 pr-4 text-xs font-mono text-[var(--text-primary)] uppercase">
                      {log.entityType}
                    </td>
                    <td className="py-3 pr-4 text-xs text-[var(--text-secondary)] max-w-xs truncate">
                      {log.details || '—'}
                    </td>
                    <td className="py-3 text-xs font-mono tabular-nums text-[var(--text-muted)] text-right whitespace-nowrap">
                      {formatDateTime(log.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
