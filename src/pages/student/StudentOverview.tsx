import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Calendar,
  CheckCircle2,
  Circle,
  Compass,
  Upload,
} from 'lucide-react';
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
  EmptyState,
  LoadingSkeleton,
  StatCard,
  StatusLabel,
  UserAvatar,
} from '../../components/ui/Primitives';
import { listStudentApplications } from '../../services/applicationService';
import { listStudentInterviews } from '../../services/interviewProgressService';
import { listPublishedInternships } from '../../services/internshipService';
import { listSavedInternships } from '../../services/studentService';
import type {
  ApplicationRecord,
  InternshipRecord,
  InterviewRecord,
  SavedInternshipRecord,
} from '../../types';
import { formatDate, toDate } from '../../utils/formatters';

type DiscoveryTab = 'recommended' | 'recent' | 'closing' | 'saved';

export const StudentOverview: React.FC = () => {
  const { userRecord, studentProfile, notifications } = useAuth();
  const { theme } = useTheme();
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [internships, setInternships] = useState<InternshipRecord[]>([]);
  const [savedItems, setSavedItems] = useState<SavedInternshipRecord[]>([]);
  const [discoveryTab, setDiscoveryTab] = useState<DiscoveryTab>('recommended');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userRecord) return;
    let active = true;
    async function load() {
      try {
        const [apps, ivws, openList, saved] = await Promise.all([
          listStudentApplications(userRecord!.uid),
          listStudentInterviews(userRecord!.uid),
          listPublishedInternships(),
          listSavedInternships(userRecord!.uid),
        ]);
        if (!active) return;
        setApplications(apps);
        setInterviews(ivws);
        setInternships(openList);
        setSavedItems(saved);
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
      total: applications.length,
      underReview: applications.filter(
        (a) => a.status === 'Under Review' || a.status === 'Applied'
      ).length,
      shortlisted: applications.filter((a) => a.status === 'Shortlisted').length,
      interviewsScheduled: interviews.filter((i) => i.status === 'Scheduled').length,
      selected: applications.filter((a) => a.status === 'Selected').length,
    }),
    [applications, interviews]
  );

  const chartData = useMemo(
    () => [
      { stage: 'Applied', count: applications.filter((a) => a.status === 'Applied').length },
      { stage: 'Review', count: applications.filter((a) => a.status === 'Under Review').length },
      { stage: 'Shortlisted', count: applications.filter((a) => a.status === 'Shortlisted').length },
      {
        stage: 'Interview',
        count: applications.filter((a) => a.status === 'Interview Scheduled').length,
      },
      { stage: 'Selected', count: applications.filter((a) => a.status === 'Selected').length },
      { stage: 'Rejected', count: applications.filter((a) => a.status === 'Rejected').length },
    ],
    [applications]
  );

  const readinessFactors = useMemo(() => {
    const sp = studentProfile;
    const links = sp?.socialLinks;
    const hasLinks = Boolean(
      links?.github ||
        links?.linkedin ||
        links?.portfolio ||
        sp?.githubUrl ||
        sp?.linkedinUrl ||
        sp?.portfolioUrl
    );
    const factors = [
      {
        label: 'Academic & Identity Profile',
        done: (sp?.profileCompletion ?? 0) >= 80,
        detail: `${sp?.profileCompletion ?? 0}% complete`,
        to: '/student/profile',
      },
      {
        label: 'Verified PDF Resume',
        done: Boolean(sp?.resumeId || sp?.resumeUrl),
        detail: sp?.resumeName ? 'Uploaded' : 'Add PDF resume',
        to: '/student/documents',
      },
      {
        label: 'Technical Skills Coverage',
        done: (sp?.skills?.length ?? 0) >= 4,
        detail: `${sp?.skills?.length ?? 0} skills listed`,
        to: '/student/passport',
      },
      {
        label: 'Project Showcase',
        done: (sp?.projects?.length ?? 0) >= 1,
        detail: `${sp?.projects?.length ?? 0} project${(sp?.projects?.length ?? 0) === 1 ? '' : 's'}`,
        to: '/student/passport',
      },
      {
        label: 'Professional & Code Links',
        done: hasLinks,
        detail: hasLinks ? 'Connected' : 'Link GitHub / LinkedIn',
        to: '/student/passport',
      },
    ];
    const score = Math.round((factors.filter((f) => f.done).length / factors.length) * 100);
    return { factors, score };
  }, [studentProfile]);

  const discoveryItems = useMemo(() => {
    const appliedSet = new Set(applications.map((a) => a.internshipId));
    const mySkills = new Set((studentProfile?.skills || []).map((s) => s.toLowerCase()));

    if (discoveryTab === 'saved') {
      const savedIds = new Set(savedItems.map((s) => s.internshipId));
      return internships.filter((i) => savedIds.has(i.internshipId)).slice(0, 5);
    }

    const openUnapplied = internships.filter((i) => !appliedSet.has(i.internshipId));

    if (discoveryTab === 'recent') {
      return [...openUnapplied]
        .sort((a, b) => {
          const tA = toDate(a.createdAt)?.getTime() ?? 0;
          const tB = toDate(b.createdAt)?.getTime() ?? 0;
          return tB - tA;
        })
        .slice(0, 5);
    }

    if (discoveryTab === 'closing') {
      const now = Date.now();
      return [...openUnapplied]
        .filter((i) => {
          const d = toDate(i.deadline)?.getTime() ?? 0;
          return d >= now;
        })
        .sort((a, b) => {
          const dA = toDate(a.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER;
          const dB = toDate(b.deadline)?.getTime() ?? Number.MAX_SAFE_INTEGER;
          return dA - dB;
        })
        .slice(0, 5);
    }

    return [...openUnapplied]
      .map((i) => ({
        item: i,
        score: (i.skills || []).filter((s) => mySkills.has(s.toLowerCase())).length,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((x) => x.item);
  }, [discoveryTab, internships, applications, savedItems, studentProfile?.skills]);

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

  return (
    <div className="space-y-6 udaan-fade-in">
      {/* Top Personalized Career Workspace Hero */}
      <div className="bg-[#111111] border border-[#303030] text-white rounded-xl p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4 min-w-0">
          <UserAvatar
            name={studentProfile?.fullName || userRecord?.fullName}
            photoURL={studentProfile?.photoURL || userRecord?.photoURL}
            size="lg"
          />
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#A3A3A3]">
              Student Career Workspace
            </p>
            <h2 className="text-2xl font-semibold tracking-tight mt-0.5 truncate text-white">
              Welcome back, {studentProfile?.fullName || userRecord?.fullName}
            </h2>
            <p className="text-xs text-[#A3A3A3] mt-1 truncate">
              {studentProfile?.headline ||
                (studentProfile?.college
                  ? `${studentProfile.college} · ${studentProfile.degree} ${studentProfile.branch}`
                  : 'Complete your Career Passport to stand out to verified hiring teams.')}
            </p>
            <div className="mt-3 flex items-center gap-3 max-w-sm">
              <div className="flex-1 h-1.5 rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full bg-white transition-all"
                  style={{ width: `${readinessFactors.score}%` }}
                />
              </div>
              <span className="text-[11px] font-mono tabular-nums text-[#D4D4D4] shrink-0">
                {readinessFactors.score}% career ready
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            to="/student/explore"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#090909] bg-white hover:bg-[#E5E5E5] rounded-[10px] transition-colors whitespace-nowrap"
          >
            <Compass className="w-3.5 h-3.5" />
            Explore Opportunities
          </Link>
          <Link
            to="/student/passport"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white border border-white/20 hover:bg-white/10 rounded-[10px] transition-colors whitespace-nowrap"
          >
            <Award className="w-3.5 h-3.5" />
            Career Passport
          </Link>
          <Link
            to="/student/documents"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#D4D4D4] border border-white/15 hover:bg-white/10 hover:text-white rounded-[10px] transition-colors whitespace-nowrap"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Resume
          </Link>
        </div>
      </div>

      {/* 5 Core Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Applications" value={metrics.total} />
        <StatCard label="Under Review" value={metrics.underReview} />
        <StatCard label="Shortlisted" value={metrics.shortlisted} />
        <StatCard label="Interviews Scheduled" value={metrics.interviewsScheduled} />
        <StatCard label="Offers / Selected" value={metrics.selected} />
      </div>

      {/* Career Readiness Breakdown + Opportunity Discovery Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 mono-card p-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Career Readiness</h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Recruiter-readiness checklist across 5 core signals
              </p>
            </div>
            <span className="text-lg font-mono tabular-nums font-semibold text-[var(--text-primary)]">
              {readinessFactors.score}%
            </span>
          </div>

          <div className="divide-y divide-[var(--border-subtle)]">
            {readinessFactors.factors.map((factor) => (
              <Link
                key={factor.label}
                to={factor.to}
                className="py-3 flex items-center justify-between gap-3 group hover:bg-[var(--bg-secondary)] -mx-2 px-2 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {factor.done ? (
                    <CheckCircle2 className="w-4 h-4 text-[var(--text-primary)] shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                  )}
                  <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                    {factor.label}
                  </span>
                </div>
                <span className="text-[11px] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] whitespace-nowrap shrink-0">
                  {factor.detail}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="lg:col-span-7 mono-card p-6 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Opportunity Discovery
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Curated verified internships matching your skills and deadlines
              </p>
            </div>
            <Link
              to="/student/explore"
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0"
            >
              Browse all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--border-subtle)] pb-3 mb-3">
            {(
              [
                { id: 'recommended', label: 'Recommended' },
                { id: 'recent', label: 'Recently Added' },
                { id: 'closing', label: 'Closing Soon' },
                { id: 'saved', label: `Saved (${savedItems.length})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDiscoveryTab(tab.id)}
                className={`px-3 py-1.5 rounded-[10px] text-xs font-medium transition-colors ${
                  discoveryTab === tab.id
                    ? 'bg-[var(--action-bg)] text-[var(--action-text)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {discoveryItems.length === 0 ? (
            <div className="py-10 text-center text-xs text-[var(--text-secondary)]">
              {discoveryTab === 'saved'
                ? 'You have not bookmarked any internships yet.'
                : 'No matching open internships in this view right now.'}
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-subtle)]">
              {discoveryItems.map((item) => (
                <Link
                  key={item.internshipId}
                  to={`/student/internships/${item.internshipId}`}
                  className="py-3 flex items-center justify-between gap-4 hover:bg-[var(--bg-secondary)] -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {item.title}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">
                      {item.companyName} · {item.location} · {item.workMode}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-mono tabular-nums font-semibold text-[var(--text-primary)]">
                      {item.stipendDisplay}
                    </p>
                    <p className="text-[11px] font-mono tabular-nums text-[var(--text-muted)]">
                      Due {formatDate(item.deadline)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pipeline Activity Chart + Upcoming Interviews & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 mono-card p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Application Pipeline Activity
          </h3>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Distribution of your submitted applications across recruitment stages
          </p>
          <div className="mt-5 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
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
                <Bar dataKey="count" fill={barColor} radius={[5, 5, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 mono-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Upcoming Interviews
              </h3>
              <Link
                to="/student/interviews"
                className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                View schedule
              </Link>
            </div>

            {interviews.filter((i) => i.status === 'Scheduled').length === 0 ? (
              <p className="text-xs text-[var(--text-muted)] py-6 text-center">
                No upcoming interviews scheduled yet.
              </p>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)]">
                {interviews
                  .filter((i) => i.status === 'Scheduled')
                  .slice(0, 3)
                  .map((ivw) => (
                    <div
                      key={ivw.interviewId}
                      className="py-3 flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                          {ivw.title}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] truncate">
                          {ivw.companyName} · {ivw.mode}
                        </p>
                      </div>
                      <div className="text-right font-mono tabular-nums text-xs text-[var(--text-primary)] shrink-0">
                        <div className="flex items-center gap-1 justify-end">
                          <Calendar className="w-3 h-3 text-[var(--text-secondary)]" />
                          <span>{formatDate(ivw.interviewDate)}</span>
                        </div>
                        <p className="text-[var(--text-muted)]">{ivw.startTime}</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-[var(--border-subtle)]">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-[var(--text-primary)]">
                Recent Notifications
              </h4>
              <Link
                to="/student/notifications"
                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                View all
              </Link>
            </div>
            {notifications.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">No recent notifications.</p>
            ) : (
              <ul className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                {notifications.slice(0, 3).map((n) => (
                  <li key={n.notificationId} className="truncate">
                    <strong className="font-medium text-[var(--text-primary)]">{n.title}:</strong>{' '}
                    {n.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Recent Applications Table */}
      <div className="mono-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recent Applications</h3>
          <Link
            to="/student/applications"
            className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Manage all
          </Link>
        </div>

        {applications.length === 0 ? (
          <EmptyState
            title="No applications submitted yet"
            description="Discover verified internships matched to your skills and submit your first application."
            action={
              <Link
                to="/student/explore"
                className="inline-block px-4 py-2 text-xs font-semibold mono-btn-primary"
              >
                Browse Open Internships
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-xs text-[var(--text-muted)]">
                  <th className="py-2.5 pr-4 font-medium">Role & Company</th>
                  <th className="py-2.5 px-3 font-medium">Applied</th>
                  <th className="py-2.5 pl-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {applications.slice(0, 5).map((app) => (
                  <tr key={app.applicationId} className="hover:bg-[var(--bg-secondary)] transition-colors">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-[var(--text-primary)]">{app.internshipTitle}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{app.companyName}</p>
                    </td>
                    <td className="py-3 px-3 text-xs font-mono tabular-nums text-[var(--text-secondary)] whitespace-nowrap">
                      {formatDate(app.appliedAt)}
                    </td>
                    <td className="py-3 pl-3 text-right">
                      <StatusLabel status={app.status} />
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
