import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Award,
  Briefcase,
  Download,
  FolderGit2,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';
import { PublicNavbar } from '../components/PublicNavbar';
import { BrandLogo } from '../components/BrandLogo';
import { LoadingSkeleton, UserAvatar } from '../components/ui/Primitives';
import { ConnectedAccountsSection } from '../components/ConnectedAccountsSection';
import { getCareerPassportBySlug } from '../services/studentService';
import type { CareerPassportRecord } from '../types';
import { exportCareerPassportToPdf } from '../utils/formatters';

export const PublicPassportPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [passport, setPassport] = useState<CareerPassportRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      setError('Invalid Career Passport URL.');
      return;
    }
    let active = true;
    async function load() {
      try {
        const data = await getCareerPassportBySlug(slug!);
        if (!active) return;
        if (!data || !data.isPublic) {
          setError('This Career Passport is private or does not exist.');
        } else {
          setPassport(data);
        }
      } catch {
        if (active) setError('This Career Passport is currently private or unavailable.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [slug]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col">
      <PublicNavbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Udaan
          </Link>

          {passport && (
            <button
              type="button"
              onClick={() =>
                exportCareerPassportToPdf({
                  fullName: passport.fullName,
                  headline: passport.headline,
                  college: passport.college,
                  degree: passport.degree,
                  branch: passport.branch,
                  graduationYear: passport.graduationYear,
                  cgpa: passport.cgpa,
                  about: passport.about,
                  skills: passport.skills,
                  projects: passport.projects,
                  experience: passport.experience,
                  achievements: passport.achievements,
                  socialLinks: passport.socialLinks as Record<string, string | undefined>,
                })
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold mono-btn-primary"
            >
              <Download className="w-3.5 h-3.5" /> Download PDF Passport
            </button>
          )}
        </div>

        {loading ? (
          <LoadingSkeleton rows={5} />
        ) : error || !passport ? (
          <div className="mono-card p-12 text-center">
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">
              Career Passport Unavailable
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-md mx-auto">
              {error || 'This portfolio link is private or could not be found.'}
            </p>
            <Link
              to="/internships"
              className="mt-6 inline-block px-4 py-2 text-xs font-semibold mono-btn-primary"
            >
              Explore Open Opportunities
            </Link>
          </div>
        ) : (
          <article className="mono-card overflow-hidden">
            <header className="bg-[#111111] text-[#FFFFFF] px-6 sm:px-10 py-9 border-b border-[var(--border-color)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <UserAvatar name={passport.fullName} photoURL={passport.photoURL} size="lg" />
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-[#A3A3A3] font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#FFFFFF]" /> Verified Udaan Career
                      Passport
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-semibold mt-1 tracking-tight">
                      {passport.fullName}
                    </h1>
                    <p className="text-sm text-[#D4D4D4] mt-1">
                      {passport.headline || `${passport.degree} in ${passport.branch}`}
                    </p>
                    <p className="text-xs text-[#A3A3A3] mt-1.5 font-mono tabular-nums">
                      {passport.college} · Class of {passport.graduationYear} · CGPA{' '}
                      {passport.cgpa.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="bg-[#171717] border border-[#303030] rounded-[12px] px-4 py-3 text-left sm:text-right shrink-0">
                  <p className="text-[11px] uppercase tracking-wider text-[#A3A3A3]">
                    Readiness Score
                  </p>
                  <p className="text-2xl font-mono tabular-nums font-semibold mt-0.5 text-[#FFFFFF]">
                    {passport.profileCompletion}%
                  </p>
                  <p className="text-[11px] text-[#737373]">
                    {passport.resumeAvailable ? 'Verified resume on file' : 'Academic profile'}
                  </p>
                </div>
              </div>
            </header>

            <div className="p-6 sm:p-10 space-y-9">
              {passport.about && (
                <section>
                  <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)] mb-2">
                    About
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-3xl">
                    {passport.about}
                  </p>
                </section>
              )}

              {passport.skills.length > 0 && (
                <section className="pt-6 border-t border-[var(--border-color)]">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)] mb-3">
                    Technical & Core Skills
                  </h2>
                  <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                    {passport.skills.join(' · ')}
                  </p>
                </section>
              )}

              {passport.projects && passport.projects.length > 0 && (
                <section className="pt-6 border-t border-[var(--border-color)]">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)] inline-flex items-center gap-1.5 mb-4">
                    <FolderGit2 className="w-3.5 h-3.5" /> Selected Projects
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {passport.projects.map((proj, idx) => (
                      <div
                        key={idx}
                        className="rounded-[12px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-5 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                                {proj.title}
                              </h3>
                              {proj.role && (
                                <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
                                  {proj.role}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0 text-xs">
                              {proj.githubUrl && (
                                <a
                                  href={proj.githubUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] underline"
                                >
                                  GitHub
                                </a>
                              )}
                              {(proj.liveUrl || proj.link) && (
                                <a
                                  href={proj.liveUrl || proj.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[var(--text-primary)] font-medium hover:underline"
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
                        <p className="text-[11px] font-mono text-[var(--text-muted)] mt-4 pt-3 border-t border-[var(--border-color)]">
                          {proj.techStack}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6 border-t border-[var(--border-color)]">
                {passport.experience && passport.experience.length > 0 && (
                  <section>
                    <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)] inline-flex items-center gap-1.5 mb-4">
                      <Briefcase className="w-3.5 h-3.5" /> Experience
                    </h2>
                    <div className="space-y-4">
                      {passport.experience.map((exp, idx) => (
                        <div
                          key={idx}
                          className="pb-4 border-b border-[var(--border-color)] last:border-b-0"
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">
                              {exp.role}
                            </p>
                            <span className="text-xs font-mono text-[var(--text-muted)]">
                              {exp.duration}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
                            {exp.organization}
                          </p>
                          <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                            {exp.summary}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                <section className="space-y-6">
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)] inline-flex items-center gap-1.5 mb-3">
                      <GraduationCap className="w-3.5 h-3.5" /> Education
                    </h2>
                    <div className="rounded-[12px] border border-[var(--border-color)] bg-[var(--bg-secondary)] p-4">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {passport.college}
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        {passport.degree} · {passport.branch}
                      </p>
                      <p className="text-xs font-mono tabular-nums text-[var(--text-primary)] mt-2">
                        Class of {passport.graduationYear} · CGPA {passport.cgpa.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {passport.achievements && passport.achievements.length > 0 && (
                    <div>
                      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)] inline-flex items-center gap-1.5 mb-3">
                        <Award className="w-3.5 h-3.5" /> Achievements
                      </h2>
                      <ul className="space-y-2">
                        {passport.achievements.map((ach, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-[var(--text-primary)] flex items-baseline justify-between gap-2 pb-2 border-b border-[var(--border-color)] last:border-b-0"
                          >
                            <span>
                              <strong>{ach.title}</strong> · {ach.category}
                              {ach.issuer ? ` (${ach.issuer})` : ''}
                            </span>
                            {ach.date && (
                              <span className="font-mono text-[var(--text-muted)] shrink-0">
                                {ach.date}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </section>
              </div>

              {passport.socialLinks && (
                <section className="pt-6 border-t border-[var(--border-color)]">
                  <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)] mb-4">
                    Connected Profiles & Public Code
                  </h2>
                  <ConnectedAccountsSection
                    mode="student"
                    links={passport.socialLinks}
                    editable={false}
                    showGitHubRepos
                  />
                </section>
              )}
            </div>
          </article>
        )}
      </main>

      <footer className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)] py-6 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <BrandLogo size="sm" />
          <p className="text-xs text-[var(--text-muted)]">
            Public Career Passport · Personal email & phone details are strictly redacted.
          </p>
        </div>
      </footer>
    </div>
  );
};
