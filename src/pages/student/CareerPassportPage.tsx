import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Briefcase,
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileText,
  FolderGit2,
  Globe,
  GraduationCap,
  Lock,
  PencilLine,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserAvatar } from '../../components/ui/Primitives';
import {
  ConnectedAccountsSection,
  isValidHttpUrl,
} from '../../components/ConnectedAccountsSection';
import { buildSafeSlug, saveStudentProfile } from '../../services/studentService';
import type {
  AchievementItem,
  CertificateItem,
  ExperienceItem,
  ProjectItem,
  SkillGroups,
  StudentSocialLinks,
} from '../../types';
import { exportCareerPassportToPdf, parseCommaList } from '../../utils/formatters';

export const CareerPassportPage: React.FC = () => {
  const { userRecord, studentProfile, refreshProfile } = useAuth();
  const [mode, setMode] = useState<'preview' | 'edit'>('preview');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [fullName, setFullName] = useState('');
  const [headline, setHeadline] = useState('');
  const [about, setAbout] = useState('');
  const [college, setCollege] = useState('');
  const [degree, setDegree] = useState('');
  const [branch, setBranch] = useState('');
  const [graduationYear, setGraduationYear] = useState(2027);
  const [cgpa, setCgpa] = useState(8.0);
  const [isPassportPublic, setIsPassportPublic] = useState(true);
  const [publicSlug, setPublicSlug] = useState('');

  const [languagesInput, setLanguagesInput] = useState('');
  const [frameworksInput, setFrameworksInput] = useState('');
  const [toolsInput, setToolsInput] = useState('');
  const [softSkillsInput, setSoftSkillsInput] = useState('');

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [experience, setExperience] = useState<ExperienceItem[]>([]);
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [socialLinks, setSocialLinks] = useState<StudentSocialLinks>({});

  useEffect(() => {
    if (!studentProfile && !userRecord) return;
    const sp = studentProfile;
    const name = sp?.fullName || userRecord?.fullName || '';
    setFullName(name);
    setHeadline(sp?.headline || '');
    setAbout(sp?.about || '');
    setCollege(sp?.college || '');
    setDegree(sp?.degree || '');
    setBranch(sp?.branch || '');
    setGraduationYear(sp?.graduationYear || 2027);
    setCgpa(sp?.cgpa || 0);
    setIsPassportPublic(sp?.isPassportPublic ?? true);
    setPublicSlug(sp?.publicSlug || (userRecord ? buildSafeSlug(name, userRecord.uid) : ''));

    const sg = sp?.skillGroups;
    setLanguagesInput(
      (sg?.languages && sg.languages.length > 0 ? sg.languages : sp?.skills || []).join(', ')
    );
    setFrameworksInput((sg?.frameworks || []).join(', '));
    setToolsInput((sg?.tools || []).join(', '));
    setSoftSkillsInput((sg?.softSkills || []).join(', '));

    setProjects(sp?.projects || []);
    setExperience(sp?.experience || []);
    setAchievements(sp?.achievements || []);
    setCertificates(sp?.certificates || []);
    setSocialLinks({
      github: sp?.socialLinks?.github || sp?.githubUrl || '',
      linkedin: sp?.socialLinks?.linkedin || sp?.linkedinUrl || '',
      portfolio: sp?.socialLinks?.portfolio || sp?.portfolioUrl || '',
      personalWebsite: sp?.socialLinks?.personalWebsite || '',
      leetcode: sp?.socialLinks?.leetcode || '',
      hackerrank: sp?.socialLinks?.hackerrank || '',
      codechef: sp?.socialLinks?.codechef || '',
      gfg: sp?.socialLinks?.gfg || '',
    });
  }, [studentProfile, userRecord]);

  const parsedSkillGroups: SkillGroups = useMemo(
    () => ({
      languages: parseCommaList(languagesInput, 15),
      frameworks: parseCommaList(frameworksInput, 15),
      tools: parseCommaList(toolsInput, 15),
      softSkills: parseCommaList(softSkillsInput, 12),
    }),
    [languagesInput, frameworksInput, toolsInput, softSkillsInput]
  );

  const allSkills = useMemo(
    () =>
      Array.from(
        new Set([
          ...parsedSkillGroups.languages,
          ...parsedSkillGroups.frameworks,
          ...parsedSkillGroups.tools,
          ...parsedSkillGroups.softSkills,
        ])
      ),
    [parsedSkillGroups]
  );

  const shareUrl = useMemo(() => {
    const slug = publicSlug || (userRecord ? buildSafeSlug(fullName, userRecord.uid) : '');
    if (!slug) return '';
    return `${window.location.origin}/passport/${slug}`;
  }, [publicSlug, fullName, userRecord]);

  const handleCopyShareUrl = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setFeedback({ type: 'err', text: 'Unable to copy link automatically. Copy it from the URL box.' });
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userRecord) return;
    setFeedback(null);

    const invalidLink = Object.entries(socialLinks).find(
      ([, v]) => v && v.trim().length > 0 && !isValidHttpUrl(v)
    );
    if (invalidLink) {
      setFeedback({
        type: 'err',
        text: `Invalid URL format for ${invalidLink[0]}. Please include https:// or http://`,
      });
      return;
    }

    setSaving(true);
    try {
      const cleanedProjects = projects
        .filter((p) => p.title.trim().length > 0)
        .map((p) => ({
          ...p,
          title: p.title.trim(),
          role: p.role?.trim() || '',
          techStack: p.techStack.trim(),
          description: p.description.trim(),
          githubUrl: p.githubUrl?.trim() || '',
          liveUrl: p.liveUrl?.trim() || '',
          imageUrl: p.imageUrl?.trim() || '',
          link: p.liveUrl?.trim() || p.githubUrl?.trim() || p.link?.trim() || '',
        }));

      const cleanedExperience = experience
        .filter((x) => x.role.trim().length > 0 || x.organization.trim().length > 0)
        .map((x) => ({
          role: x.role.trim(),
          organization: x.organization.trim(),
          duration: x.duration.trim(),
          summary: x.summary.trim(),
        }));

      const cleanedAchievements = achievements
        .filter((a) => a.title.trim().length > 0)
        .map((a) => ({
          title: a.title.trim(),
          category: a.category,
          issuer: a.issuer?.trim() || '',
          date: a.date?.trim() || '',
          description: a.description?.trim() || '',
        }));

      const cleanedCerts = certificates
        .filter((c) => c.title.trim().length > 0)
        .map((c) => ({
          title: c.title.trim(),
          issuer: c.issuer.trim(),
          date: c.date?.trim() || '',
          credentialUrl: c.credentialUrl?.trim() || '',
        }));

      await saveStudentProfile(userRecord.uid, {
        fullName: fullName.trim() || userRecord.fullName,
        headline: headline.trim(),
        email: studentProfile?.email || userRecord.email,
        phone: studentProfile?.phone || '',
        college: college.trim() || studentProfile?.college || '',
        degree: degree.trim() || studentProfile?.degree || '',
        branch: branch.trim() || studentProfile?.branch || '',
        semester: studentProfile?.semester || 6,
        graduationYear: Number(graduationYear) || 2027,
        cgpa: Number(cgpa) || 0,
        skills: allSkills,
        skillGroups: parsedSkillGroups,
        interests: studentProfile?.interests || [],
        projects: cleanedProjects,
        experience: cleanedExperience,
        achievements: cleanedAchievements,
        certificates: cleanedCerts,
        certifications: cleanedCerts.map((c) => c.title),
        socialLinks,
        linkedinUrl: socialLinks.linkedin || '',
        githubUrl: socialLinks.github || '',
        portfolioUrl: socialLinks.portfolio || '',
        publicSlug: publicSlug || buildSafeSlug(fullName || userRecord.fullName, userRecord.uid),
        isPassportPublic,
        about: about.trim(),
        photoURL: studentProfile?.photoURL || userRecord.photoURL || '',
        resumeId: studentProfile?.resumeId,
        resumeName: studentProfile?.resumeName,
        resumeUrl: studentProfile?.resumeUrl,
        resumeUpdatedAt: studentProfile?.resumeUpdatedAt,
        showContactToRecruiters: studentProfile?.showContactToRecruiters ?? true,
      });

      await refreshProfile();
      setFeedback({ type: 'ok', text: 'Career Passport published and synced successfully.' });
      setMode('preview');
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Failed to save Career Passport.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExportPdf = () => {
    exportCareerPassportToPdf({
      fullName: fullName || userRecord?.fullName || 'Student',
      headline,
      college,
      degree,
      branch,
      graduationYear,
      cgpa,
      about,
      skills: allSkills,
      projects,
      experience,
      achievements,
      socialLinks: socialLinks as Record<string, string | undefined>,
    });
  };

  const completion = studentProfile?.profileCompletion ?? 0;

  return (
    <div className="space-y-6 udaan-fade-in">
      {/* Top Action Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
            Digital Career Identity
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)] mt-0.5">
            Career Passport
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Your structured, recruiter-ready portfolio. Private contact details are never exposed on your public URL.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-card)] p-0.5">
            <button
              type="button"
              onClick={() => setMode('preview')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                mode === 'preview'
                  ? 'bg-[var(--action-bg)] text-[var(--action-text)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> Portfolio View
            </button>
            <button
              type="button"
              onClick={() => setMode('edit')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                mode === 'edit'
                  ? 'bg-[var(--action-bg)] text-[var(--action-text)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <PencilLine className="w-3.5 h-3.5" /> Edit Passport
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium mono-btn-secondary"
          >
            <Download className="w-3.5 h-3.5" /> Export PDF
          </button>

          {isPassportPublic && publicSlug && (
            <Link
              to={`/passport/${publicSlug}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold mono-btn-primary"
            >
              Public View <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Share & Visibility Control Bar */}
      <div className="mono-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] flex items-center justify-center shrink-0">
            {isPassportPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--text-primary)]">
              {isPassportPublic ? 'Public Career Passport Active' : 'Private Mode (Only Visible to You)'}
            </p>
            <p className="text-xs text-[var(--text-secondary)]">
              {isPassportPublic
                ? 'Verified recruiters and anyone with your link can view your academic & project portfolio (no phone/email shown).'
                : 'Switch to Public in Edit Passport to share your link externally.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {shareUrl && (
            <div className="hidden sm:flex items-center gap-2 rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs text-[var(--text-secondary)] font-mono max-w-[260px] truncate">
              {shareUrl.replace(/^https?:\/\//, '')}
            </div>
          )}
          <button
            type="button"
            onClick={() => void handleCopyShareUrl()}
            disabled={!isPassportPublic}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium mono-btn-secondary disabled:opacity-40"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy Link'}
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`rounded-[10px] px-4 py-3 text-xs font-medium border ${
            feedback.type === 'ok'
              ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-color)]'
              : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--text-muted)]'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {mode === 'preview' ? (
        <div className="mono-card overflow-hidden">
          {/* Editorial Monochromatic Banner */}
          <div className="bg-[#111111] border-b border-[#303030] text-white px-6 sm:px-10 py-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <UserAvatar
                  name={fullName}
                  photoURL={studentProfile?.photoURL || userRecord?.photoURL}
                  size="lg"
                />
                <div>
                  <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                    {fullName || 'Your Name'}
                  </h3>
                  <p className="text-sm text-[#D4D4D4] mt-1">
                    {headline || `${degree || 'Undergraduate'} · ${branch || 'Specialization'}`}
                  </p>
                  <p className="text-xs text-[#A3A3A3] mt-1.5 font-mono tabular-nums">
                    {college || 'Institution'} · Class of {graduationYear} · CGPA {cgpa.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="bg-[#171717] border border-[#303030] rounded-[10px] px-4 py-3 text-left sm:text-right shrink-0">
                <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3]">Profile Score</p>
                <p className="text-2xl font-mono tabular-nums font-semibold text-white mt-0.5">
                  {completion}%
                </p>
                <p className="text-[11px] text-[#A3A3A3]">
                  {studentProfile?.resumeId ? 'Resume attached' : 'Resume pending'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-10 space-y-10">
            {/* About */}
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-2.5">
                About & Career Objective
              </h4>
              <p className="text-sm text-[var(--text-primary)] leading-relaxed max-w-3xl">
                {about ||
                  'Add a concise summary of your technical strengths, campus leadership, and target internship roles.'}
              </p>
            </section>

            {/* Categorized Skills */}
            <section className="pt-6 border-t border-[var(--border-subtle)]">
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-4">
                Skills & Technical Stack
              </h4>
              {allSkills.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">No skills added yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { title: 'Languages', items: parsedSkillGroups.languages },
                    { title: 'Frameworks & Libraries', items: parsedSkillGroups.frameworks },
                    { title: 'Tools & Cloud', items: parsedSkillGroups.tools },
                    { title: 'Core & Soft Skills', items: parsedSkillGroups.softSkills },
                  ].map((group) => (
                    <div
                      key={group.title}
                      className="rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4"
                    >
                      <p className="text-xs font-semibold text-[var(--text-primary)] mb-2">
                        {group.title}
                      </p>
                      {group.items.length === 0 ? (
                        <p className="text-xs text-[var(--text-muted)]">—</p>
                      ) : (
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                          {group.items.join(' · ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Project Showcase */}
            <section className="pt-6 border-t border-[var(--border-subtle)]">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)] inline-flex items-center gap-1.5">
                  <FolderGit2 className="w-3.5 h-3.5" /> Project Showcase
                </h4>
                <button
                  type="button"
                  onClick={() => setMode('edit')}
                  className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  Manage projects
                </button>
              </div>
              {projects.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">
                  No projects showcased yet. Switch to Edit Passport to add your engineering, design, or research projects.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.map((proj, idx) => (
                    <div
                      key={`${proj.title}-${idx}`}
                      className="rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h5 className="text-sm font-semibold text-[var(--text-primary)]">
                              {proj.title}
                            </h5>
                            {proj.role && (
                              <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
                                {proj.role}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {proj.githubUrl && (
                              <a
                                href={proj.githubUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline underline-offset-2"
                              >
                                GitHub
                              </a>
                            )}
                            {(proj.liveUrl || proj.link) && (
                              <a
                                href={proj.liveUrl || proj.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-[var(--text-primary)] hover:underline underline-offset-2 font-medium"
                              >
                                Live
                              </a>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
                          {proj.description}
                        </p>
                      </div>
                      <p className="text-[11px] font-mono text-[var(--text-primary)] mt-4 pt-3 border-t border-[var(--border-subtle)]">
                        {proj.techStack}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Experience & Education */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-[var(--border-subtle)]">
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)] inline-flex items-center gap-1.5 mb-4">
                  <Briefcase className="w-3.5 h-3.5" /> Experience
                </h4>
                {experience.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">
                    No prior internships or campus roles added.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {experience.map((exp, idx) => (
                      <div
                        key={idx}
                        className="pb-4 border-b border-[var(--border-subtle)] last:border-b-0 last:pb-0"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm font-semibold text-[var(--text-primary)]">
                            {exp.role}
                          </p>
                          <span className="text-xs font-mono text-[var(--text-muted)] shrink-0">
                            {exp.duration}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
                          {exp.organization}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                          {exp.summary}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-6">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)] inline-flex items-center gap-1.5 mb-3">
                    <GraduationCap className="w-3.5 h-3.5" /> Education
                  </h4>
                  <div className="rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {college || 'College'}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {degree} · {branch}
                    </p>
                    <p className="text-xs font-mono tabular-nums text-[var(--text-primary)] mt-2">
                      Graduating {graduationYear} · CGPA {cgpa.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)] inline-flex items-center gap-1.5 mb-3">
                    <Award className="w-3.5 h-3.5" /> Achievements & Certifications
                  </h4>
                  {achievements.length === 0 && certificates.length === 0 ? (
                    <p className="text-xs text-[var(--text-muted)]">
                      No achievements or certificates recorded yet.
                    </p>
                  ) : (
                    <ul className="space-y-2.5">
                      {achievements.map((ach, idx) => (
                        <li
                          key={`ach-${idx}`}
                          className="text-xs text-[var(--text-primary)] flex items-start justify-between gap-2 pb-2 border-b border-[var(--border-subtle)] last:border-b-0"
                        >
                          <div>
                            <p className="font-semibold">{ach.title}</p>
                            <p className="text-[var(--text-secondary)]">
                              {ach.category}
                              {ach.issuer ? ` · ${ach.issuer}` : ''}
                            </p>
                          </div>
                          {ach.date && (
                            <span className="font-mono text-[var(--text-muted)] shrink-0">
                              {ach.date}
                            </span>
                          )}
                        </li>
                      ))}
                      {certificates.map((cert, idx) => (
                        <li
                          key={`cert-${idx}`}
                          className="text-xs text-[var(--text-primary)] flex items-start justify-between gap-2 pb-2 border-b border-[var(--border-subtle)] last:border-b-0"
                        >
                          <div>
                            <p className="font-semibold">{cert.title}</p>
                            <p className="text-[var(--text-secondary)]">
                              Certificate · {cert.issuer}
                            </p>
                          </div>
                          {cert.credentialUrl && (
                            <a
                              href={cert.credentialUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[var(--text-primary)] underline underline-offset-2 shrink-0"
                            >
                              Verify
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            </div>

            {/* Documents Summary */}
            <section className="pt-6 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[var(--text-secondary)]" />
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    Verified Resume Document
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {studentProfile?.resumeName
                      ? `${studentProfile.resumeName} — shared securely with companies you apply to.`
                      : 'No PDF resume uploaded yet.'}
                  </p>
                </div>
              </div>
              <Link
                to="/student/documents"
                className="text-xs font-medium px-3 py-1.5 mono-btn-secondary self-start sm:self-auto"
              >
                Manage Resume
              </Link>
            </section>

            {/* Connected Accounts & Live GitHub Repos */}
            <section className="pt-6 border-t border-[var(--border-subtle)]">
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)] mb-4">
                Connected Developer & Professional Accounts
              </h4>
              <ConnectedAccountsSection
                mode="student"
                links={socialLinks}
                editable={false}
                showGitHubRepos
              />
            </section>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Personal Identity & Privacy */}
          <div className="mono-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Identity, Headline & Visibility
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-[10px] border border-[var(--border-color)] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Career Headline
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g., Full-Stack Engineering Intern · Distributed Systems & React"
                  className="w-full rounded-[10px] border border-[var(--border-color)] px-3 py-2 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  About / Portfolio Narrative
                </label>
                <textarea
                  rows={3}
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="Highlight your focus areas, key engineering achievements, and internship goals..."
                  className="w-full rounded-[10px] border border-[var(--border-color)] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  College / University
                </label>
                <input
                  type="text"
                  required
                  value={college}
                  onChange={(e) => setCollege(e.target.value)}
                  className="w-full rounded-[10px] border border-[var(--border-color)] px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Degree
                  </label>
                  <input
                    type="text"
                    value={degree}
                    onChange={(e) => setDegree(e.target.value)}
                    className="w-full rounded-[10px] border border-[var(--border-color)] px-2.5 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    Grad Year
                  </label>
                  <input
                    type="number"
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(Number(e.target.value))}
                    className="w-full rounded-[10px] border border-[var(--border-color)] px-2.5 py-2 text-sm font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    CGPA
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    value={cgpa}
                    onChange={(e) => setCgpa(Number(e.target.value))}
                    className="w-full rounded-[10px] border border-[var(--border-color)] px-2.5 py-2 text-sm font-mono tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Branch / Major
                </label>
                <input
                  type="text"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full rounded-[10px] border border-[var(--border-color)] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Public URL Slug
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)] font-mono">/passport/</span>
                  <input
                    type="text"
                    value={publicSlug}
                    onChange={(e) =>
                      setPublicSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
                    }
                    className="w-full rounded-[10px] border border-[var(--border-color)] px-3 py-2 text-sm font-mono"
                  />
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2.5 pt-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPassportPublic}
                onChange={(e) => setIsPassportPublic(e.target.checked)}
                className="rounded border-[var(--border-color)] accent-[var(--text-primary)]"
              />
              <span className="text-xs text-[var(--text-primary)] font-medium">
                Make my Career Passport publicly shareable at /passport/{publicSlug || 'slug'} (email & phone stay private)
              </span>
            </label>
          </div>

          {/* Categorized Skills */}
          <div className="mono-card p-6 space-y-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Categorized Skills (comma separated)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Programming Languages
                </label>
                <input
                  type="text"
                  value={languagesInput}
                  onChange={(e) => setLanguagesInput(e.target.value)}
                  placeholder="TypeScript, Python, C++, SQL"
                  className="w-full rounded-[10px] border border-[var(--border-color)] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Frameworks & Libraries
                </label>
                <input
                  type="text"
                  value={frameworksInput}
                  onChange={(e) => setFrameworksInput(e.target.value)}
                  placeholder="React, Node.js, Next.js, PyTorch"
                  className="w-full rounded-[10px] border border-[var(--border-color)] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Tools & Platforms
                </label>
                <input
                  type="text"
                  value={toolsInput}
                  onChange={(e) => setToolsInput(e.target.value)}
                  placeholder="Git, Docker, PostgreSQL, Firebase, Figma"
                  className="w-full rounded-[10px] border border-[var(--border-color)] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Soft & Leadership Skills
                </label>
                <input
                  type="text"
                  value={softSkillsInput}
                  onChange={(e) => setSoftSkillsInput(e.target.value)}
                  placeholder="Technical Writing, System Design, Team Leadership"
                  className="w-full rounded-[10px] border border-[var(--border-color)] px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Projects Showcase */}
          <div className="mono-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Project Showcase</h3>
              <button
                type="button"
                onClick={() =>
                  setProjects((prev) => [
                    ...prev,
                    { title: '', role: '', techStack: '', description: '', githubUrl: '', liveUrl: '' },
                  ])
                }
                className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 mono-btn-secondary"
              >
                <Plus className="w-3.5 h-3.5" /> Add Project
              </button>
            </div>
            {projects.map((proj, idx) => (
              <div
                key={idx}
                className="rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4 space-y-3"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Project Title"
                    value={proj.title}
                    onChange={(e) =>
                      setProjects((p) =>
                        p.map((item, i) => (i === idx ? { ...item, title: e.target.value } : item))
                      )
                    }
                    className="rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Your Role (e.g., Lead Developer)"
                    value={proj.role || ''}
                    onChange={(e) =>
                      setProjects((p) =>
                        p.map((item, i) => (i === idx ? { ...item, role: e.target.value } : item))
                      )
                    }
                    className="rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-1.5 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Tech Stack (e.g., React, Go, Postgres)"
                    value={proj.techStack}
                    onChange={(e) =>
                      setProjects((p) =>
                        p.map((item, i) => (i === idx ? { ...item, techStack: e.target.value } : item))
                      )
                    }
                    className="rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-1.5 text-xs"
                  />
                </div>
                <textarea
                  rows={2}
                  placeholder="Describe the problem solved, architecture, and measurable outcomes..."
                  value={proj.description}
                  onChange={(e) =>
                    setProjects((p) =>
                      p.map((item, i) => (i === idx ? { ...item, description: e.target.value } : item))
                    )
                  }
                  className="w-full rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-1.5 text-xs"
                />
                <div className="flex flex-col sm:flex-row gap-3 items-center">
                  <input
                    type="url"
                    placeholder="GitHub Repository URL"
                    value={proj.githubUrl || ''}
                    onChange={(e) =>
                      setProjects((p) =>
                        p.map((item, i) => (i === idx ? { ...item, githubUrl: e.target.value } : item))
                      )
                    }
                    className="w-full rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-1.5 text-xs"
                  />
                  <input
                    type="url"
                    placeholder="Live Demo URL"
                    value={proj.liveUrl || ''}
                    onChange={(e) =>
                      setProjects((p) =>
                        p.map((item, i) => (i === idx ? { ...item, liveUrl: e.target.value } : item))
                      )
                    }
                    className="w-full rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-card)] px-3 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setProjects((p) => p.filter((_, i) => i !== idx))}
                    className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-lg shrink-0 transition-colors"
                    title="Remove project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Experience & Achievements */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="mono-card p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Experience</h3>
                <button
                  type="button"
                  onClick={() =>
                    setExperience((prev) => [
                      ...prev,
                      { role: '', organization: '', duration: '', summary: '' },
                    ])
                  }
                  className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 mono-btn-secondary"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
              {experience.map((exp, idx) => (
                <div
                  key={idx}
                  className="rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 space-y-2"
                >
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Role"
                      value={exp.role}
                      onChange={(e) =>
                        setExperience((x) =>
                          x.map((item, i) => (i === idx ? { ...item, role: e.target.value } : item))
                        )
                      }
                      className="rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Organization"
                      value={exp.organization}
                      onChange={(e) =>
                        setExperience((x) =>
                          x.map((item, i) =>
                            i === idx ? { ...item, organization: e.target.value } : item
                          )
                        )
                      }
                      className="rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Duration (e.g., May 2025 – Jul 2025)"
                    value={exp.duration}
                    onChange={(e) =>
                      setExperience((x) =>
                        x.map((item, i) => (i === idx ? { ...item, duration: e.target.value } : item))
                      )
                    }
                    className="w-full rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 py-1.5 text-xs"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Key contributions & outcomes"
                      value={exp.summary}
                      onChange={(e) =>
                        setExperience((x) =>
                          x.map((item, i) => (i === idx ? { ...item, summary: e.target.value } : item))
                        )
                      }
                      className="w-full rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setExperience((x) => x.filter((_, i) => i !== idx))}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] px-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mono-card p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Achievements & Awards
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    setAchievements((prev) => [
                      ...prev,
                      { title: '', category: 'Hackathon', issuer: '', date: '' },
                    ])
                  }
                  className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 mono-btn-secondary"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
              {achievements.map((ach, idx) => (
                <div
                  key={idx}
                  className="rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 space-y-2"
                >
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Achievement title"
                      value={ach.title}
                      onChange={(e) =>
                        setAchievements((a) =>
                          a.map((item, i) => (i === idx ? { ...item, title: e.target.value } : item))
                        )
                      }
                      className="col-span-2 rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 py-1.5 text-xs"
                    />
                    <select
                      value={ach.category}
                      onChange={(e) =>
                        setAchievements((a) =>
                          a.map((item, i) =>
                            i === idx
                              ? { ...item, category: e.target.value as AchievementItem['category'] }
                              : item
                          )
                        )
                      }
                      className="rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-card)] px-2 py-1.5 text-xs"
                    >
                      <option value="Hackathon">Hackathon</option>
                      <option value="Certification">Certification</option>
                      <option value="Award">Award</option>
                      <option value="Competition">Competition</option>
                      <option value="Academic">Academic</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Issuer / Event"
                      value={ach.issuer || ''}
                      onChange={(e) =>
                        setAchievements((a) =>
                          a.map((item, i) => (i === idx ? { ...item, issuer: e.target.value } : item))
                        )
                      }
                      className="w-full rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 py-1.5 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Year"
                      value={ach.date || ''}
                      onChange={(e) =>
                        setAchievements((a) =>
                          a.map((item, i) => (i === idx ? { ...item, date: e.target.value } : item))
                        )
                      }
                      className="w-24 rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 py-1.5 text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setAchievements((a) => a.filter((_, i) => i !== idx))}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)] px-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Connected Accounts Editor */}
          <div className="mono-card p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Connected Accounts
              </h3>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Link your coding profiles and portfolio. GitHub automatically fetches your public repositories.
              </p>
            </div>
            <ConnectedAccountsSection
              mode="student"
              links={socialLinks}
              editable
              onChange={setSocialLinks}
              showGitHubRepos
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setMode('preview')}
              className="px-4 py-2 text-xs font-medium mono-btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold mono-btn-primary disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving Passport...' : 'Save Career Passport'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
