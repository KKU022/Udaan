import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Building2,
  CheckCircle2,
  Compass,
  GraduationCap,
  Pause,
  Play,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { PublicNavbar } from '../components/PublicNavbar';
import { BrandLogo } from '../components/BrandLogo';
import { EcosystemNetwork3D } from '../components/EcosystemNetwork3D';
import { useAuth } from '../context/AuthContext';
import { listPublishedInternships } from '../services/internshipService';
import { getPlatformStats } from '../services/adminService';
import type { InternshipRecord, PlatformStatsRecord } from '../types';
import { formatDate } from '../utils/formatters';

interface AmbientVideoLayerProps {
  playing: boolean;
  variant: 'hero' | 'story';
  chapterIndex?: number;
}

const AmbientVideoLayer: React.FC<AmbientVideoLayerProps> = ({
  playing,
  variant,
  chapterIndex = 0,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [streamReady, setStreamReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    const canvas = document.createElement('canvas');
    canvas.width = variant === 'hero' ? 960 : 800;
    canvas.height = variant === 'hero' ? 540 : 450;
    const ctx = canvas.getContext('2d');
    if (!ctx || typeof canvas.captureStream !== 'function') return;

    const videoEl = videoRef.current;
    if (!videoEl) return;

    const stream = canvas.captureStream(24);
    videoEl.srcObject = stream;
    videoEl.play().catch(() => {
      // Autoplay blocked; monochrome architectural SVG poster remains visible
    });
    setStreamReady(true);

    let rafId = 0;
    let t = 0;
    const playingRef = { current: playing };

    const palettes = [
      { bg1: '#090909', bg2: '#141414', accent: '#FFFFFF' },
      { bg1: '#0B0B0B', bg2: '#181818', accent: '#E5E5E5' },
      { bg1: '#090909', bg2: '#171717', accent: '#D4D4D4' },
    ];
    const pal = palettes[chapterIndex % palettes.length];

    const renderFrame = () => {
      if (playingRef.current) t += 0.012;
      const w = canvas.width;
      const h = canvas.height;

      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, pal.bg1);
      grad.addColorStop(1, pal.bg2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Subtle monochrome silver light sweeps
      for (let i = 0; i < 4; i++) {
        const bx = ((i * 280 + t * 40 * (i % 2 === 0 ? 1 : -0.6)) % (w + 320)) - 160;
        const beamGrad = ctx.createLinearGradient(bx, 0, bx + 180, h);
        beamGrad.addColorStop(0, 'rgba(255, 255, 255, 0.055)');
        beamGrad.addColorStop(0.5, 'rgba(163, 163, 163, 0.025)');
        beamGrad.addColorStop(1, 'rgba(9, 9, 9, 0)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(bx, 0);
        ctx.lineTo(bx + 150, 0);
        ctx.lineTo(bx + 290, h);
        ctx.lineTo(bx + 90, h);
        ctx.closePath();
        ctx.fill();
      }

      // Fine architectural grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      const step = 54;
      const offsetX = (t * 12) % step;
      for (let x = -step; x < w + step; x += step) {
        ctx.beginPath();
        ctx.moveTo(x + offsetX, 0);
        ctx.lineTo(x + offsetX, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Ascending bridge trajectories
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        const yBase = h * (0.76 - k * 0.14);
        ctx.moveTo(0, yBase);
        ctx.bezierCurveTo(
          w * 0.3,
          yBase - 90 + Math.sin(t + k) * 18,
          w * 0.65,
          yBase - 140 + Math.cos(t * 0.8 + k) * 20,
          w,
          yBase - 160
        );
        ctx.strokeStyle = k === 0 ? 'rgba(255, 255, 255, 0.28)' : 'rgba(163, 163, 163, 0.14)';
        ctx.lineWidth = k === 0 ? 1.8 : 1;
        ctx.stroke();

        const p = (t * (0.12 + k * 0.04) + k * 0.33) % 1;
        const px = p * w;
        const py = yBase - p * 145 - Math.sin(p * Math.PI) * 55;
        ctx.fillStyle = k === 0 ? pal.accent : '#A3A3A3';
        ctx.beginPath();
        ctx.arc(px, py, k === 0 ? 3.5 : 2.2, 0, Math.PI * 2);
        ctx.fill();
      }

      rafId = window.requestAnimationFrame(renderFrame);
    };

    rafId = window.requestAnimationFrame(renderFrame);

    return () => {
      window.cancelAnimationFrame(rafId);
      stream.getTracks().forEach((tr) => tr.stop());
      if (videoEl) {
        videoEl.srcObject = null;
      }
    };
  }, [variant, chapterIndex, playing]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#090909]" aria-hidden="true">
      <svg
        viewBox="0 0 1200 675"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <linearGradient id={`poster-${variant}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#090909" />
            <stop offset="55%" stopColor="#111111" />
            <stop offset="100%" stopColor="#171717" />
          </linearGradient>
        </defs>
        <rect width="1200" height="675" fill={`url(#poster-${variant})`} />
        <path
          d="M-40 540 C 320 420, 660 220, 1240 160"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.8"
          strokeOpacity="0.22"
        />
        <path
          d="M-40 610 C 360 490, 740 310, 1240 240"
          fill="none"
          stroke="#A3A3A3"
          strokeWidth="1"
          strokeOpacity="0.16"
        />
      </svg>

      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
          streamReady ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#090909]/70 via-[#090909]/55 to-[#090909]/92" />
    </div>
  );
};

const STORY_CHAPTERS = [
  {
    code: '01',
    title: 'Verified Campus Discovery',
    caption:
      'Every recruiting organization is verified by the placement cell before a single internship listing reaches students—eliminating spam and unverified offers.',
    metric: '100% Admin-Reviewed Postings',
  },
  {
    code: '02',
    title: 'Digital Career Passport',
    caption:
      'Students replace scattered static documents with a living portfolio featuring categorized skills, live GitHub repositories, project showcases, and one-click PDF export.',
    metric: 'Shareable Privacy-First Link',
  },
  {
    code: '03',
    title: 'Transparent End-to-End Tracking',
    caption:
      'From initial application to interview panels, milestone check-ins, and completion certificates, every stakeholder sees real-time progress without spreadsheets.',
    metric: 'Real-Time Audit Trail',
  },
];

export const LandingPage: React.FC = () => {
  const { userRecord } = useAuth();
  const [featured, setFeatured] = useState<InternshipRecord[]>([]);
  const [stats, setStats] = useState<PlatformStatsRecord | null>(null);
  const [heroPlaying, setHeroPlaying] = useState(true);
  const [storyPlaying, setStoryPlaying] = useState(true);
  const [activeStory, setActiveStory] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadPublicData() {
      try {
        const [internships, platformStats] = await Promise.all([
          listPublishedInternships(),
          getPlatformStats(),
        ]);
        if (!active) return;
        setFeatured(internships.slice(0, 6));
        setStats(platformStats);
      } catch {
        // Public landing degrades cleanly when Firestore is empty
      }
    }
    void loadPublicData();
    return () => {
      active = false;
    };
  }, []);

  const profileCtaPath = userRecord
    ? userRecord.role === 'student'
      ? '/student/passport'
      : userRecord.role === 'company'
      ? '/recruiter'
      : '/admin'
    : '/register';

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col">
      <PublicNavbar />

      {/* ==================== MONOCHROME EDITORIAL HERO ==================== */}
      <section className="relative min-h-[84vh] flex items-center overflow-hidden bg-[#090909] text-[#FFFFFF] border-b border-[var(--border-color)]">
        <AmbientVideoLayer playing={heroPlaying} variant="hero" />

        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#A3A3A3]">
                Udaan · Where Ambition Takes Flight
              </p>

              <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-semibold leading-[1.06] tracking-[-0.03em] text-[#FFFFFF]">
                Your potential deserves the right opportunity.
              </h1>

              <p className="text-base sm:text-lg text-[#A3A3A3] leading-relaxed max-w-xl">
                Discover verified internships, connect with leading organizations, and turn your
                campus journey into a measurable career.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  to="/explore"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-[10px] bg-[#FFFFFF] text-[#090909] text-sm font-semibold hover:bg-[#E5E5E5] transition-colors duration-150"
                >
                  Explore Opportunities
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to={profileCtaPath}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-[10px] border border-[#303030] bg-[#171717]/80 text-[#FFFFFF] text-sm font-medium hover:bg-[#202020] hover:border-[#525252] transition-colors duration-150"
                >
                  Build Your Career Profile
                </Link>
              </div>

              <div className="pt-6 border-t border-[#242424] flex flex-wrap items-center justify-between gap-4 text-xs text-[#737373]">
                <span>Verified Organizations · Digital Career Passport · Placement Oversight</span>
                <button
                  type="button"
                  onClick={() => setHeroPlaying((p) => !p)}
                  className="inline-flex items-center gap-1.5 text-[#A3A3A3] hover:text-[#FFFFFF] transition-colors"
                  aria-label={heroPlaying ? 'Pause background motion' : 'Play background motion'}
                >
                  {heroPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {heroPlaying ? 'Pause motion' : 'Play motion'}
                </button>
              </div>
            </div>

            <div className="lg:col-span-6">
              <EcosystemNetwork3D />
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SECTION A: CAREER ECOSYSTEM ==================== */}
      <section id="ecosystem" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            The Career Ecosystem
          </p>
          <h2 className="text-3xl sm:text-4xl font-semibold text-[var(--text-primary)] mt-2 tracking-[-0.025em]">
            One unified digital bridge between campus and industry.
          </h2>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-3 leading-relaxed">
            Udaan replaces fragmented spreadsheets, unverified job boards, and opaque application
            emails with a single institutional platform where every profile and opportunity is
            structured and accountable.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: GraduationCap,
              num: '01',
              title: 'Students Build Living Portfolios',
              body: 'Craft a verified Career Passport with categorized technical skills, GitHub repository sync, academic projects, and one-click PDF export.',
            },
            {
              icon: ShieldCheck,
              num: '02',
              title: 'Universities Govern Quality',
              body: 'Placement administrators vet recruiting companies, approve every internship posting, monitor selections, and export compliance reports.',
            },
            {
              icon: Building2,
              num: '03',
              title: 'Organizations Hire With Clarity',
              body: 'Verified hiring teams review structured Career Passports, manage applicant pipelines, schedule interviews, and record intern milestones.',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.num}
                className="mono-card p-7 flex flex-col justify-between hover:border-[var(--text-muted)] transition-colors duration-150"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-10 h-10 rounded-[10px] bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-primary)] flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-mono text-xs text-[var(--text-muted)]">{item.num}</span>
                  </div>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">
                    {item.title}
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-2 leading-relaxed">
                    {item.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ==================== SECTION B: FEATURED OPPORTUNITIES ==================== */}
      <section className="py-20 bg-[var(--bg-secondary)] border-y border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                Live Verified Openings
              </p>
              <h2 className="text-3xl font-semibold text-[var(--text-primary)] mt-2 tracking-[-0.025em]">
                Featured Opportunities
              </h2>
            </div>
            <Link
              to="/explore"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--text-primary)] hover:opacity-75 transition-opacity"
            >
              Browse all opportunities <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {featured.length === 0 ? (
            <div className="mono-card p-10 text-center">
              <Compass className="w-6 h-6 text-[var(--text-secondary)] mx-auto mb-3" />
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Verified internships appear here as soon as companies publish approved roles.
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Sign in as an administrator to seed demonstration opportunities or register your
                company.
              </p>
              <Link
                to="/explore"
                className="mt-5 inline-block px-4 py-2 text-xs font-semibold mono-btn-primary"
              >
                Open Opportunity Board
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {featured.map((item) => (
                <Link
                  key={item.internshipId}
                  to={`/internships/${item.internshipId}`}
                  className="group mono-card p-6 hover:border-[var(--text-muted)] flex flex-col justify-between transition-colors duration-150"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
                      <span className="font-medium text-[var(--text-secondary)] truncate">
                        {item.companyName}
                      </span>
                      <span className="font-mono tabular-nums shrink-0">{item.workMode}</span>
                    </div>
                    <h3 className="text-base font-semibold text-[var(--text-primary)] group-hover:underline underline-offset-4 mt-2 transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                    {item.skills && item.skills.length > 0 && (
                      <p className="text-[11px] font-mono text-[var(--text-muted)] mt-4 truncate">
                        {item.skills.slice(0, 4).join(' · ')}
                      </p>
                    )}
                  </div>

                  <div className="mt-5 pt-4 border-t border-[var(--border-color)] flex items-center justify-between text-xs">
                    <span className="font-mono tabular-nums font-semibold text-[var(--text-primary)]">
                      {item.stipendDisplay}
                    </span>
                    <span className="text-[var(--text-muted)] font-mono tabular-nums">
                      {item.location} · Due {formatDate(item.deadline)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ==================== SECTION C: HOW UDAAN WORKS ==================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="max-w-2xl mb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Structured Workflow
          </p>
          <h2 className="text-3xl font-semibold text-[var(--text-primary)] mt-2 tracking-[-0.025em]">
            How Udaan Works
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: 'Step 01',
              title: 'Build Your Career Passport',
              desc: 'Verify your academic details, organize technical and core skills, showcase projects, connect GitHub and LinkedIn, and upload your PDF resume.',
            },
            {
              step: 'Step 02',
              title: 'Apply to Verified Roles',
              desc: 'Filter admin-approved internships by stipend, work mode, domain, and CGPA eligibility. Track every stage transition in real time.',
            },
            {
              step: 'Step 03',
              title: 'Interview & Complete Milestones',
              desc: 'Receive interview schedules, collaborate with assigned industry mentors, log weekly internship progress, and earn verified evaluations.',
            },
          ].map((s) => (
            <div key={s.step} className="border-t border-[var(--text-primary)] pt-6">
              <p className="text-xs font-mono uppercase tracking-wider text-[var(--text-muted)] font-semibold">
                {s.step}
              </p>
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-2">{s.title}</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-2.5 leading-relaxed">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ==================== SECTION D: TRUST & TRANSPARENCY ==================== */}
      <section className="py-20 bg-[#111111] text-[#FFFFFF] border-y border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#A3A3A3]">
                Trust & Institutional Governance
              </p>
              <h2 className="text-3xl font-semibold mt-2 tracking-[-0.025em]">
                Verified at every step. Audited by design.
              </h2>
              <p className="text-sm text-[#A3A3A3] mt-3 leading-relaxed">
                Campus hiring demands accountability. Udaan enforces strict role-based security
                rules so student contact details stay protected, recruiters are vetted before
                posting, and placement cells maintain a complete audit ledger.
              </p>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  title: 'Company Verification Gate',
                  body: 'Every recruiting organization undergoes placement-office verification before posting privileges unlock.',
                },
                {
                  title: 'Opportunity Approval Queue',
                  body: 'Stipends, deadlines, and eligibility criteria are reviewed by administrators prior to student publication.',
                },
                {
                  title: 'Privacy-First Career Passport',
                  body: 'Public portfolio URLs showcase skills, projects, and GitHub work while keeping emails, phones, and private resumes strictly hidden.',
                },
                {
                  title: 'Immutable Activity Logs',
                  body: 'Approvals, status updates, and policy changes are timestamped in institutional audit logs and exportable to CSV and PDF.',
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-xl border border-[#303030] bg-[#171717] p-5"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#FFFFFF]">
                    <CheckCircle2 className="w-4 h-4 text-[#A3A3A3] shrink-0" />
                    <span>{card.title}</span>
                  </div>
                  <p className="text-xs text-[#A3A3A3] mt-2 leading-relaxed">{card.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SECTION E: CAREER IMPACT (LIVE STATS) ==================== */}
      <section className="py-16 bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                Live Platform Metrics
              </p>
              <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--text-primary)] mt-1 tracking-[-0.025em]">
                Career Impact Across the Network
              </h2>
            </div>
            <p className="text-xs text-[var(--text-muted)]">Synced directly from Cloud Firestore</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                label: 'Registered Students',
                value: stats?.studentsCount ?? 0,
                sub: 'Active academic & Career Passport profiles',
              },
              {
                label: 'Verified Organizations',
                value: stats?.verifiedCompaniesCount ?? 0,
                sub: 'Vetted hiring partners on Udaan',
              },
              {
                label: 'Published Internships',
                value: stats?.activeInternshipsCount ?? featured.length,
                sub: 'Approved roles open for application',
              },
              {
                label: 'Confirmed Selections',
                value: stats?.placementsCount ?? 0,
                sub: 'Verified campus internship offers',
              },
            ].map((stat) => (
              <div key={stat.label} className="mono-card p-6">
                <p className="text-xs font-medium text-[var(--text-muted)]">{stat.label}</p>
                <p className="text-3xl sm:text-4xl font-mono tabular-nums font-semibold text-[var(--text-primary)] mt-2">
                  {stat.value.toLocaleString()}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-2">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== SECTION F: FOR EVERYONE ==================== */}
      <section id="for-everyone" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="max-w-2xl mb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Built For Every Stakeholder
          </p>
          <h2 className="text-3xl font-semibold text-[var(--text-primary)] mt-2 tracking-[-0.025em]">
            Purpose-built workspaces for Students, Recruiters & Universities.
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Award,
              role: 'For Students',
              headline: 'Turn projects into verified career proof.',
              points: [
                'Shareable Career Passport with live GitHub repository sync',
                '5-factor Career Readiness score and tailored discovery tabs',
                'Real-time application timeline, interview schedule & progress tracker',
              ],
              cta: 'Start as Student',
              to: '/register?role=student',
            },
            {
              icon: Building2,
              role: 'For Companies & Recruiters',
              headline: 'Hire top campus talent with zero clutter.',
              points: [
                'Structured applicant table & visual stage pipeline board',
                'Direct access to candidate Career Passports & PDF resumes',
                'Built-in interview scheduling, mentor updates & evaluation rubrics',
              ],
              cta: 'Register Organization',
              to: '/register?role=company',
            },
            {
              icon: Users,
              role: 'For Universities & Placement Cells',
              headline: 'Govern campus placements with total visibility.',
              points: [
                'Company verification & internship approval workflow queues',
                'Live institutional analytics with one-click CSV & PDF reporting',
                'Configurable application caps, withdrawal policies & audit logs',
              ],
              cta: 'Administrator Sign In',
              to: '/login',
            },
          ].map((block) => {
            const Icon = block.icon;
            return (
              <div key={block.role} className="mono-card p-7 flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    <Icon className="w-4 h-4 text-[var(--text-primary)]" />
                    <span>{block.role}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-[var(--text-primary)] mt-3">
                    {block.headline}
                  </h3>
                  <ul className="mt-5 space-y-3 text-sm text-[var(--text-secondary)]">
                    {block.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-[var(--text-primary)] shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  to={block.to}
                  className="mt-7 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold mono-btn-secondary"
                >
                  {block.cta} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* ==================== SECTION G: VIDEO STORY SECTION ==================== */}
      <section className="py-20 bg-[var(--bg-secondary)] border-t border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-7 relative rounded-xl overflow-hidden min-h-[340px] border border-[#303030] bg-[#090909] text-[#FFFFFF] flex flex-col justify-between p-7">
              <AmbientVideoLayer
                playing={storyPlaying}
                variant="story"
                chapterIndex={activeStory}
              />

              <div className="relative z-10 flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-[#A3A3A3]">
                  Udaan Platform Film · Chapter {STORY_CHAPTERS[activeStory].code}
                </span>
                <button
                  type="button"
                  onClick={() => setStoryPlaying((p) => !p)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-[#303030] bg-[#171717]/80 hover:bg-[#202020] text-xs font-medium text-[#FFFFFF] transition-colors"
                >
                  {storyPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {storyPlaying ? 'Pause' : 'Play'}
                </button>
              </div>

              <div className="relative z-10 max-w-lg mt-16">
                <p className="text-xs font-mono text-[#A3A3A3] uppercase tracking-wider">
                  {STORY_CHAPTERS[activeStory].metric}
                </p>
                <h3 className="text-2xl sm:text-3xl font-semibold mt-1.5 tracking-[-0.02em]">
                  {STORY_CHAPTERS[activeStory].title}
                </h3>
                <p className="text-sm text-[#A3A3A3] mt-2.5 leading-relaxed">
                  {STORY_CHAPTERS[activeStory].caption}
                </p>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  Inside The Platform
                </p>
                <h2 className="text-2xl font-semibold text-[var(--text-primary)] mt-1 tracking-[-0.02em]">
                  From campus ambition to verified industry outcomes.
                </h2>
              </div>

              <div className="space-y-2.5">
                {STORY_CHAPTERS.map((ch, idx) => {
                  const selected = idx === activeStory;
                  return (
                    <button
                      key={ch.code}
                      type="button"
                      onClick={() => setActiveStory(idx)}
                      className={`w-full text-left rounded-xl border p-4 transition-colors duration-150 ${
                        selected
                          ? 'bg-[var(--action-bg)] text-[var(--action-text)] border-[var(--action-bg)]'
                          : 'bg-[var(--bg-card)] text-[var(--text-primary)] border-[var(--border-color)] hover:bg-[var(--bg-elevated)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono opacity-75">Chapter {ch.code}</span>
                        <span className="text-[11px] font-medium opacity-75">{ch.metric}</span>
                      </div>
                      <p className="text-sm font-semibold mt-1">{ch.title}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== SECTION H: FINAL CTA ==================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto rounded-2xl border border-[#303030] bg-[#111111] text-[#FFFFFF] px-6 sm:px-12 py-14 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#A3A3A3]">
            Ready For Takeoff
          </p>
          <h2 className="text-3xl sm:text-4xl font-semibold mt-2 tracking-[-0.025em]">
            Your next chapter starts here.
          </h2>
          <p className="text-sm sm:text-base text-[#A3A3A3] mt-3 max-w-xl mx-auto leading-relaxed">
            Join verified institutions, ambitious students, and forward-thinking organizations
            building meaningful internship journeys on Udaan.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/register?role=student"
              className="px-6 py-3 rounded-[10px] bg-[#FFFFFF] text-[#090909] text-sm font-semibold hover:bg-[#E5E5E5] transition-colors"
            >
              Build Student Career Passport
            </Link>
            <Link
              to="/register?role=company"
              className="px-6 py-3 rounded-[10px] border border-[#303030] bg-[#171717] text-[#FFFFFF] text-sm font-medium hover:bg-[#202020] transition-colors"
            >
              Partner as Recruiter
            </Link>
          </div>
        </div>
      </section>

      {/* ==================== SECTION I: PREMIUM FOOTER ==================== */}
      <footer className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-t border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
            <div className="md:col-span-4 space-y-4">
              <BrandLogo size="md" showTagline />
              <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-xs">
                Udaan is a unified career and internship management platform connecting students,
                recruiters, and educational institutions through one intelligent digital ecosystem.
              </p>
            </div>

            <div className="md:col-span-2 space-y-2.5 text-xs">
              <p className="font-semibold text-[var(--text-primary)] uppercase tracking-wider text-[11px]">
                Platform
              </p>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#ecosystem"
                    className="hover:text-[var(--text-primary)] transition-colors"
                  >
                    About Udaan
                  </a>
                </li>
                <li>
                  <Link
                    to="/explore"
                    className="hover:text-[var(--text-primary)] transition-colors"
                  >
                    Explore Opportunities
                  </Link>
                </li>
                <li>
                  <Link
                    to="/student/passport"
                    className="hover:text-[var(--text-primary)] transition-colors"
                  >
                    Career Passport
                  </Link>
                </li>
                <li>
                  <a
                    href="#ecosystem"
                    className="hover:text-[var(--text-primary)] transition-colors"
                  >
                    Trust & Verification
                  </a>
                </li>
              </ul>
            </div>

            <div className="md:col-span-3 space-y-2.5 text-xs">
              <p className="font-semibold text-[var(--text-primary)] uppercase tracking-wider text-[11px]">
                Ecosystem
              </p>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#for-everyone"
                    className="hover:text-[var(--text-primary)] transition-colors"
                  >
                    For Students
                  </a>
                </li>
                <li>
                  <a
                    href="#for-everyone"
                    className="hover:text-[var(--text-primary)] transition-colors"
                  >
                    For Companies & Recruiters
                  </a>
                </li>
                <li>
                  <a
                    href="#for-everyone"
                    className="hover:text-[var(--text-primary)] transition-colors"
                  >
                    For Universities & Placement Cells
                  </a>
                </li>
              </ul>
            </div>

            <div className="md:col-span-3 space-y-2.5 text-xs">
              <p className="font-semibold text-[var(--text-primary)] uppercase tracking-wider text-[11px]">
                Account & Governance
              </p>
              <ul className="space-y-2">
                <li>
                  <Link to="/login" className="hover:text-[var(--text-primary)] transition-colors">
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link
                    to="/register"
                    className="hover:text-[var(--text-primary)] transition-colors"
                  >
                    Create Account
                  </Link>
                </li>
                <li>
                  <span className="text-[var(--text-muted)]">Privacy & Institutional Terms</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-[var(--border-color)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
            <p>© {new Date().getFullYear()} Udaan Career Ecosystem. All rights reserved.</p>
            <p>Where ambition takes flight.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
