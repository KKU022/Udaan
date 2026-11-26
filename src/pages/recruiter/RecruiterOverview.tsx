import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, AlertTriangle, Calendar } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  LoadingSkeleton,
  StatCard,
  StatusLabel,
} from '../../components/ui/Primitives';
import { listCompanyInternships } from '../../services/internshipService';
import { listCompanyApplications } from '../../services/applicationService';
import { listCompanyInterviews } from '../../services/interviewProgressService';
import type { ApplicationRecord, InternshipRecord, InterviewRecord } from '../../types';
import { formatDate } from '../../utils/formatters';

export const RecruiterOverview: React.FC = () => {
  const { userRecord, companyProfile } = useAuth();
  const { theme } = useTheme();
  const [internships, setInternships] = useState<InternshipRecord[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userRecord) return;
    let active = true;
    async function load() {
      try {
        const [ints, apps, ivws] = await Promise.all([
          listCompanyInternships(userRecord!.uid),
          listCompanyApplications(userRecord!.uid),
          listCompanyInterviews(userRecord!.uid),
        ]);
        if (!active) return;
        setInternships(ints);
        setApplications(apps);
        setInterviews(ivws);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [userRecord]);

  const metrics = useMemo(
    () => ({
      totalInternships: internships.length,
      activeInternships: internships.filter(
        (i) => i.status === 'published' && i.approvalStatus === 'approved'
      ).length,
      totalApplicants: applications.length,
      shortlisted: applications.filter((a) => a.status === 'Shortlisted').length,
      interviewsScheduled: interviews.filter((i) => i.status === 'Scheduled').length,
      selected: applications.filter((a) => a.status === 'Selected').length,
    }),
    [internships, applications, interviews]
  );

  const pipelineChart = useMemo(
    () => [
      { stage: 'Applied', count: applications.filter((a) => a.status === 'Applied').length },
      { stage: 'Review', count: applications.filter((a) => a.status === 'Under Review').length },
      { stage: 'Shortlisted', count: applications.filter((a) => a.status === 'Shortlisted').length },
      { stage: 'Interview', count: applications.filter((a) => a.status === 'Interview Scheduled').length },
      { stage: 'Selected', count: applications.filter((a) => a.status === 'Selected').length },
      { stage: 'Rejected', count: applications.filter((a) => a.status === 'Rejected').length },
    ],
    [applications]
  );

  const gridColor = theme === 'dark' ? '#262626' : '#E5E5E5';
  const tickColor = theme === 'dark' ? '#A3A3A3' : '#525252';
  const barColor = theme === 'dark' ? '#FFFFFF' : '#111111';
  const tooltipStyle = {
    backgroundColor: theme === 'dark' ? '#171717' : '#FFFFFF',
    border: `1px solid ${theme === 'dark' ? '#303030' : '#D4D4D4'}`,
    borderRadius: '10px',
    color: theme === 'dark' ? '#FFFFFF' : '#111111',
    fontSize: '12px',
  };

  if (loading) return <LoadingSkeleton rows={5} />;

  const isVerified = companyProfile?.verificationStatus === 'verified';

  return (
    <div className="space-y-6 udaan-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            {companyProfile?.companyName || userRecord?.fullName}
          </h2>
          <div className="mt-1 flex items-center gap-3 text-xs text-[var(--text-secondary)]">
            <span>{companyProfile?.industry || 'Recruiting Organization'}</span>
            <span aria-hidden="true">·</span>
            <StatusLabel status={companyProfile?.verificationStatus || 'pending'} />
          </div>
        </div>

        <Link
          to="/recruiter/post"
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold self-start sm:self-auto whitespace-nowrap ${
            isVerified
              ? 'mono-btn-primary'
              : 'rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-muted)] pointer-events-none'
          }`}
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Post Internship
        </Link>
      </div>

      {!isVerified && (
        <div className="mono-card border-[var(--text-muted)] p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[var(--text-primary)] shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <p className="font-semibold text-[var(--text-primary)]">
              Company verification status: {companyProfile?.verificationStatus || 'pending'}
            </p>
            <p className="mt-1 text-[var(--text-secondary)]">
              An institution administrator must verify your company profile before you can submit
              internship postings. Ensure your{' '}
              <Link
                to="/recruiter/profile"
                className="underline underline-offset-2 text-[var(--text-primary)] font-medium"
              >
                company profile
              </Link>{' '}
              is complete.
              {companyProfile?.verificationReason && (
                <> Admin note: {companyProfile.verificationReason}</>
              )}
            </p>
          </div>
        </div>
      )}

      {/* 6 KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total Internships" value={metrics.totalInternships} />
        <StatCard label="Active Published" value={metrics.activeInternships} />
        <StatCard label="Total Applicants" value={metrics.totalApplicants} />
        <StatCard label="Shortlisted" value={metrics.shortlisted} />
        <StatCard label="Interviews" value={metrics.interviewsScheduled} />
        <StatCard label="Selected" value={metrics.selected} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recruitment Pipeline Chart */}
        <div className="lg:col-span-7 mono-card p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Recruitment Pipeline
            </h3>
            <Link
              to="/recruiter/applicants"
              className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Open pipeline
            </Link>
          </div>
          <p className="text-xs text-[var(--text-secondary)]">
            Candidate volume by current application stage
          </p>
          <div className="mt-5 h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineChart} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="stage"
                  tick={{ fontSize: 11, fill: tickColor }}
                  axisLine={{ stroke: gridColor }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: tickColor }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{
                    fill: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(17,17,17,0.05)',
                  }}
                />
                <Bar dataKey="count" fill={barColor} radius={[5, 5, 0, 0]} maxBarSize={38} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Upcoming Interviews */}
        <div className="lg:col-span-5 mono-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Upcoming Interviews
            </h3>
            <Link
              to="/recruiter/interviews"
              className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Manage schedule
            </Link>
          </div>

          {interviews.filter((i) => i.status === 'Scheduled').length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] py-10 text-center">
              No upcoming interviews scheduled.
            </p>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {interviews
                .filter((i) => i.status === 'Scheduled')
                .slice(0, 5)
                .map((ivw) => (
                  <div
                    key={ivw.interviewId}
                    className="py-3 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {ivw.studentName}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] truncate">
                        {ivw.internshipTitle} · {ivw.mode}
                      </p>
                    </div>
                    <div className="text-right font-mono tabular-nums text-xs shrink-0">
                      <div className="flex items-center gap-1 justify-end text-[var(--text-primary)]">
                        <Calendar className="w-3 h-3 text-[var(--text-secondary)]" />
                        {formatDate(ivw.interviewDate)}
                      </div>
                      <p className="text-[var(--text-muted)]">{ivw.startTime}</p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Applicants & Internship Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 mono-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recent Applicants</h3>
            <Link
              to="/recruiter/applicants"
              className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              View all
            </Link>
          </div>
          {applications.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] py-8 text-center">
              No applications received yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-xs text-[var(--text-muted)]">
                    <th className="py-2 pr-3 font-medium">Candidate</th>
                    <th className="py-2 px-3 font-medium">Internship</th>
                    <th className="py-2 px-3 font-medium text-right">CGPA</th>
                    <th className="py-2 pl-3 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {applications.slice(0, 6).map((app) => (
                    <tr
                      key={app.applicationId}
                      className="hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                      <td className="py-2.5 pr-3">
                        <p className="font-medium text-[var(--text-primary)]">{app.studentName}</p>
                        <p className="text-xs text-[var(--text-secondary)]">{app.studentBranch}</p>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-[var(--text-secondary)]">
                        {app.internshipTitle}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-xs text-[var(--text-primary)]">
                        {app.studentCgpa?.toFixed(2) ?? '—'}
                      </td>
                      <td className="py-2.5 pl-3 text-right">
                        <StatusLabel status={app.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 mono-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Internship Performance
            </h3>
            <Link
              to="/recruiter/internships"
              className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Manage
            </Link>
          </div>
          {internships.length === 0 ? (
            <p className="text-xs text-[var(--text-muted)] py-8 text-center">
              No internships created yet.
            </p>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {internships.slice(0, 5).map((item) => {
                const count = applications.filter((a) => a.internshipId === item.internshipId).length;
                return (
                  <div
                    key={item.internshipId}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {item.title}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                        <StatusLabel status={item.status} />
                        <span>· Deadline {formatDate(item.deadline)}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-mono tabular-nums font-semibold text-[var(--text-primary)]">
                        {count}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)]">applicants</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
