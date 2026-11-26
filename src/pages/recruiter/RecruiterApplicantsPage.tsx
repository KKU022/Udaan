import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Download, Search, X, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import {
  EmptyState,
  LoadingSkeleton,
  StatusLabel,
  UserAvatar,
} from '../../components/ui/Primitives';
import { ConnectedAccountsSection } from '../../components/ConnectedAccountsSection';
import {
  listCompanyApplications,
  updateApplicationStatusByRecruiter,
} from '../../services/applicationService';
import { listCompanyInternships } from '../../services/internshipService';
import { getResumeById, getStudentPublicProfile } from '../../services/studentService';
import type {
  ApplicationRecord,
  ApplicationStatus,
  InternshipRecord,
  StudentPublicProfile,
} from '../../types';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { isSafeExternalUrl } from '../../schemas/validation';

const PIPELINE_COLUMNS: ApplicationStatus[] = [
  'Applied',
  'Under Review',
  'Shortlisted',
  'Interview Scheduled',
  'Selected',
  'Rejected',
];

export const RecruiterApplicantsPage: React.FC<{ shortlistedOnly?: boolean }> = ({
  shortlistedOnly = false,
}) => {
  const { userRecord, companyProfile } = useAuth();
  const navigate = useNavigate();

  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [internships, setInternships] = useState<InternshipRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [viewMode, setViewMode] = useState<'table' | 'pipeline'>('table');
  const [search, setSearch] = useState('');
  const [internshipFilter, setInternshipFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<string>(shortlistedOnly ? 'Shortlisted' : 'All');
  const [sortBy, setSortBy] = useState<'latest' | 'cgpa'>('latest');

  const [selectedApp, setSelectedApp] = useState<ApplicationRecord | null>(null);
  const [studentPublic, setStudentPublic] = useState<StudentPublicProfile | null>(null);
  const [joiningInfo, setJoiningInfo] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [updating, setUpdating] = useState(false);

  const loadData = async () => {
    if (!userRecord) return;
    setLoading(true);
    try {
      const [apps, ints] = await Promise.all([
        listCompanyApplications(userRecord.uid),
        listCompanyInternships(userRecord.uid),
      ]);
      setApplications(apps);
      setInternships(ints);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRecord?.uid]);

  useEffect(() => {
    setStatusFilter(shortlistedOnly ? 'Shortlisted' : 'All');
  }, [shortlistedOnly]);

  const openApplicant = async (app: ApplicationRecord) => {
    setSelectedApp(app);
    setJoiningInfo(app.joiningInfo || '');
    setStatusNote('');
    setStudentPublic(null);
    try {
      const pub = await getStudentPublicProfile(app.studentId);
      setStudentPublic(pub);
    } catch {
      // Fall back to snapshot fields on application
    }
  };

  const handleDownloadResume = async (app: ApplicationRecord) => {
    if (app.resumeUrl && app.resumeUrl.startsWith('http')) {
      const link = document.createElement('a');
      link.href = app.resumeUrl;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.download = app.resumeName || 'resume.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }
    if (app.resumeId) {
      try {
        const docData = await getResumeById(app.resumeId);
        const href = docData?.downloadUrl || docData?.dataUrl;
        if (href) {
          const link = document.createElement('a');
          link.href = href;
          link.download = docData.fileName || 'resume.pdf';
          link.target = '_blank';
          link.rel = 'noreferrer';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          return;
        }
      } catch {
        // Handled below
      }
    }
    toast.info('No downloadable PDF attached for this application.');
  };

  const handleTransition = async (
    app: ApplicationRecord,
    nextStatus: Exclude<ApplicationStatus, 'Applied' | 'Withdrawn'>
  ) => {
    if (!userRecord) return;
    setUpdating(true);
    try {
      await updateApplicationStatusByRecruiter({
        application: app,
        recruiterId: userRecord.uid,
        recruiterName: companyProfile?.companyName || userRecord.fullName,
        nextStatus,
        note: statusNote || undefined,
        joiningInfo: nextStatus === 'Selected' ? joiningInfo : undefined,
      });
      toast.success(`${app.studentName} moved to ${nextStatus}. Student notified.`);
      setSelectedApp(null);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to update status.');
    } finally {
      setUpdating(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = applications.filter((app) => {
      if (shortlistedOnly && !['Shortlisted', 'Interview Scheduled', 'Selected'].includes(app.status)) {
        return false;
      }
      if (internshipFilter !== 'All' && app.internshipId !== internshipFilter) return false;
      if (!shortlistedOnly && statusFilter !== 'All' && app.status !== statusFilter) return false;
      if (q) {
        const hay = `${app.studentName} ${app.studentCollege || ''} ${app.studentBranch || ''} ${(app.studentSkills || []).join(' ')} ${app.internshipTitle}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (sortBy === 'cgpa') {
      return [...list].sort((a, b) => (b.studentCgpa || 0) - (a.studentCgpa || 0));
    }
    return list;
  }, [applications, internshipFilter, statusFilter, search, sortBy, shortlistedOnly]);

  if (loading) return <LoadingSkeleton rows={5} />;

  return (
    <div className="space-y-6 udaan-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
            {shortlistedOnly ? 'Shortlisted & Advancing Candidates' : 'Applicant Management & Pipeline'}
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Review candidate profiles, download resumes, shortlist applicants, and update selection decisions.
          </p>
        </div>

        <div className="inline-flex p-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[10px] text-xs self-start">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              viewMode === 'table'
                ? 'bg-[var(--action-bg)] text-[var(--action-text)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Table View
          </button>
          <button
            type="button"
            onClick={() => setViewMode('pipeline')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              viewMode === 'pipeline'
                ? 'bg-[var(--action-bg)] text-[var(--action-text)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Pipeline Board
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mono-card p-4 grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-4 relative">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student, skills, college..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
          />
        </div>
        <div className="md:col-span-3">
          <select
            value={internshipFilter}
            onChange={(e) => setInternshipFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
          >
            <option value="All">All Internships</option>
            {internships.map((i) => (
              <option key={i.internshipId} value={i.internshipId}>
                {i.title}
              </option>
            ))}
          </select>
        </div>
        {!shortlistedOnly && (
          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
            >
              <option value="All">All Statuses</option>
              {PIPELINE_COLUMNS.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
              <option value="Withdrawn">Withdrawn</option>
            </select>
          </div>
        )}
        <div className="md:col-span-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'latest' | 'cgpa')}
            className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
          >
            <option value="latest">Sort: Latest</option>
            <option value="cgpa">Highest CGPA</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No applicants found"
          description="Applications submitted to your approved internships will appear here immediately."
        />
      ) : viewMode === 'table' ? (
        <div className="mono-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)] text-xs text-[var(--text-muted)]">
                  <th className="py-3 px-4 font-medium">Student</th>
                  <th className="py-3 px-4 font-medium">Internship</th>
                  <th className="py-3 px-4 font-medium text-right">CGPA</th>
                  <th className="py-3 px-4 font-medium">Skills</th>
                  <th className="py-3 px-4 font-medium">Applied</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filtered.map((app) => (
                  <tr
                    key={app.applicationId}
                    className="hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-[var(--text-primary)]">{app.studentName}</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {app.studentCollege} · {app.studentBranch}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-medium text-[var(--text-secondary)]">
                      {app.internshipTitle}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs font-semibold text-[var(--text-primary)]">
                      {app.studentCgpa?.toFixed(2) ?? '—'}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-[var(--text-secondary)] max-w-[200px] truncate">
                      {(app.studentSkills || []).slice(0, 3).join(' · ') || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono tabular-nums text-[var(--text-muted)]">
                      {formatDate(app.appliedAt)}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusLabel status={app.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => void openApplicant(app)}
                        className="px-3 py-1.5 text-xs font-semibold mono-btn-primary"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {PIPELINE_COLUMNS.map((col) => {
            const colApps = filtered.filter((a) => a.status === col);
            return (
              <div key={col} className="mono-card p-4 space-y-3">
                <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border-subtle)]">
                  <StatusLabel status={col} />
                  <span className="font-mono tabular-nums text-xs text-[var(--text-muted)]">
                    {colApps.length}
                  </span>
                </div>
                {colApps.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)] py-4 text-center">No candidates</p>
                ) : (
                  <div className="space-y-2.5">
                    {colApps.map((app) => (
                      <div
                        key={app.applicationId}
                        className="p-3 rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                              {app.studentName}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)] truncate">
                              {app.internshipTitle}
                            </p>
                          </div>
                          <span className="font-mono tabular-nums text-xs text-[var(--text-primary)] shrink-0">
                            {app.studentCgpa?.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => void openApplicant(app)}
                            className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          >
                            Inspect & Move →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Applicant Details Drawer */}
      {selectedApp && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[var(--overlay-backdrop)] backdrop-blur-[2px] flex justify-end"
        >
          <div className="bg-[var(--bg-card)] border-l border-[var(--border-color)] w-full max-w-xl h-full overflow-y-auto p-6 sm:p-7 flex flex-col justify-between udaan-fade-in">
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
                <div className="flex items-center gap-3">
                  <UserAvatar name={selectedApp.studentName} size="md" />
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                      {selectedApp.studentName}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {selectedApp.studentCollege} · {selectedApp.studentBranch} · CGPA{' '}
                      <span className="font-mono tabular-nums font-semibold text-[var(--text-primary)]">
                        {selectedApp.studentCgpa?.toFixed(2) ?? '—'}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close drawer"
                  onClick={() => setSelectedApp(null)}
                  className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div>
                  <p className="text-[var(--text-muted)]">Applied Role</p>
                  <p className="font-semibold text-[var(--text-primary)] mt-0.5">
                    {selectedApp.internshipTitle}
                  </p>
                </div>
                <StatusLabel status={selectedApp.status} />
              </div>

              {/* Resume & Career Passport Actions */}
              <div className="p-4 rounded-[10px] bg-[var(--bg-secondary)] border border-[var(--border-color)] flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                    {selectedApp.resumeName || 'Candidate Resume'}
                  </p>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Applied on {formatDateTime(selectedApp.appliedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {studentPublic?.publicSlug && studentPublic?.isPassportPublic !== false && (
                    <a
                      href={`/passport/${studentPublic.publicSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold mono-btn-primary"
                    >
                      <Award className="w-3.5 h-3.5" />
                      Career Passport
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleDownloadResume(selectedApp)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium mono-btn-secondary"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Resume
                  </button>
                </div>
              </div>

              {/* Skills & Public Career Passport Details */}
              <div className="space-y-4 text-xs">
                {studentPublic?.headline && (
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {studentPublic.headline}
                  </p>
                )}

                <div>
                  <p className="font-semibold text-[var(--text-primary)] mb-1">Skills</p>
                  <p className="text-[var(--text-secondary)]">
                    {(studentPublic?.skills || selectedApp.studentSkills || []).join(' · ') ||
                      'None listed'}
                  </p>
                </div>

                {selectedApp.coverLetter && (
                  <div>
                    <p className="font-semibold text-[var(--text-primary)] mb-1">Cover Letter</p>
                    <p className="text-[var(--text-secondary)] whitespace-pre-line leading-relaxed bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-3 rounded-[10px]">
                      {selectedApp.coverLetter}
                    </p>
                  </div>
                )}

                {studentPublic?.projects && studentPublic.projects.length > 0 && (
                  <div>
                    <p className="font-semibold text-[var(--text-primary)] mb-1.5">
                      Academic & Technical Projects
                    </p>
                    <div className="space-y-2">
                      {studentPublic.projects.map((p, idx) => (
                        <div
                          key={idx}
                          className="p-3 border border-[var(--border-color)] bg-[var(--bg-secondary)] rounded-[10px]"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-[var(--text-primary)]">{p.title}</p>
                            <div className="flex items-center gap-2">
                              {isSafeExternalUrl(p.githubUrl) && (
                                <a
                                  href={p.githubUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2"
                                >
                                  GitHub
                                </a>
                              )}
                              {isSafeExternalUrl(p.liveUrl || p.link) && (
                                <a
                                  href={p.liveUrl || p.link}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[var(--text-primary)] hover:underline underline-offset-2 font-medium"
                                >
                                  Live
                                </a>
                              )}
                            </div>
                          </div>
                          <p className="text-[var(--text-muted)] font-mono text-[11px] mt-0.5">
                            {p.techStack}
                          </p>
                          <p className="text-[var(--text-secondary)] mt-1">{p.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {studentPublic?.achievements && studentPublic.achievements.length > 0 && (
                  <div>
                    <p className="font-semibold text-[var(--text-primary)] mb-1.5">Achievements</p>
                    <ul className="space-y-1 text-[var(--text-secondary)]">
                      {studentPublic.achievements.map((ach, idx) => (
                        <li key={idx}>
                          • <strong className="text-[var(--text-primary)]">{ach.title}</strong> (
                          {ach.category}
                          {ach.issuer ? ` · ${ach.issuer}` : ''})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {studentPublic && (
                  <div className="pt-2">
                    <p className="font-semibold text-[var(--text-primary)] mb-2">
                      Connected Accounts
                    </p>
                    <ConnectedAccountsSection
                      mode="student"
                      links={{
                        github: studentPublic.socialLinks?.github || studentPublic.githubUrl,
                        linkedin: studentPublic.socialLinks?.linkedin || studentPublic.linkedinUrl,
                        portfolio:
                          studentPublic.socialLinks?.portfolio || studentPublic.portfolioUrl,
                        personalWebsite: studentPublic.socialLinks?.personalWebsite,
                        leetcode: studentPublic.socialLinks?.leetcode,
                        hackerrank: studentPublic.socialLinks?.hackerrank,
                        codechef: studentPublic.socialLinks?.codechef,
                        gfg: studentPublic.socialLinks?.gfg,
                      }}
                      editable={false}
                      showGitHubRepos
                      compact
                    />
                  </div>
                )}
              </div>

              {/* Pipeline Actions */}
              {!['Selected', 'Rejected', 'Withdrawn'].includes(selectedApp.status) ? (
                <div className="pt-4 border-t border-[var(--border-subtle)] space-y-3">
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    Update Application Stage
                  </p>
                  <input
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                    placeholder="Optional evaluation note (recorded in audit history)"
                    className="w-full px-3 py-2 text-xs border border-[var(--border-color)] rounded-[10px]"
                  />
                  <input
                    value={joiningInfo}
                    onChange={(e) => setJoiningInfo(e.target.value)}
                    placeholder="Optional joining instructions (used if selecting candidate)"
                    className="w-full px-3 py-2 text-xs border border-[var(--border-color)] rounded-[10px]"
                  />
                  <div className="flex flex-wrap gap-2 pt-1">
                    {selectedApp.status === 'Applied' && (
                      <button
                        type="button"
                        disabled={updating}
                        onClick={() => void handleTransition(selectedApp, 'Under Review')}
                        className="px-3 py-1.5 text-xs font-medium mono-btn-secondary disabled:opacity-50"
                      >
                        Mark Under Review
                      </button>
                    )}
                    {['Applied', 'Under Review'].includes(selectedApp.status) && (
                      <button
                        type="button"
                        disabled={updating}
                        onClick={() => void handleTransition(selectedApp, 'Shortlisted')}
                        className="px-3 py-1.5 text-xs font-semibold mono-btn-secondary disabled:opacity-50"
                      >
                        Shortlist Candidate
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedApp(null);
                        navigate(`/recruiter/interviews?appId=${selectedApp.applicationId}`);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium mono-btn-secondary"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      Schedule Interview
                    </button>
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => void handleTransition(selectedApp, 'Selected')}
                      className="px-3.5 py-1.5 text-xs font-semibold mono-btn-primary disabled:opacity-50"
                    >
                      Select Candidate
                    </button>
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() => void handleTransition(selectedApp, 'Rejected')}
                      className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] border border-dashed border-[var(--border-color)] rounded-[10px] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)] transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-4 border-t border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]">
                  This application is in terminal status (
                  <strong className="text-[var(--text-primary)]">{selectedApp.status}</strong>).
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
