# Udaan — Where Ambition Takes Flight

**Udaan** is a unified career and internship management platform connecting **Students**, **Companies / Recruiters**, and **Educational Institutions (Training & Placement Cells)** through one verified, real-time digital ecosystem powered by React, TypeScript, Tailwind CSS, Three.js, and Firebase (Authentication + Cloud Firestore).

---

## Core Capabilities

### 1. Cinematic Public Ecosystem
- **Full-Screen Hero** featuring an ambient HTML5 video canvas backdrop with play/pause controls and an interactive **Three.js 3D Connection Network** (`Students → Universities → Companies → Opportunities`) with automatic SVG fallback for mobile and `prefers-reduced-motion`.
- **Live Opportunity Board** backed directly by admin-approved Firestore postings.
- **Live Career Impact Statistics** synchronized with Cloud Firestore (`platformStats/summary`).

### 2. Student Career Workspace & Digital Career Passport
- **Career Passport (`/student/passport` & public `/passport/:slug`)**:
  - Editorial portfolio view + structured editor covering identity headline, categorized skills (Languages, Frameworks, Tools, Soft Skills), project showcase (role, stack, GitHub/live URLs), experience, achievements, education, and certificates.
  - **Privacy-First Public Sharing**: Public `/passport/:slug` links strictly omit private email addresses, phone numbers, and private resumes, enforced in both UI and `firestore.rules`.
  - **One-Click PDF Export**: Generate a clean formatted PDF Career Passport via `jsPDF`.
- **Connected Accounts with Live GitHub API Sync**:
  - Validated connections for GitHub (live public GitHub API profile + top 6 repositories with graceful 403 rate-limit handling), LinkedIn, Portfolio, Personal Website, LeetCode, HackerRank, CodeChef, and GeeksforGeeks.
- **Career Readiness & Opportunity Discovery**:
  - 5-factor Career Readiness checklist and interactive Opportunity Discovery tabs (`Recommended`, `Recently Added`, `Closing Soon`, `Saved`).
- **Complete Workflow**: Apply with resume & cover letter, track application stages in real time, manage interviews, log weekly internship milestones, and receive live notifications.

### 3. Recruiter / Company Portal
- **Company Profile & Connected Accounts**: Manage organization profile, official website, LinkedIn, GitHub Organization, X/Twitter, and Instagram.
- **Internship Posting & Approval Lifecycle**: Save drafts, submit opportunities for institutional approval, edit pending postings, and close filled openings.
- **Applicant Management & Pipeline**: Switch between dense table and pipeline board views, inspect candidate **Career Passports** directly from the applicant drawer, download resumes, update candidate stages, schedule interviews, track intern progress, and record structured evaluations.

### 4. University Administration & Placement Cell Portal
- **Governance Queues**: Verify or suspend companies and approve or reject internship postings with auditable notes.
- **Institutional Settings**: Configure application limits, verification policies, and official institution website, LinkedIn, email, and phone contacts.
- **Real-Time Analytics & Exports**: Filterable placement reports across students, companies, postings, applications, selections, and completions with CSV, PDF, and Print export.
- **One-Click Demonstration Seeder**: Populate an idempotent demo dataset (`isDemo: true`) including 12 students with public Career Passports, 6 companies, 12 internships, 20 applications, interviews, progress milestones, and evaluations.

---

## Tech Stack
- **Frontend**: React 19, TypeScript, Vite, React Router, Tailwind CSS v4, Lucide Icons, Recharts, Three.js, jsPDF, Zod, Sonner
- **Backend / Data**: Firebase Authentication (Google Sign-In + Email/Password), Cloud Firestore with strict role-based `firestore.rules`, Firebase Storage (with compact PDF fallback)

## Local Development
```bash
npm install
npm run dev
```

## Production Build & Lint
```bash
npm run build
npm run lint
```
