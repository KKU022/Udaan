import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar, CheckCircle2, Plus, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import {
  EmptyState,
  LoadingSkeleton,
  StatusLabel,
} from '../../components/ui/Primitives';
import { listCompanyApplications } from '../../services/applicationService';
import {
  listCompanyFeedback,
  listCompanyInterviews,
  listCompanyProgress,
  scheduleInterview,
  submitRecruiterFeedback,
  updateInterviewStatus,
  updateProgressByCompany,
} from '../../services/interviewProgressService';
import { feedbackFormSchema, interviewFormSchema } from '../../schemas/validation';
import type {
  ApplicationRecord,
  FeedbackRecord,
  InternshipProgressRecord,
  InterviewMode,
  InterviewRecord,
  ProgressStatus,
} from '../../types';
import { formatDate } from '../../utils/formatters';

export const RecruiterInterviewsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { userRecord, companyProfile } = useAuth();
  const [interviews, setInterviews] = useState<InterviewRecord[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    applicationId: searchParams.get('appId') || '',
    title: 'Technical Interview Round 1',
    interviewDate: '2026-12-10',
    startTime: '11:00',
    endTime: '11:45',
    mode: 'Online' as InterviewMode,
    meetingLink: 'https://meet.google.com/',
    venue: '',
    interviewer: companyProfile?.contactPerson || '',
    instructions: '',
  });

  const load = async () => {
    if (!userRecord) return;
    setLoading(true);
    try {
      const [ivws, apps] = await Promise.all([
        listCompanyInterviews(userRecord.uid),
        listCompanyApplications(userRecord.uid),
      ]);
      setInterviews(ivws);
      setApplications(apps.filter((a) => !['Rejected', 'Withdrawn'].includes(a.status)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRecord?.uid]);

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userRecord) return;
    const parsed = interviewFormSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Check interview details.');
      return;
    }
    const app = applications.find((a) => a.applicationId === parsed.data.applicationId);
    if (!app) {
      toast.error('Please select a valid applicant.');
      return;
    }
    setSaving(true);
    try {
      await scheduleInterview({
        application: app,
        recruiterId: userRecord.uid,
        recruiterName: companyProfile?.companyName || userRecord.fullName,
        ...parsed.data,
      });
      toast.success(`Interview scheduled for ${app.studentName}. Student notified.`);
      setForm((prev) => ({ ...prev, applicationId: '', instructions: '' }));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to schedule interview.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSkeleton rows={4} />;

  return (
    <div className="space-y-6 udaan-fade-in">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
          Interview Management
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Scheduling an interview automatically updates the candidate&apos;s status and notifies both portals.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form onSubmit={handleSchedule} className="lg:col-span-5 mono-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Schedule New Interview
          </h3>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Candidate *
            </label>
            <select
              required
              value={form.applicationId}
              onChange={(e) => setForm({ ...form, applicationId: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
            >
              <option value="">Select applicant...</option>
              {applications.map((a) => (
                <option key={a.applicationId} value={a.applicationId}>
                  {a.studentName} — {a.internshipTitle} ({a.status})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Interview Title *
            </label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3 sm:col-span-1">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={form.interviewDate}
                onChange={(e) => setForm({ ...form, interviewDate: e.target.value })}
                className="w-full px-2.5 py-2 text-xs border border-[var(--border-color)] rounded-[10px] font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Start *
              </label>
              <input
                type="time"
                required
                value={form.startTime}
                onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                className="w-full px-2.5 py-2 text-xs border border-[var(--border-color)] rounded-[10px] font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                End *
              </label>
              <input
                type="time"
                required
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                className="w-full px-2.5 py-2 text-xs border border-[var(--border-color)] rounded-[10px] font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Mode *
              </label>
              <select
                value={form.mode}
                onChange={(e) => setForm({ ...form, mode: e.target.value as InterviewMode })}
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
              >
                <option value="Online">Online</option>
                <option value="In-Person">In-Person</option>
                <option value="Phone">Phone</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Interviewer *
              </label>
              <input
                required
                value={form.interviewer}
                onChange={(e) => setForm({ ...form, interviewer: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
              />
            </div>
          </div>

          {form.mode === 'Online' ? (
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Meeting Link
              </label>
              <input
                type="url"
                value={form.meetingLink}
                onChange={(e) => setForm({ ...form, meetingLink: e.target.value })}
                placeholder="https://meet.google.com/..."
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Venue / Contact
              </label>
              <input
                value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Candidate Instructions
            </label>
            <textarea
              rows={2}
              value={form.instructions}
              onChange={(e) => setForm({ ...form, instructions: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 text-sm font-semibold mono-btn-primary disabled:opacity-50"
          >
            {saving ? 'Scheduling...' : 'Schedule Interview'}
          </button>
        </form>

        <div className="lg:col-span-7 space-y-4">
          {interviews.length === 0 ? (
            <EmptyState
              title="No interviews scheduled"
              description="Use the form to schedule technical or HR interviews with shortlisted applicants."
            />
          ) : (
            interviews.map((ivw) => (
              <div key={ivw.interviewId} className="mono-card p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                      {ivw.studentName} · {ivw.title}
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {ivw.internshipTitle} · Interviewer: {ivw.interviewer} · {ivw.mode}
                    </p>
                  </div>
                  <StatusLabel status={ivw.status} />
                </div>

                <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-mono tabular-nums text-[var(--text-primary)]">
                    <Calendar className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
                    {formatDate(ivw.interviewDate)} · {ivw.startTime}–{ivw.endTime}
                  </span>

                  {ivw.status === 'Scheduled' && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!userRecord) return;
                          await updateInterviewStatus({
                            interview: ivw,
                            recruiterId: userRecord.uid,
                            status: 'Completed',
                          });
                          toast.success('Interview marked completed.');
                          await load();
                        }}
                        className="px-2.5 py-1 font-semibold mono-btn-primary"
                      >
                        Mark Completed
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!userRecord) return;
                          await updateInterviewStatus({
                            interview: ivw,
                            recruiterId: userRecord.uid,
                            status: 'Cancelled',
                          });
                          toast.info('Interview cancelled.');
                          await load();
                        }}
                        className="px-2.5 py-1 font-medium mono-btn-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export const RecruiterProgressPage: React.FC = () => {
  const { userRecord } = useAuth();
  const [records, setRecords] = useState<InternshipProgressRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');

  const load = async () => {
    if (!userRecord) return;
    setLoading(true);
    try {
      setRecords(await listCompanyProgress(userRecord.uid));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRecord?.uid]);

  const saveRecord = async (rec: InternshipProgressRecord, patch: Partial<InternshipProgressRecord>) => {
    if (!userRecord) return;
    const merged = { ...rec, ...patch };
    await updateProgressByCompany({
      progress: rec,
      recruiterId: userRecord.uid,
      mentorName: merged.mentorName,
      mentorEmail: merged.mentorEmail,
      startDate: merged.startDate,
      endDate: merged.endDate,
      actualCompletionDate:
        merged.progressStatus === 'Completed'
          ? merged.actualCompletionDate || new Date().toISOString().slice(0, 10)
          : merged.actualCompletionDate,
      progressStatus: merged.progressStatus,
      milestones: merged.milestones,
      completionConfirmed: merged.completionConfirmed,
    });
    toast.success('Intern progress updated.');
    await load();
  };

  if (loading) return <LoadingSkeleton rows={3} />;

  return (
    <div className="space-y-6 udaan-fade-in">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
          Selected Intern Progress
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Assign mentors, track milestones, review weekly student updates, and confirm internship completion.
        </p>
      </div>

      {records.length === 0 ? (
        <EmptyState
          title="No selected interns yet"
          description="When you mark an applicant as Selected in the recruitment pipeline, an internship progress tracker is automatically created here."
        />
      ) : (
        <div className="space-y-5">
          {records.map((rec) => (
            <div key={rec.progressId} className="mono-card p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-subtle)]">
                <div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">
                    {rec.studentName} · {rec.internshipTitle}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    Mentor: {rec.mentorName || 'Unassigned'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={rec.progressStatus}
                    onChange={(e) =>
                      void saveRecord(rec, {
                        progressStatus: e.target.value as ProgressStatus,
                        completionConfirmed: e.target.value === 'Completed',
                      })
                    }
                    className="px-3 py-1.5 text-xs border border-[var(--border-color)] rounded-[10px] font-medium"
                  >
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Incomplete">Incomplete</option>
                  </select>
                  <StatusLabel status={rec.progressStatus} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    Milestones (Click to toggle)
                  </p>
                  {(rec.milestones || []).map((ms) => (
                    <button
                      key={ms.id}
                      type="button"
                      onClick={() =>
                        void saveRecord(rec, {
                          milestones: rec.milestones.map((m) =>
                            m.id === ms.id ? { ...m, completed: !m.completed } : m
                          ),
                        })
                      }
                      className="w-full text-left flex items-center gap-2.5 p-2.5 rounded-[10px] border border-[var(--border-color)] hover:bg-[var(--bg-secondary)] text-xs transition-colors"
                    >
                      <CheckCircle2
                        className={`w-4 h-4 shrink-0 ${
                          ms.completed ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
                        }`}
                      />
                      <span
                        className={
                          ms.completed
                            ? 'line-through text-[var(--text-muted)]'
                            : 'text-[var(--text-primary)]'
                        }
                      >
                        {ms.title}
                      </span>
                    </button>
                  ))}

                  <div className="flex gap-2 pt-1">
                    <input
                      value={newMilestoneTitle}
                      onChange={(e) => setNewMilestoneTitle(e.target.value)}
                      placeholder="Add new milestone..."
                      className="flex-1 px-2.5 py-1.5 text-xs border border-[var(--border-color)] rounded-[10px]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newMilestoneTitle.trim()) return;
                        void saveRecord(rec, {
                          milestones: [
                            ...rec.milestones,
                            {
                              id: `ms_${Date.now()}`,
                              title: newMilestoneTitle.trim(),
                              dueDate: '',
                              completed: false,
                            },
                          ],
                        });
                        setNewMilestoneTitle('');
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold mono-btn-primary"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    Student Weekly Updates ({rec.weeklyUpdates?.length || 0})
                  </p>
                  {(rec.weeklyUpdates || []).length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)]">
                      No weekly updates submitted by intern yet.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {rec.weeklyUpdates.map((wk) => (
                        <div
                          key={wk.id}
                          className="p-2.5 rounded-[10px] bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-xs"
                        >
                          <p className="font-semibold text-[var(--text-primary)]">{wk.weekLabel}</p>
                          <p className="text-[var(--text-secondary)] mt-0.5">{wk.summary}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const RecruiterFeedbackPage: React.FC = () => {
  const { userRecord } = useAuth();
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    applicationId: '',
    stage: 'interview' as 'interview' | 'midterm' | 'final',
    rating: 4,
    strengths: '',
    improvements: '',
    comments: '',
    recommendation: 'Hire' as 'Strong Hire' | 'Hire' | 'Hold' | 'No Hire' | 'Completed',
  });

  const load = async () => {
    if (!userRecord) return;
    setLoading(true);
    try {
      const [apps, fbks] = await Promise.all([
        listCompanyApplications(userRecord.uid),
        listCompanyFeedback(userRecord.uid),
      ]);
      setApplications(apps);
      setFeedbacks(fbks);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRecord?.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userRecord) return;
    const parsed = feedbackFormSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Complete required evaluation fields.');
      return;
    }
    const app = applications.find((a) => a.applicationId === parsed.data.applicationId);
    if (!app) {
      toast.error('Select a candidate first.');
      return;
    }
    setSaving(true);
    try {
      await submitRecruiterFeedback({
        application: app,
        recruiterId: userRecord.uid,
        ...parsed.data,
      });
      toast.success('Evaluation recorded and shared with student.');
      setForm((prev) => ({ ...prev, strengths: '', improvements: '', comments: '' }));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to submit feedback.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSkeleton rows={4} />;

  return (
    <div className="space-y-6 udaan-fade-in">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
          Candidate & Intern Feedback
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Record interview evaluations, midterm assessments, and final internship completion reviews.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <form onSubmit={handleSubmit} className="lg:col-span-5 mono-card p-6 space-y-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Record Evaluation</h3>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Candidate *
            </label>
            <select
              required
              value={form.applicationId}
              onChange={(e) => setForm({ ...form, applicationId: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
            >
              <option value="">Select candidate...</option>
              {applications.map((a) => (
                <option key={a.applicationId} value={a.applicationId}>
                  {a.studentName} — {a.internshipTitle}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Stage
              </label>
              <select
                value={form.stage}
                onChange={(e) => setForm({ ...form, stage: e.target.value as typeof form.stage })}
                className="w-full px-2.5 py-2 text-xs border border-[var(--border-color)] rounded-[10px]"
              >
                <option value="interview">Interview</option>
                <option value="midterm">Midterm</option>
                <option value="final">Final</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Rating (1–5)
              </label>
              <input
                type="number"
                min={1}
                max={5}
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                className="w-full px-2.5 py-2 text-xs border border-[var(--border-color)] rounded-[10px] font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Outcome
              </label>
              <select
                value={form.recommendation}
                onChange={(e) =>
                  setForm({ ...form, recommendation: e.target.value as typeof form.recommendation })
                }
                className="w-full px-2.5 py-2 text-xs border border-[var(--border-color)] rounded-[10px]"
              >
                <option>Strong Hire</option>
                <option>Hire</option>
                <option>Hold</option>
                <option>No Hire</option>
                <option>Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Strengths
            </label>
            <input
              value={form.strengths}
              onChange={(e) => setForm({ ...form, strengths: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Areas for Growth
            </label>
            <input
              value={form.improvements}
              onChange={(e) => setForm({ ...form, improvements: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Evaluation Comments *
            </label>
            <textarea
              required
              rows={3}
              value={form.comments}
              onChange={(e) => setForm({ ...form, comments: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 text-sm font-semibold mono-btn-primary disabled:opacity-50"
          >
            {saving ? 'Saving Evaluation...' : 'Submit Evaluation'}
          </button>
        </form>

        <div className="lg:col-span-7 space-y-4">
          {feedbacks.length === 0 ? (
            <EmptyState
              title="No feedback recorded yet"
              description="Submitted candidate and intern evaluations appear here and sync with student and admin records."
            />
          ) : (
            feedbacks.map((fb) => (
              <div key={fb.feedbackId} className="mono-card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                      {fb.studentName} · {fb.internshipTitle}
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] capitalize mt-0.5 flex items-center gap-1.5">
                      <span>{fb.stage}</span>
                      <span>·</span>
                      <Star className="w-3.5 h-3.5 text-[var(--text-primary)] inline" fill="currentColor" />
                      <span className="font-mono tabular-nums font-semibold text-[var(--text-primary)]">
                        {fb.rating}/5
                      </span>
                    </p>
                  </div>
                  <StatusLabel status={fb.recommendation} />
                </div>
                <p className="mt-3 text-xs text-[var(--text-secondary)] leading-relaxed">
                  {fb.comments}
                </p>
                {fb.strengths && (
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    <strong className="text-[var(--text-primary)]">Strengths:</strong> {fb.strengths}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
