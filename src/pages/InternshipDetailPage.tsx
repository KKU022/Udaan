import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bookmark, CheckCircle2, FileText, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { PublicNavbar } from '../components/PublicNavbar';
import { ErrorState, LoadingSkeleton, StatusLabel } from '../components/ui/Primitives';
import { getInternshipById } from '../services/internshipService';
import {
  listSavedInternships,
  listStudentResumes,
  toggleSavedInternship,
  uploadStudentResume,
} from '../services/studentService';
import { applyForInternship, listStudentApplications } from '../services/applicationService';
import { useAuth } from '../context/AuthContext';
import type { InternshipRecord, ResumeDocument } from '../types';
import { formatDate, getInitials, isDeadlinePassed } from '../utils/formatters';

interface InternshipDetailProps {
  embedded?: boolean;
}

export const InternshipDetailPage: React.FC<InternshipDetailProps> = ({ embedded = false }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userRecord, studentProfile, refreshProfile } = useAuth();

  const [internship, setInternship] = useState<InternshipRecord | null>(null);
  const [resumes, setResumes] = useState<ResumeDocument[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [applyStep, setApplyStep] = useState<'closed' | 'compose' | 'review'>('closed');
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const loadDetail = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await getInternshipById(id);
      if (!data) {
        setError('Internship posting not found or no longer available.');
        return;
      }
      setInternship(data);

      if (userRecord?.role === 'student') {
        const [savedList, appsList, resumeList] = await Promise.all([
          listSavedInternships(userRecord.uid),
          listStudentApplications(userRecord.uid),
          listStudentResumes(userRecord.uid),
        ]);
        setIsSaved(savedList.some((s) => s.internshipId === id));
        setAlreadyApplied(appsList.some((a) => a.internshipId === id));
        setResumes(resumeList);
        if (resumeList.length > 0) {
          setSelectedResumeId(resumeList[0].resumeId);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load internship details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, userRecord?.uid]);

  const handleQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userRecord || !studentProfile) return;
    setUploadingPdf(true);
    try {
      const uploaded = await uploadStudentResume(userRecord.uid, file, studentProfile);
      setResumes((prev) => [uploaded, ...prev]);
      setSelectedResumeId(uploaded.resumeId);
      await refreshProfile();
      toast.success(`Uploaded "${uploaded.fileName}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Resume upload failed.');
    } finally {
      setUploadingPdf(false);
    }
  };

  const handleConfirmApply = async () => {
    if (!internship || !studentProfile) return;
    setSubmitting(true);
    try {
      const chosenResume = resumes.find((r) => r.resumeId === selectedResumeId) || null;
      await applyForInternship({
        student: studentProfile,
        internship,
        resume: chosenResume,
        coverLetter,
      });
      setAlreadyApplied(true);
      setApplyStep('closed');
      toast.success('Application submitted successfully!');
      navigate('/student/applications');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Application submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const expired = internship ? isDeadlinePassed(internship.deadline) : false;
  const cgpaBlocked = Boolean(
    internship?.minCgpa && studentProfile && studentProfile.cgpa < internship.minCgpa
  );
  const canApply =
    internship &&
    internship.status === 'published' &&
    internship.approvalStatus === 'approved' &&
    !expired &&
    !alreadyApplied &&
    !cgpaBlocked &&
    userRecord?.role === 'student';

  const body = loading ? (
    <LoadingSkeleton rows={4} />
  ) : error || !internship ? (
    <ErrorState message={error || 'Internship not found.'} onRetry={loadDetail} />
  ) : (
    <div className="space-y-6">
      <Link
        to={embedded ? '/student/explore' : '/explore'}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to internships
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Content */}
        <div className="lg:col-span-8 space-y-6">
          <div className="mono-card p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-[12px] bg-[var(--action-bg)] text-[var(--action-text)] text-sm font-semibold flex items-center justify-center shrink-0">
                  {getInitials(internship.companyName)}
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                    {internship.title}
                  </h1>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {internship.companyName}
                    {internship.companyIndustry ? ` · ${internship.companyIndustry}` : ''}
                  </p>
                </div>
              </div>

              {userRecord?.role === 'student' && (
                <button
                  type="button"
                  onClick={async () => {
                    const next = await toggleSavedInternship(userRecord.uid, internship, isSaved);
                    setIsSaved(next);
                    toast.success(next ? 'Bookmarked internship.' : 'Removed bookmark.');
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-[10px] border transition-colors ${
                    isSaved
                      ? 'bg-[var(--action-bg)] text-[var(--action-text)] border-[var(--action-bg)]'
                      : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" fill={isSaved ? 'currentColor' : 'none'} />
                  {isSaved ? 'Saved' : 'Save'}
                </button>
              )}
            </div>

            <div className="mt-6 pt-5 border-t border-[var(--border-color)] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-[var(--text-muted)]">Stipend</p>
                <p className="mt-1 font-mono tabular-nums font-semibold text-[var(--text-primary)]">
                  {internship.stipendDisplay}
                </p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Duration</p>
                <p className="mt-1 font-semibold text-[var(--text-primary)]">
                  {internship.duration}
                </p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Location & Mode</p>
                <p className="mt-1 font-semibold text-[var(--text-primary)]">
                  {internship.location} · {internship.workMode}
                </p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Deadline</p>
                <p className="mt-1 font-mono tabular-nums font-semibold text-[var(--text-primary)]">
                  {formatDate(internship.deadline)}
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-6 text-sm text-[var(--text-secondary)] leading-relaxed">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">
                  Role Overview
                </h2>
                <p className="whitespace-pre-line">{internship.description}</p>
              </div>

              {internship.responsibilities && (
                <div>
                  <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">
                    Key Responsibilities
                  </h2>
                  <p className="whitespace-pre-line">{internship.responsibilities}</p>
                </div>
              )}

              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">
                  Required Skills
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  {internship.skills.join(' · ')}
                </p>
              </div>

              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">
                  Eligibility & Documents
                </h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  {internship.eligibilityText ||
                    `Minimum CGPA: ${internship.minCgpa || 'No minimum specified'}`}
                </p>
                {internship.requiredDocuments && internship.requiredDocuments.length > 0 && (
                  <p className="mt-2 text-xs text-[var(--text-muted)]">
                    Required Documents: {internship.requiredDocuments.join(' · ')}
                  </p>
                )}
              </div>

              {internship.contactInstructions && (
                <div className="pt-4 border-t border-[var(--border-color)]">
                  <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                    Application Instructions
                  </h2>
                  <p className="text-xs text-[var(--text-muted)]">
                    {internship.contactInstructions}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Application Card */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="mono-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-muted)]">Posting Status</span>
              <StatusLabel status={expired ? 'expired' : internship.status} />
            </div>

            <div className="text-xs text-[var(--text-muted)] space-y-2 border-t border-[var(--border-color)] pt-4">
              <div className="flex justify-between">
                <span>Category</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {internship.category}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Openings</span>
                <span className="font-mono tabular-nums font-medium text-[var(--text-primary)]">
                  {internship.openings}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Applications Received</span>
                <span className="font-mono tabular-nums font-medium text-[var(--text-primary)]">
                  {internship.applicantsCount || 0}
                </span>
              </div>
              {internship.startDate && (
                <div className="flex justify-between">
                  <span>Expected Start</span>
                  <span className="font-mono tabular-nums font-medium text-[var(--text-primary)]">
                    {formatDate(internship.startDate)}
                  </span>
                </div>
              )}
              {internship.minCgpa ? (
                <div className="flex justify-between">
                  <span>Minimum CGPA</span>
                  <span className="font-mono tabular-nums font-medium text-[var(--text-primary)]">
                    {internship.minCgpa.toFixed(1)}
                  </span>
                </div>
              ) : null}
            </div>

            <div className="pt-2">
              {!userRecord ? (
                <Link
                  to="/login"
                  className="block w-full text-center py-2.5 px-4 text-sm font-semibold mono-btn-primary"
                >
                  Sign In as Student to Apply
                </Link>
              ) : userRecord.role !== 'student' ? (
                <p className="text-xs text-[var(--text-muted)] text-center py-2">
                  Signed in as {userRecord.role}. Only student accounts may submit applications.
                </p>
              ) : alreadyApplied ? (
                <div className="p-3 rounded-[10px] bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    You have applied.{' '}
                    <Link to="/student/applications" className="underline font-semibold">
                      Track status
                    </Link>
                  </span>
                </div>
              ) : expired ? (
                <p className="text-xs text-[var(--text-secondary)] text-center py-2 border border-dashed border-[var(--border-color)] rounded-[10px]">
                  Application window closed on {formatDate(internship.deadline)}.
                </p>
              ) : cgpaBlocked ? (
                <p className="text-xs text-[var(--text-primary)] leading-relaxed p-3 rounded-[10px] bg-[var(--bg-secondary)] border border-dashed border-[var(--border-color)]">
                  Minimum CGPA required is {internship.minCgpa?.toFixed(1)}. Update your profile if
                  your latest CGPA ({studentProfile?.cgpa?.toFixed(2)}) has changed.
                </p>
              ) : canApply ? (
                <button
                  type="button"
                  onClick={() => setApplyStep('compose')}
                  className="w-full py-2.5 px-4 text-sm font-semibold mono-btn-primary"
                >
                  Apply Now
                </button>
              ) : null}
            </div>
          </div>
        </aside>
      </div>

      {/* Multi-Step Application Modal */}
      {applyStep !== 'closed' && studentProfile && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-[var(--overlay-backdrop)] backdrop-blur-[2px] flex items-center justify-center p-4"
        >
          <div className="mono-card udaan-fade-in max-w-xl w-full p-6 sm:p-7 max-h-[90vh] overflow-y-auto shadow-[var(--shadow-elevated)]">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {applyStep === 'compose' ? 'Apply for Internship' : 'Review & Submit Application'}
            </h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {internship.title} · {internship.companyName}
            </p>

            {applyStep === 'compose' ? (
              <div className="mt-5 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-2">
                    Select Saved Resume (PDF)
                  </label>
                  {resumes.length > 0 ? (
                    <div className="space-y-2">
                      {resumes.map((res) => (
                        <label
                          key={res.resumeId}
                          className={`flex items-center justify-between p-3 rounded-[10px] border cursor-pointer text-xs transition-colors ${
                            selectedResumeId === res.resumeId
                              ? 'border-[var(--text-primary)] bg-[var(--bg-elevated)]'
                              : 'border-[var(--border-color)] bg-[var(--bg-secondary)]'
                          }`}
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <input
                              type="radio"
                              name="resume"
                              checked={selectedResumeId === res.resumeId}
                              onChange={() => setSelectedResumeId(res.resumeId)}
                            />
                            <FileText className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                            <span className="truncate font-medium text-[var(--text-primary)]">
                              {res.fileName}
                            </span>
                          </span>
                          <span className="font-mono tabular-nums text-[var(--text-muted)] shrink-0 ml-2">
                            {Math.round(res.fileSize / 1024)} KB
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)] mb-2">
                      No resume uploaded yet. Upload a PDF below to attach it directly.
                    </p>
                  )}

                  <label className="mt-3 inline-flex items-center gap-2 px-3 py-2 text-xs font-medium mono-btn-secondary cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingPdf ? 'Uploading PDF...' : 'Upload New PDF Resume'}
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      disabled={uploadingPdf}
                      onChange={handleQuickUpload}
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                    Cover Letter / Application Note
                  </label>
                  <textarea
                    rows={5}
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    placeholder="Highlight relevant coursework, projects, and why you are interested in this role..."
                    className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setApplyStep('closed')}
                    className="px-4 py-2 text-xs font-medium mono-btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setApplyStep('review')}
                    className="px-4 py-2 text-xs font-semibold mono-btn-primary"
                  >
                    Continue to Review
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-4 text-xs">
                <div className="p-4 rounded-[10px] bg-[var(--bg-secondary)] border border-[var(--border-color)] space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Applicant</span>
                    <span className="font-semibold text-[var(--text-primary)]">
                      {studentProfile.fullName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">College & Branch</span>
                    <span className="font-medium text-[var(--text-primary)]">
                      {studentProfile.college} · {studentProfile.branch}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">CGPA</span>
                    <span className="font-mono tabular-nums font-medium text-[var(--text-primary)]">
                      {studentProfile.cgpa.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">Attached Resume</span>
                    <span className="font-medium text-[var(--text-primary)]">
                      {resumes.find((r) => r.resumeId === selectedResumeId)?.fileName ||
                        'Profile summary only'}
                    </span>
                  </div>
                </div>

                {coverLetter.trim() && (
                  <div className="p-4 rounded-[10px] border border-[var(--border-color)]">
                    <p className="font-semibold text-[var(--text-primary)] mb-1">Cover Letter</p>
                    <p className="text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
                      {coverLetter}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => setApplyStep('compose')}
                    className="px-4 py-2 text-xs font-medium mono-btn-secondary"
                  >
                    Edit Application
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleConfirmApply}
                    className="px-5 py-2 text-xs font-semibold mono-btn-primary disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Confirm & Submit Application'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (embedded) return body;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col">
      <PublicNavbar />
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">{body}</main>
    </div>
  );
};
