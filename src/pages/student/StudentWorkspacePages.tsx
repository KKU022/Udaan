import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookmarkX,
  Calendar,
  Download,
  ExternalLink,
  FileText,
  Trash2,
  Upload,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import {
  ConfirmDialog,
  EmptyState,
  LoadingSkeleton,
  StatusLabel,
} from '../../components/ui/Primitives';
import {
  deleteStudentResume,
  listSavedInternships,
  listStudentResumes,
  toggleSavedInternship,
  uploadStudentResume,
} from '../../services/studentService';
import {
  addStudentProgressDocument,
  addStudentWeeklyUpdate,
  listStudentFeedback,
  listStudentInterviews,
  listStudentProgress,
} from '../../services/interviewProgressService';
import type {
  FeedbackRecord,
  InternshipProgressRecord,
  InternshipRecord,
  InterviewRecord,
  ResumeDocument,
  SavedInternshipRecord,
} from '../../types';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { isSafeExternalUrl } from '../../schemas/validation';

export const StudentSavedPage: React.FC = () => {
  const { userRecord } = useAuth();
  const [saved, setSaved] = useState<SavedInternshipRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!userRecord) return;
    setLoading(true);
    try {
      setSaved(await listSavedInternships(userRecord.uid));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRecord?.uid]);

  const handleRemove = async (item: SavedInternshipRecord) => {
    if (!userRecord) return;
    await toggleSavedInternship(
      userRecord.uid,
      { internshipId: item.internshipId } as InternshipRecord,
      true
    );
    setSaved((prev) => prev.filter((s) => s.savedId !== item.savedId));
    toast.success('Removed bookmark.');
  };

  if (loading) return <LoadingSkeleton rows={3} />;

  return (
    <div className="space-y-6 udaan-fade-in">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
          Saved Internships
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Bookmarked roles saved to your Firestore account for quick review and application.
        </p>
      </div>

      {saved.length === 0 ? (
        <EmptyState
          title="No bookmarked internships"
          description="Bookmark roles while exploring internships so you can compare deadlines and apply later."
          action={
            <Link
              to="/student/explore"
              className="inline-block px-4 py-2 text-xs font-semibold mono-btn-primary"
            >
              Explore Internships
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {saved.map((item) => (
            <div key={item.savedId} className="mono-card p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      to={`/student/internships/${item.internshipId}`}
                      className="text-base font-semibold text-[var(--text-primary)] hover:underline underline-offset-2"
                    >
                      {item.internshipTitle}
                    </Link>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">{item.companyName}</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Remove bookmark"
                    onClick={() => void handleRemove(item)}
                    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
                  >
                    <BookmarkX className="w-4 h-4" />
                  </button>
                </div>
                <p className="mt-3 text-xs text-[var(--text-secondary)]">
                  {item.location} · {item.workMode} ·{' '}
                  <span className="font-mono tabular-nums text-[var(--text-primary)] font-medium">
                    {item.stipendDisplay}
                  </span>
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                <span className="font-mono tabular-nums text-[var(--text-muted)]">
                  Deadline {formatDate(item.deadline)}
                </span>
                <Link
                  to={`/student/internships/${item.internshipId}`}
                  className="px-3 py-1.5 font-semibold mono-btn-primary"
                >
                  Open & Apply
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const StudentInterviewsPage: React.FC = () => {
  const { userRecord } = useAuth();
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  useEffect(() => {
    if (!userRecord) return;
    setLoading(true);
    void listStudentInterviews(userRecord.uid)
      .then(setInterviews)
      .finally(() => setLoading(false));
  }, [userRecord]);

  const groupedByDate = interviews.reduce<Record<string, InterviewRecord[]>>((acc, item) => {
    const key = item.interviewDate || 'Unscheduled';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  if (loading) return <LoadingSkeleton rows={3} />;

  return (
    <div className="space-y-6 udaan-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
            Interview Schedule
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Upcoming and past interviews scheduled directly by recruiting companies.
          </p>
        </div>

        <div className="inline-flex p-1 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[10px] text-xs self-start">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-[var(--action-bg)] text-[var(--action-text)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Upcoming List
          </button>
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              viewMode === 'calendar'
                ? 'bg-[var(--action-bg)] text-[var(--action-text)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Date Board
          </button>
        </div>
      </div>

      {interviews.length === 0 ? (
        <EmptyState
          title="No interviews scheduled yet"
          description="Once a recruiter schedules an interview for one of your applications, meeting details and timings will appear here."
        />
      ) : viewMode === 'list' ? (
        <div className="space-y-4">
          {interviews.map((ivw) => (
            <div key={ivw.interviewId} className="mono-card p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">{ivw.title}</h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {ivw.companyName} · {ivw.internshipTitle} · Interviewer: {ivw.interviewer}
                  </p>
                </div>
                <StatusLabel status={ivw.status} />
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex flex-wrap items-center gap-4 font-mono tabular-nums text-[var(--text-primary)]">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                    {formatDate(ivw.interviewDate)}
                  </span>
                  <span>
                    {ivw.startTime} – {ivw.endTime}
                  </span>
                  <span className="font-sans text-[var(--text-secondary)]">{ivw.mode}</span>
                </div>

                {ivw.mode === 'Online' && isSafeExternalUrl(ivw.meetingLink) ? (
                  <a
                    href={ivw.meetingLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold mono-btn-primary"
                  >
                    Join Meeting
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : ivw.venue ? (
                  <span className="text-[var(--text-secondary)]">Venue: {ivw.venue}</span>
                ) : null}
              </div>

              {ivw.instructions && (
                <p className="mt-3 text-xs text-[var(--text-secondary)] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-3 rounded-[10px]">
                  <span className="font-semibold text-[var(--text-primary)]">Instructions:</span>{' '}
                  {ivw.instructions}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(groupedByDate).map(([dateKey, items]) => (
            <div key={dateKey} className="mono-card p-5">
              <p className="text-xs font-mono tabular-nums font-semibold text-[var(--text-primary)] pb-2 border-b border-[var(--border-subtle)]">
                {formatDate(dateKey, 'EEEE, dd MMM yyyy')}
              </p>
              <div className="mt-3 space-y-3">
                {items.map((ivw) => (
                  <div key={ivw.interviewId} className="text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[var(--text-primary)]">{ivw.title}</span>
                      <span className="font-mono tabular-nums text-[var(--text-muted)]">
                        {ivw.startTime}
                      </span>
                    </div>
                    <p className="text-[var(--text-secondary)]">
                      {ivw.companyName} · {ivw.mode}
                    </p>
                    <StatusLabel status={ivw.status} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const StudentDocumentsPage: React.FC = () => {
  const { userRecord, studentProfile, refreshProfile } = useAuth();
  const [resumes, setResumes] = useState<ResumeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ResumeDocument | null>(null);

  const load = async () => {
    if (!userRecord) return;
    setLoading(true);
    try {
      setResumes(await listStudentResumes(userRecord.uid));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRecord?.uid]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userRecord || !studentProfile) return;
    setUploading(true);
    try {
      await uploadStudentResume(userRecord.uid, file, studentProfile);
      await Promise.all([load(), refreshProfile()]);
      toast.success(`Uploaded "${file.name}" successfully.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const openResume = (res: ResumeDocument) => {
    const href = res.downloadUrl || res.dataUrl;
    if (!href) {
      toast.info('Preview unavailable for this document.');
      return;
    }
    const link = document.createElement('a');
    link.href = href;
    link.download = res.fileName;
    link.target = '_blank';
    link.rel = 'noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-4xl udaan-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
            My Resumes & Documents
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Upload PDF resumes (up to 5 MB). Saved documents can be attached directly during internship applications.
          </p>
        </div>

        <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold mono-btn-primary cursor-pointer self-start sm:self-auto">
          <Upload className="w-3.5 h-3.5" />
          {uploading ? 'Uploading PDF...' : 'Upload PDF Resume'}
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            disabled={uploading}
            onChange={handleUpload}
          />
        </label>
      </div>

      {loading ? (
        <LoadingSkeleton rows={3} />
      ) : resumes.length === 0 ? (
        <EmptyState
          title="No PDF resumes uploaded yet"
          description="Upload your latest resume in PDF format to unlock one-click attachment when applying for internships."
        />
      ) : (
        <div className="mono-card divide-y divide-[var(--border-subtle)] overflow-hidden">
          {resumes.map((res, idx) => (
            <div
              key={res.resumeId}
              className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-3 min-w-0">
                <FileText className="w-5 h-5 text-[var(--text-secondary)] shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                    {res.fileName}
                    {idx === 0 && (
                      <span className="ml-2 text-xs font-medium text-[var(--text-secondary)] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-1.5 py-0.5 rounded">
                        Primary
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] font-mono tabular-nums mt-0.5">
                    {Math.round(res.fileSize / 1024)} KB · Uploaded {formatDateTime(res.uploadedAt)} ·
                    Shared with {res.sharedWithCompanies?.length || 0} companies
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => openResume(res)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium mono-btn-secondary"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(res)}
                  className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
                  aria-label="Delete resume"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete uploaded resume?"
        description={`Remove "${deleteTarget?.fileName}" from your document library?`}
        confirmLabel="Delete Resume"
        destructive
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteStudentResume(deleteTarget);
          setDeleteTarget(null);
          await load();
          toast.success('Resume deleted.');
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export const StudentProgressPage: React.FC = () => {
  const { userRecord } = useAuth();
  const [records, setRecords] = useState<InternshipProgressRecord[]>([]);
  const [feedbackList, setFeedbackList] = useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekLabel, setWeekLabel] = useState('');
  const [weekSummary, setWeekSummary] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docUrl, setDocUrl] = useState('');

  const load = async () => {
    if (!userRecord) return;
    setLoading(true);
    try {
      const [prog, fbk] = await Promise.all([
        listStudentProgress(userRecord.uid),
        listStudentFeedback(userRecord.uid),
      ]);
      setRecords(prog);
      setFeedbackList(fbk);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRecord?.uid]);

  if (loading) return <LoadingSkeleton rows={3} />;

  return (
    <div className="space-y-6 udaan-fade-in">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
          Internship Progress & Feedback
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Track active internship milestones, submit weekly progress updates, and review mentor evaluations.
        </p>
      </div>

      {records.length === 0 ? (
        <EmptyState
          title="No active internships in progress"
          description="Once you are selected for an internship, your mentor assignment, milestones, and weekly progress logs will appear here automatically."
        />
      ) : (
        <div className="space-y-6">
          {records.map((rec) => (
            <div key={rec.progressId} className="mono-card p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
                <div>
                  <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                    {rec.internshipTitle}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {rec.companyName} · Mentor: {rec.mentorName || 'Pending assignment'}
                    {rec.startDate ? ` · ${formatDate(rec.startDate)} – ${formatDate(rec.endDate)}` : ''}
                  </p>
                </div>
                <StatusLabel status={rec.progressStatus} />
              </div>

              {/* Milestones */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                  Milestones
                </h4>
                <div className="space-y-2">
                  {(rec.milestones || []).map((ms) => (
                    <div
                      key={ms.id}
                      className="flex items-center justify-between text-sm py-1.5 border-b border-[var(--border-subtle)] last:border-0"
                    >
                      <span className="flex items-center gap-2">
                        {ms.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-[var(--text-primary)]" />
                        ) : (
                          <Circle className="w-4 h-4 text-[var(--text-muted)]" />
                        )}
                        <span
                          className={
                            ms.completed
                              ? 'text-[var(--text-primary)]'
                              : 'text-[var(--text-secondary)]'
                          }
                        >
                          {ms.title}
                        </span>
                      </span>
                      {ms.dueDate && (
                        <span className="text-xs font-mono tabular-nums text-[var(--text-muted)]">
                          Due {formatDate(ms.dueDate)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Weekly Progress Updates */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-[var(--border-subtle)]">
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-[var(--text-primary)]">
                    Weekly Progress Log
                  </h4>
                  {(rec.weeklyUpdates || []).length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)]">No weekly updates logged yet.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {rec.weeklyUpdates.map((wk) => (
                        <div
                          key={wk.id}
                          className="p-3 rounded-[10px] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs"
                        >
                          <div className="flex justify-between font-semibold text-[var(--text-primary)]">
                            <span>{wk.weekLabel}</span>
                            <span className="font-mono text-[var(--text-muted)] font-normal">
                              {formatDate(wk.submittedAt)}
                            </span>
                          </div>
                          <p className="mt-1 text-[var(--text-secondary)]">{wk.summary}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {rec.progressStatus !== 'Completed' && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!weekLabel.trim() || !weekSummary.trim()) return;
                        await addStudentWeeklyUpdate(rec, weekLabel, weekSummary);
                        setWeekLabel('');
                        setWeekSummary('');
                        toast.success('Weekly update recorded.');
                        await load();
                      }}
                      className="space-y-2 pt-2"
                    >
                      <input
                        required
                        value={weekLabel}
                        onChange={(e) => setWeekLabel(e.target.value)}
                        placeholder="e.g. Week 4 Update"
                        className="w-full px-3 py-1.5 text-xs border border-[var(--border-color)] rounded-[10px]"
                      />
                      <textarea
                        required
                        rows={2}
                        value={weekSummary}
                        onChange={(e) => setWeekSummary(e.target.value)}
                        placeholder="Summarize tasks delivered, blockers, and next week plan..."
                        className="w-full px-3 py-1.5 text-xs border border-[var(--border-color)] rounded-[10px]"
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 text-xs font-semibold mono-btn-primary"
                      >
                        Submit Weekly Update
                      </button>
                    </form>
                  )}
                </div>

                {/* Documents */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-[var(--text-primary)]">
                    Submitted Deliverables & Reports
                  </h4>
                  {(rec.documents || []).length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)]">
                      No reports or deliverable links submitted yet.
                    </p>
                  ) : (
                    <ul className="space-y-2 text-xs">
                      {rec.documents.map((d) => (
                        <li
                          key={d.id}
                          className="flex items-center justify-between p-2.5 rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-secondary)]"
                        >
                          <span className="font-medium text-[var(--text-primary)]">{d.title}</span>
                          {isSafeExternalUrl(d.referenceUrl) ? (
                            <a
                              href={d.referenceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[var(--text-primary)] hover:underline underline-offset-2 inline-flex items-center gap-1"
                            >
                              Open <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-[var(--text-muted)]">
                              {formatDate(d.submittedAt)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {rec.progressStatus !== 'Completed' && (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!docTitle.trim() || !isSafeExternalUrl(docUrl)) {
                          toast.error('Enter a document title and valid https:// URL.');
                          return;
                        }
                        await addStudentProgressDocument(rec, docTitle, docUrl);
                        setDocTitle('');
                        setDocUrl('');
                        toast.success('Deliverable link submitted.');
                        await load();
                      }}
                      className="space-y-2 pt-2"
                    >
                      <input
                        required
                        value={docTitle}
                        onChange={(e) => setDocTitle(e.target.value)}
                        placeholder="Report title (e.g. Midterm Engineering Report)"
                        className="w-full px-3 py-1.5 text-xs border border-[var(--border-color)] rounded-[10px]"
                      />
                      <input
                        required
                        type="url"
                        value={docUrl}
                        onChange={(e) => setDocUrl(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="w-full px-3 py-1.5 text-xs border border-[var(--border-color)] rounded-[10px]"
                      />
                      <button
                        type="submit"
                        className="px-3.5 py-1.5 text-xs font-medium mono-btn-secondary"
                      >
                        Add Deliverable Link
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Shared Recruiter Feedback */}
      {feedbackList.length > 0 && (
        <div className="mono-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Recruiter & Mentor Evaluations
          </h3>
          <div className="divide-y divide-[var(--border-subtle)]">
            {feedbackList.map((fb) => (
              <div key={fb.feedbackId} className="py-4 first:pt-0 last:pb-0 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">
                      {fb.internshipTitle} · {fb.companyName}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] capitalize">
                      {fb.stage} evaluation · Rating{' '}
                      <span className="font-mono tabular-nums font-semibold text-[var(--text-primary)]">
                        {fb.rating}/5
                      </span>
                    </p>
                  </div>
                  <StatusLabel status={fb.recommendation} />
                </div>
                <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed">
                  {fb.comments}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
