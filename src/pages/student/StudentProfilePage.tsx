import React, { useEffect, useState } from 'react';
import { Eye, Plus, Save, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { saveStudentProfile } from '../../services/studentService';
import { isSafeExternalUrl, studentProfileSchema } from '../../schemas/validation';
import { parseCommaList } from '../../utils/formatters';
import type { ExperienceItem, ProjectItem } from '../../types';
import { UserAvatar } from '../../components/ui/Primitives';

export const StudentProfilePage: React.FC = () => {
  const { userRecord, studentProfile, refreshProfile } = useAuth();
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    college: '',
    degree: '',
    branch: '',
    semester: 6,
    graduationYear: 2027,
    cgpa: 0,
    skillsText: '',
    interestsText: '',
    certificationsText: '',
    linkedinUrl: '',
    githubUrl: '',
    portfolioUrl: '',
    about: '',
    showContactToRecruiters: false,
  });

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [experience, setExperience] = useState<ExperienceItem[]>([]);

  useEffect(() => {
    if (!studentProfile) return;
    setForm({
      fullName: studentProfile.fullName || '',
      phone: studentProfile.phone || '',
      college: studentProfile.college || '',
      degree: studentProfile.degree || '',
      branch: studentProfile.branch || '',
      semester: studentProfile.semester || 6,
      graduationYear: studentProfile.graduationYear || 2027,
      cgpa: studentProfile.cgpa || 0,
      skillsText: (studentProfile.skills || []).join(', '),
      interestsText: (studentProfile.interests || []).join(', '),
      certificationsText: (studentProfile.certifications || []).join(', '),
      linkedinUrl: studentProfile.linkedinUrl || '',
      githubUrl: studentProfile.githubUrl || '',
      portfolioUrl: studentProfile.portfolioUrl || '',
      about: studentProfile.about || '',
      showContactToRecruiters: Boolean(studentProfile.showContactToRecruiters),
    });
    setProjects(studentProfile.projects || []);
    setExperience(studentProfile.experience || []);
  }, [studentProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userRecord || !studentProfile) return;
    const parsed = studentProfileSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || 'Check your profile inputs.');
      return;
    }

    setSaving(true);
    try {
      await saveStudentProfile(userRecord.uid, {
        fullName: parsed.data.fullName,
        email: studentProfile.email,
        phone: parsed.data.phone,
        college: parsed.data.college,
        degree: parsed.data.degree,
        branch: parsed.data.branch,
        semester: parsed.data.semester,
        graduationYear: parsed.data.graduationYear,
        cgpa: parsed.data.cgpa,
        skills: parseCommaList(parsed.data.skillsText, 30),
        interests: parseCommaList(parsed.data.interestsText, 20),
        certifications: parseCommaList(parsed.data.certificationsText, 20),
        projects: projects.filter((p) => p.title.trim().length > 0).slice(0, 15),
        experience: experience.filter((ex) => ex.role.trim().length > 0).slice(0, 15),
        linkedinUrl: parsed.data.linkedinUrl,
        githubUrl: parsed.data.githubUrl,
        portfolioUrl: parsed.data.portfolioUrl,
        about: parsed.data.about,
        photoURL: studentProfile.photoURL,
        resumeId: studentProfile.resumeId,
        resumeName: studentProfile.resumeName,
        resumeUrl: studentProfile.resumeUrl,
        resumeUpdatedAt: studentProfile.resumeUpdatedAt,
        showContactToRecruiters: parsed.data.showContactToRecruiters,
      });
      await refreshProfile();
      toast.success('Student profile saved to Firestore.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const skillsList = parseCommaList(form.skillsText, 30);

  return (
    <div className="space-y-6 max-w-4xl udaan-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
            My Academic & Career Profile
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Completion:{' '}
            <span className="font-mono tabular-nums font-semibold text-[var(--text-primary)]">
              {studentProfile?.profileCompletion ?? 0}%
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => setPreviewMode((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium mono-btn-secondary self-start sm:self-auto"
        >
          <Eye className="w-3.5 h-3.5" />
          {previewMode ? 'Back to Edit Mode' : 'Recruiter Preview'}
        </button>
      </div>

      {previewMode ? (
        <div className="mono-card p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-4 pb-6 border-b border-[var(--border-subtle)]">
            <UserAvatar name={form.fullName} photoURL={studentProfile?.photoURL} size="lg" />
            <div>
              <h3 className="text-xl font-semibold text-[var(--text-primary)]">{form.fullName}</h3>
              <p className="text-sm text-[var(--text-secondary)]">
                {form.degree} in {form.branch} · {form.college}
              </p>
              <p className="mt-1 text-xs text-[var(--text-muted)] font-mono tabular-nums">
                Semester {form.semester} · Class of {form.graduationYear} · CGPA {Number(form.cgpa).toFixed(2)}
              </p>
            </div>
          </div>

          {form.about && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                About
              </h4>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{form.about}</p>
            </div>
          )}

          {skillsList.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                Skills
              </h4>
              <p className="text-sm text-[var(--text-primary)]">{skillsList.join(' · ')}</p>
            </div>
          )}

          {projects.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Projects
              </h4>
              <div className="space-y-3">
                {projects.map((p, idx) => (
                  <div
                    key={idx}
                    className="pb-3 border-b border-[var(--border-subtle)] last:border-0"
                  >
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{p.title}</p>
                    <p className="text-xs font-mono text-[var(--text-secondary)] mt-0.5">
                      {p.techStack}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{p.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 text-xs pt-3 border-t border-[var(--border-subtle)]">
            {isSafeExternalUrl(form.githubUrl) && (
              <a
                href={form.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[var(--text-primary)] hover:underline underline-offset-2"
              >
                GitHub <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {isSafeExternalUrl(form.linkedinUrl) && (
              <a
                href={form.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[var(--text-primary)] hover:underline underline-offset-2"
              >
                LinkedIn <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {isSafeExternalUrl(form.portfolioUrl) && (
              <a
                href={form.portfolioUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[var(--text-primary)] hover:underline underline-offset-2"
              >
                Portfolio <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <span className="text-[var(--text-muted)]">
              {form.showContactToRecruiters
                ? 'Private phone hidden until application review'
                : 'Private contact strictly isolated to owner & admin'}
            </span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="mono-card p-6 space-y-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Basic & Academic Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Full Name *
                </label>
                <input
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Phone (Private PII)
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  College / University *
                </label>
                <input
                  required
                  value={form.college}
                  onChange={(e) => setForm({ ...form, college: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Degree *
                </label>
                <input
                  required
                  value={form.degree}
                  onChange={(e) => setForm({ ...form, degree: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Branch *
                </label>
                <input
                  required
                  value={form.branch}
                  onChange={(e) => setForm({ ...form, branch: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Current Semester
                </label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={form.semester}
                  onChange={(e) => setForm({ ...form, semester: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px] font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Graduation Year
                </label>
                <input
                  type="number"
                  min={2020}
                  max={2035}
                  value={form.graduationYear}
                  onChange={(e) => setForm({ ...form, graduationYear: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px] font-mono tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  CGPA (out of 10)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={10}
                  value={form.cgpa}
                  onChange={(e) => setForm({ ...form, cgpa: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px] font-mono tabular-nums"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                About Me
              </label>
              <textarea
                rows={3}
                value={form.about}
                onChange={(e) => setForm({ ...form, about: e.target.value })}
                placeholder="Summarize your technical focus, coursework, and career objectives."
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
              />
            </div>
          </div>

          {/* Skills & Links */}
          <div className="mono-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Skills, Certifications & Portfolio Links
            </h3>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Technical Skills (comma-separated)
              </label>
              <input
                value={form.skillsText}
                onChange={(e) => setForm({ ...form, skillsText: e.target.value })}
                placeholder="TypeScript, React, Node.js, SQL, Python"
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Technical Interests (comma-separated)
              </label>
              <input
                value={form.interestsText}
                onChange={(e) => setForm({ ...form, interestsText: e.target.value })}
                placeholder="Distributed Systems, Cloud Security, Product Engineering"
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Certifications (comma-separated)
              </label>
              <input
                value={form.certificationsText}
                onChange={(e) => setForm({ ...form, certificationsText: e.target.value })}
                placeholder="AWS Cloud Practitioner, Google Data Analytics"
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  GitHub URL
                </label>
                <input
                  type="url"
                  value={form.githubUrl}
                  onChange={(e) => setForm({ ...form, githubUrl: e.target.value })}
                  placeholder="https://github.com/..."
                  className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  LinkedIn URL
                </label>
                <input
                  type="url"
                  value={form.linkedinUrl}
                  onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Portfolio URL
                </label>
                <input
                  type="url"
                  value={form.portfolioUrl}
                  onChange={(e) => setForm({ ...form, portfolioUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
                />
              </div>
            </div>
          </div>

          {/* Projects */}
          <div className="mono-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Projects ({projects.length})
              </h3>
              <button
                type="button"
                onClick={() =>
                  setProjects((prev) => [
                    ...prev,
                    { title: '', techStack: '', description: '', link: '' },
                  ])
                }
                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 mono-btn-secondary"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Project
              </button>
            </div>

            {projects.length === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">
                Add academic or engineering projects to strengthen your applications.
              </p>
            ) : (
              <div className="space-y-4">
                {projects.map((proj, idx) => (
                  <div
                    key={idx}
                    className="pt-4 border-t border-[var(--border-subtle)] first:pt-0 first:border-0 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <input
                        placeholder="Project title"
                        value={proj.title}
                        onChange={(e) => {
                          const next = [...projects];
                          next[idx] = { ...proj, title: e.target.value };
                          setProjects(next);
                        }}
                        className="flex-1 px-3 py-1.5 text-sm border border-[var(--border-color)] rounded-[10px]"
                      />
                      <button
                        type="button"
                        aria-label="Remove project"
                        onClick={() => setProjects((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      placeholder="Tech stack (e.g. React, TypeScript, Firestore)"
                      value={proj.techStack}
                      onChange={(e) => {
                        const next = [...projects];
                        next[idx] = { ...proj, techStack: e.target.value };
                        setProjects(next);
                      }}
                      className="w-full px-3 py-1.5 text-xs border border-[var(--border-color)] rounded-[10px]"
                    />
                    <textarea
                      rows={2}
                      placeholder="Short description of architecture and impact"
                      value={proj.description}
                      onChange={(e) => {
                        const next = [...projects];
                        next[idx] = { ...proj, description: e.target.value };
                        setProjects(next);
                      }}
                      className="w-full px-3 py-1.5 text-xs border border-[var(--border-color)] rounded-[10px]"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Experience */}
          <div className="mono-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Prior Experience ({experience.length})
              </h3>
              <button
                type="button"
                onClick={() =>
                  setExperience((prev) => [
                    ...prev,
                    { role: '', organization: '', duration: '', summary: '' },
                  ])
                }
                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 mono-btn-secondary"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Experience
              </button>
            </div>

            {experience.map((ex, idx) => (
              <div
                key={idx}
                className="pt-4 border-t border-[var(--border-subtle)] first:pt-0 first:border-0 space-y-2.5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    placeholder="Role"
                    value={ex.role}
                    onChange={(e) => {
                      const next = [...experience];
                      next[idx] = { ...ex, role: e.target.value };
                      setExperience(next);
                    }}
                    className="px-3 py-1.5 text-sm border border-[var(--border-color)] rounded-[10px]"
                  />
                  <input
                    placeholder="Organization"
                    value={ex.organization}
                    onChange={(e) => {
                      const next = [...experience];
                      next[idx] = { ...ex, organization: e.target.value };
                      setExperience(next);
                    }}
                    className="px-3 py-1.5 text-sm border border-[var(--border-color)] rounded-[10px]"
                  />
                  <div className="flex gap-2">
                    <input
                      placeholder="Duration"
                      value={ex.duration}
                      onChange={(e) => {
                        const next = [...experience];
                        next[idx] = { ...ex, duration: e.target.value };
                        setExperience(next);
                      }}
                      className="flex-1 px-3 py-1.5 text-sm border border-[var(--border-color)] rounded-[10px]"
                    />
                    <button
                      type="button"
                      aria-label="Remove experience"
                      onClick={() => setExperience((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <textarea
                  rows={2}
                  placeholder="Summary of responsibilities"
                  value={ex.summary}
                  onChange={(e) => {
                    const next = [...experience];
                    next[idx] = { ...ex, summary: e.target.value };
                    setExperience(next);
                  }}
                  className="w-full px-3 py-1.5 text-xs border border-[var(--border-color)] rounded-[10px]"
                />
              </div>
            ))}
          </div>

          {/* Privacy control + Save */}
          <div className="mono-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <label className="flex items-center gap-3 text-xs text-[var(--text-secondary)] cursor-pointer">
              <input
                type="checkbox"
                checked={form.showContactToRecruiters}
                onChange={(e) => setForm({ ...form, showContactToRecruiters: e.target.checked })}
                className="accent-[var(--text-primary)]"
              />
              <span>Allow recruiters reviewing my submitted applications to see my contact email</span>
            </label>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold mono-btn-primary disabled:opacity-50 whitespace-nowrap"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving Profile...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
