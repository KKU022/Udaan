import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PlusCircle, Save, Trash2, Lock, Edit3 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { updateCompanyProfile } from '../../services/companyService';
import {
  closeInternshipPosting,
  createInternship,
  deleteDraftInternship,
  getInternshipById,
  listCompanyInternships,
  updateInternshipByCompany,
} from '../../services/internshipService';
import { listCompanyApplications } from '../../services/applicationService';
import { internshipFormSchema } from '../../schemas/validation';
import { formatDate, parseCommaList } from '../../utils/formatters';
import {
  ConfirmDialog,
  EmptyState,
  LoadingSkeleton,
  StatusLabel,
} from '../../components/ui/Primitives';
import { ConnectedAccountsSection } from '../../components/ConnectedAccountsSection';
import type { InternshipRecord, WorkMode } from '../../types';

export const RecruiterProfilePage: React.FC = () => {
  const { userRecord, companyProfile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    companyName: '',
    contactPerson: '',
    phone: '',
    website: '',
    industry: '',
    companySize: '',
    headquarters: '',
    description: '',
    linkedinUrl: '',
    githubUrl: '',
    twitterUrl: '',
    instagramUrl: '',
  });

  useEffect(() => {
    if (!companyProfile) return;
    setForm({
      companyName: companyProfile.companyName || '',
      contactPerson: companyProfile.contactPerson || '',
      phone: companyProfile.phone || '',
      website: companyProfile.website || '',
      industry: companyProfile.industry || '',
      companySize: companyProfile.companySize || '51-200 employees',
      headquarters: companyProfile.headquarters || '',
      description: companyProfile.description || '',
      linkedinUrl: companyProfile.linkedinUrl || '',
      githubUrl: companyProfile.githubUrl || '',
      twitterUrl: companyProfile.twitterUrl || '',
      instagramUrl: companyProfile.instagramUrl || '',
    });
  }, [companyProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userRecord || !companyProfile) return;
    setSaving(true);
    try {
      await updateCompanyProfile(userRecord.uid, companyProfile, form);
      await refreshProfile();
      toast.success('Company profile updated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to save company profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl udaan-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
            Company Profile
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Verification status is governed exclusively by the college placement administrator.
          </p>
        </div>
        <StatusLabel status={companyProfile?.verificationStatus || 'pending'} />
      </div>

      <form onSubmit={handleSave} className="mono-card p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Company Name *
            </label>
            <input
              required
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Official Email
            </label>
            <input
              disabled
              value={companyProfile?.officialEmail || ''}
              className="w-full px-3 py-2 text-sm border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-muted)] rounded-[10px] cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Contact Person *
            </label>
            <input
              required
              value={form.contactPerson}
              onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Phone
            </label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Industry *
            </label>
            <input
              required
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Company Size
            </label>
            <select
              value={form.companySize}
              onChange={(e) => setForm({ ...form, companySize: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
            >
              <option>1-10 employees</option>
              <option>11-50 employees</option>
              <option>51-200 employees</option>
              <option>201-500 employees</option>
              <option>500+ employees</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Headquarters
            </label>
            <input
              value={form.headquarters}
              onChange={(e) => setForm({ ...form, headquarters: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              About Company *
            </label>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--border-subtle)] space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Connected Company Accounts
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Verified links shown to students exploring your internship openings.
            </p>
          </div>
          <ConnectedAccountsSection
            mode="company"
            links={{
              website: form.website,
              linkedinUrl: form.linkedinUrl,
              githubUrl: form.githubUrl,
              twitterUrl: form.twitterUrl,
              instagramUrl: form.instagramUrl,
            }}
            editable
            onChange={(next) =>
              setForm((prev) => ({
                ...prev,
                website: next.website ?? '',
                linkedinUrl: next.linkedinUrl ?? '',
                githubUrl: next.githubUrl ?? '',
                twitterUrl: next.twitterUrl ?? '',
                instagramUrl: next.instagramUrl ?? '',
              }))
            }
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold mono-btn-primary disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Company Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};

export const PostInternshipPage: React.FC = () => {
  const { editId } = useParams<{ editId?: string }>();
  const { companyProfile } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    category: 'Software Engineering',
    description: '',
    responsibilities: '',
    skillsText: '',
    eligibilityText: '',
    minCgpa: 7.0,
    eligibleBranchesText: 'Computer Science, Information Technology',
    duration: '6 Months',
    isPaid: true,
    stipendAmount: 25000,
    location: 'Bengaluru',
    workMode: 'Hybrid' as WorkMode,
    openings: 2,
    deadline: '2027-03-31',
    startDate: '2027-04-15',
    requiredDocumentsText: 'Resume (PDF), Academic Transcript',
    contactInstructions: '',
  });

  useEffect(() => {
    if (!editId) return;
    void getInternshipById(editId).then((item) => {
      if (!item) return;
      setForm({
        title: item.title,
        category: item.category,
        description: item.description,
        responsibilities: item.responsibilities || '',
        skillsText: (item.skills || []).join(', '),
        eligibilityText: item.eligibilityText || '',
        minCgpa: item.minCgpa || 0,
        eligibleBranchesText: (item.eligibleBranches || []).join(', '),
        duration: item.duration,
        isPaid: item.isPaid,
        stipendAmount: item.stipendAmount,
        location: item.location,
        workMode: item.workMode,
        openings: item.openings,
        deadline: item.deadline,
        startDate: item.startDate || '',
        requiredDocumentsText: (item.requiredDocuments || []).join(', '),
        contactInstructions: item.contactInstructions || '',
      });
    });
  }, [editId]);

  const isVerified = companyProfile?.verificationStatus === 'verified';

  const handleSave = async (submitForApproval: boolean) => {
    if (!companyProfile) return;
    const parsed = internshipFormSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Please complete all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: parsed.data.title,
        category: parsed.data.category,
        description: parsed.data.description,
        responsibilities: parsed.data.responsibilities,
        skills: parseCommaList(parsed.data.skillsText, 20),
        eligibilityText: parsed.data.eligibilityText,
        minCgpa: parsed.data.minCgpa,
        eligibleBranches: parseCommaList(parsed.data.eligibleBranchesText, 15),
        duration: parsed.data.duration,
        isPaid: parsed.data.isPaid,
        stipendAmount: parsed.data.stipendAmount,
        location: parsed.data.location,
        workMode: parsed.data.workMode,
        openings: parsed.data.openings,
        deadline: parsed.data.deadline,
        startDate: parsed.data.startDate,
        requiredDocuments: parseCommaList(parsed.data.requiredDocumentsText, 10),
        contactInstructions: parsed.data.contactInstructions,
        submitForApproval,
      };

      if (editId) {
        await updateInternshipByCompany(companyProfile, editId, payload);
        toast.success(
          submitForApproval ? 'Internship updated and submitted for admin approval.' : 'Draft updated.'
        );
      } else {
        await createInternship(companyProfile, payload);
        toast.success(
          submitForApproval
            ? 'Internship submitted for administrator approval!'
            : 'Saved as draft.'
        );
      }
      navigate('/recruiter/internships');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to save internship.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isVerified) {
    return (
      <EmptyState
        title="Company verification required"
        description="Unverified companies cannot submit internship opportunities. Once the college administrator verifies your company profile, posting will unlock automatically."
        action={
          <Link
            to="/recruiter/profile"
            className="inline-block px-4 py-2 text-xs font-semibold mono-btn-primary"
          >
            Review Company Profile
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6 max-w-4xl udaan-fade-in">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
          {editId ? 'Edit Internship Opportunity' : 'Post New Internship'}
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Submitted postings enter the college administrator approval queue before becoming publicly visible to students.
        </p>
      </div>

      <div className="mono-card p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Internship Title *
            </label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Full-Stack Software Engineering Intern"
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Category *
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
            >
              <option>Software Engineering</option>
              <option>Data & AI</option>
              <option>Cloud & DevOps</option>
              <option>Cybersecurity</option>
              <option>Design</option>
              <option>Hardware & Embedded</option>
              <option>Core Engineering</option>
              <option>Product & Business</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Work Mode *
            </label>
            <select
              value={form.workMode}
              onChange={(e) => setForm({ ...form, workMode: e.target.value as WorkMode })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
            >
              <option value="Remote">Remote</option>
              <option value="Hybrid">Hybrid</option>
              <option value="On-site">On-site</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Location *
            </label>
            <input
              required
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Duration *
            </label>
            <input
              required
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
              placeholder="e.g. 6 Months"
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] mb-1 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isPaid}
                onChange={(e) => setForm({ ...form, isPaid: e.target.checked })}
                className="accent-[var(--text-primary)]"
              />
              Paid Stipend (INR / month)
            </label>
            <input
              type="number"
              min={0}
              disabled={!form.isPaid}
              value={form.isPaid ? form.stipendAmount : 0}
              onChange={(e) => setForm({ ...form, stipendAmount: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px] font-mono tabular-nums disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Number of Openings *
            </label>
            <input
              type="number"
              min={1}
              max={500}
              value={form.openings}
              onChange={(e) => setForm({ ...form, openings: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px] font-mono tabular-nums"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Application Deadline *
            </label>
            <input
              type="date"
              required
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px] font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Expected Start Date
            </label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px] font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Minimum CGPA
            </label>
            <input
              type="number"
              step="0.1"
              min={0}
              max={10}
              value={form.minCgpa}
              onChange={(e) => setForm({ ...form, minCgpa: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px] font-mono tabular-nums"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Required Skills (comma-separated) *
            </label>
            <input
              required
              value={form.skillsText}
              onChange={(e) => setForm({ ...form, skillsText: e.target.value })}
              placeholder="React, TypeScript, REST APIs"
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Role Description *
            </label>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Responsibilities
            </label>
            <textarea
              rows={3}
              value={form.responsibilities}
              onChange={(e) => setForm({ ...form, responsibilities: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Eligible Branches
            </label>
            <input
              value={form.eligibleBranchesText}
              onChange={(e) => setForm({ ...form, eligibleBranchesText: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Required Documents
            </label>
            <input
              value={form.requiredDocumentsText}
              onChange={(e) => setForm({ ...form, requiredDocumentsText: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Eligibility Summary & Contact Notes
            </label>
            <input
              value={form.eligibilityText}
              onChange={(e) => setForm({ ...form, eligibilityText: e.target.value })}
              placeholder="e.g. Open to 6th and 7th semester B.Tech/MCA students with strong GitHub projects"
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleSave(false)}
            className="px-4 py-2 text-sm font-medium mono-btn-secondary disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleSave(true)}
            className="px-5 py-2 text-sm font-semibold mono-btn-primary disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit for Approval'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const ManageInternshipsPage: React.FC = () => {
  const { userRecord, companyProfile } = useAuth();
  const [internships, setInternships] = useState<InternshipRecord[]>([]);
  const [appCounts, setAppCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [closeTarget, setCloseTarget] = useState<InternshipRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InternshipRecord | null>(null);

  const load = async () => {
    if (!userRecord) return;
    setLoading(true);
    try {
      const [ints, apps] = await Promise.all([
        listCompanyInternships(userRecord.uid),
        listCompanyApplications(userRecord.uid),
      ]);
      const counts: Record<string, number> = {};
      apps.forEach((a) => {
        counts[a.internshipId] = (counts[a.internshipId] || 0) + 1;
      });
      setInternships(ints);
      setAppCounts(counts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRecord?.uid]);

  if (loading) return <LoadingSkeleton rows={4} />;

  return (
    <div className="space-y-6 udaan-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
            My Internship Postings
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Track drafts, approval status, live applications, and close filled openings.
          </p>
        </div>
        <Link
          to="/recruiter/post"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold mono-btn-primary self-start sm:self-auto"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          Post Internship
        </Link>
      </div>

      {internships.length === 0 ? (
        <EmptyState
          title="No internships posted yet"
          description="Create your first internship opportunity and submit it for administrator approval."
          action={
            <Link
              to="/recruiter/post"
              className="inline-block px-4 py-2 text-xs font-semibold mono-btn-primary"
            >
              Create Posting
            </Link>
          }
        />
      ) : (
        <div className="mono-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)] text-xs text-[var(--text-muted)]">
                  <th className="py-3 px-4 font-medium">Internship</th>
                  <th className="py-3 px-4 font-medium">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Applications</th>
                  <th className="py-3 px-4 font-medium">Deadline</th>
                  <th className="py-3 px-4 font-medium">Created</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {internships.map((item) => (
                  <tr
                    key={item.internshipId}
                    className="hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-[var(--text-primary)]">{item.title}</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {item.category} · {item.workMode} · {item.stipendDisplay}
                      </p>
                      {item.status === 'rejected' && item.rejectionReason && (
                        <p className="mt-1 text-xs text-[var(--text-secondary)] italic">
                          Rejection note: {item.rejectionReason}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusLabel status={item.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-[var(--text-primary)]">
                      {appCounts[item.internshipId] || 0}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono tabular-nums text-[var(--text-secondary)]">
                      {formatDate(item.deadline)}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono tabular-nums text-[var(--text-muted)]">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                      {['draft', 'pending_approval', 'rejected'].includes(item.status) && (
                        <Link
                          to={`/recruiter/post/${item.internshipId}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium mono-btn-secondary"
                        >
                          <Edit3 className="w-3 h-3" />
                          Edit
                        </Link>
                      )}
                      {item.status === 'published' && (
                        <button
                          type="button"
                          onClick={() => setCloseTarget(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium mono-btn-secondary"
                        >
                          <Lock className="w-3 h-3" />
                          Close
                        </button>
                      )}
                      {item.status === 'draft' && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium mono-btn-secondary"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(closeTarget)}
        title="Close internship posting?"
        description={`Closing "${closeTarget?.title}" prevents new student applications while preserving all existing applicant records.`}
        confirmLabel="Close Posting"
        onConfirm={async () => {
          if (!closeTarget || !userRecord) return;
          await closeInternshipPosting(
            userRecord.uid,
            companyProfile?.companyName || userRecord.fullName,
            'company',
            closeTarget.internshipId,
            closeTarget.title
          );
          setCloseTarget(null);
          await load();
          toast.success('Internship posting closed.');
        }}
        onCancel={() => setCloseTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete draft posting?"
        description={`Permanently delete draft "${deleteTarget?.title}"?`}
        confirmLabel="Delete Draft"
        destructive
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteDraftInternship(deleteTarget.internshipId);
          setDeleteTarget(null);
          await load();
          toast.success('Draft deleted.');
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
