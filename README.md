# Udaan — Where Ambition Takes Flight 🚀

<p align="center">
  <strong>A Unified Career & Internship Management Ecosystem</strong>
  <br />
  Connecting Students, Recruiters, and Universities through one intelligent, verified platform.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Firebase-Backend-FFCA28?logo=firebase&logoColor=black" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-Build_Tool-646CFF?logo=vite&logoColor=white" />
</p>

---

## 🌐 Overview

**Udaan** is a unified career and internship management platform designed to bridge the gap between students, companies, and educational institutions.

Traditional placement processes are often fragmented across spreadsheets, emails, forms, and disconnected platforms. Udaan brings the entire career and internship lifecycle into one centralized digital ecosystem.

From discovering opportunities and building professional portfolios to recruiting candidates, managing applications, and monitoring institutional placement performance, Udaan provides dedicated workspaces for every stakeholder.

### Built for three interconnected ecosystems

| Students | Companies & Recruiters | Universities |
|---|---|---|
| Discover opportunities | Publish internships | Verify organizations |
| Build Career Passports | Manage applicants | Approve opportunities |
| Apply and track progress | Schedule interviews | Monitor placements |
| Track internship milestones | Evaluate interns | Generate analytics |

---

## ✨ Key Features

### 1. Cinematic Public Experience

An immersive landing experience that introduces the Udaan ecosystem.

- Full-screen ambient HTML5 video background.
- Interactive Three.js 3D connection network.
- Visual representation of Students → Universities → Companies → Opportunities.
- Automatic SVG fallback for mobile devices.
- Accessibility support through `prefers-reduced-motion`.
- Real-time opportunity board displaying approved internships.
- Live platform impact statistics powered by Firestore.

### 2. 🎓 Student Career Workspace

A centralized workspace to manage the complete student career journey.

**Digital Career Passport**

A professional, shareable digital portfolio available through:

- Private editor: `/student/passport`
- Public profile: `/passport/:slug`

Students can showcase:

- Professional headline and introduction.
- Categorized technical and interpersonal skills.
- Projects with roles, technology stacks, and GitHub/live links.
- Professional experience and achievements.
- Educational qualifications.
- Certifications and credentials.
- Connected professional accounts.

**Privacy-first public profiles**

Public Career Passports exclude private email addresses, phone numbers, and personal resumes. Privacy restrictions are enforced through both application logic and Firestore security rules.

**Additional capabilities**

- One-click PDF Career Passport export using jsPDF.
- Live GitHub profile synchronization.
- Top six public GitHub repositories.
- LinkedIn, Portfolio, LeetCode, HackerRank, CodeChef, and GeeksforGeeks connections.
- Five-factor Career Readiness checklist.
- Personalized opportunity discovery.
- Save and revisit internship opportunities.
- Resume and cover letter submissions.
- Real-time application tracking.
- Interview management and notifications.
- Weekly internship progress and milestone tracking.

### 3. 🏢 Recruiter & Company Portal

A dedicated recruitment workspace for organizations.

**Company Management**
- Organization profile management.
- Official website and social account connections.
- LinkedIn, GitHub Organization, X/Twitter, and Instagram.

**Internship Management**
- Create and publish internship opportunities.
- Save and manage drafts.
- Submit postings for institutional approval.
- Edit pending opportunities.
- Close filled positions.

**Applicant Management**
- Dense applicant table and visual pipeline board.
- Candidate inspection through Career Passports.
- Resume downloads.
- Application-stage management.
- Interview scheduling.
- Intern progress monitoring.
- Structured candidate evaluations.

### 4. 🏛️ University & Placement Cell Administration

A centralized institutional dashboard for placement governance and analytics.

**Verification & Governance**
- Verify or suspend companies.
- Approve or reject internship postings.
- Maintain auditable administrative notes.
- Configure institutional verification policies.

**Institutional Settings**
- Application limits.
- Company verification policies.
- Official website and LinkedIn.
- Institutional email and contact information.

**Analytics & Reporting**
- Student and company statistics.
- Internship posting analytics.
- Application and selection tracking.
- Internship completion monitoring.
- Filterable institutional reports.
- CSV and PDF exports.
- Print-ready reporting.

**Demonstration Environment**

An idempotent demo data seeder populates a realistic institutional environment:

| Entity | Demo Records |
|---|---:|
| Students with public Career Passports | 12 |
| Companies | 6 |
| Internship opportunities | 12 |
| Applications | 20 |
| Interviews | Included |
| Progress milestones | Included |
| Structured evaluations | Included |

Demo records are identified using `isDemo: true`.

---

## 🛠️ Technology Stack

| Category | Technologies |
|---|---|
| Frontend | React 19, TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS v4 |
| Routing | React Router |
| 3D Graphics | Three.js |
| Authentication | Firebase Authentication |
| Database | Cloud Firestore |
| File Storage | Firebase Storage |
| Charts & Analytics | Recharts |
| PDF Generation | jsPDF |
| Validation | Zod |
| Notifications | Sonner |
| Icons | Lucide React |

### Architecture Highlights

- Role-based access control for Students, Recruiters, and University Administrators.
- Firebase Authentication with Google Sign-In and Email/Password.
- Real-time application data synchronization through Cloud Firestore.
- Strict Firestore security rules for data access and privacy.
- Validated external profile connections.
- Graceful GitHub API rate-limit handling.
- Firebase Storage with compact PDF fallback.
- Structured data validation using Zod.

---

## 🚀 Getting Started

Follow these instructions to run Udaan locally.

### Prerequisites

- Node.js (LTS recommended)
- npm
- A Firebase project
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/KKU022/Udaan.git
cd Udaan
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Firebase

Create a Firebase project through the [Firebase Console](https://console.firebase.google.com/).

Enable:

- Firebase Authentication
  - Google Sign-In
  - Email/Password
- Cloud Firestore
- Firebase Storage

Configure the Firebase environment variables using the names expected by the application's Firebase initialization module.

Add your local configuration to a `.env` file in the project root.

> Never commit private credentials, service account keys, or sensitive environment files to GitHub.

### 4. Start the Development Server

```bash
npm run dev
```

Open the local URL displayed in your terminal.

---

## 📦 Production Build

Build the application:

```bash
npm run build
```

Run lint checks:

```bash
npm run lint
```

---

## 🔐 Security & Privacy

Security and user privacy are fundamental parts of Udaan.

- Firebase Authentication for identity management.
- Role-based Firestore access restrictions.
- Protected application workflows.
- Public Career Passports expose only approved public information.
- Private contact details and resumes are excluded from public profiles.
- Sensitive configuration is maintained outside version control.

---

## 📸 Screenshots & Demo

Visual previews of Udaan's ecosystem will be added here.

Recommended showcase:

- Public landing page and interactive hero.
- Student dashboard.
- Digital Career Passport.
- Internship discovery and application tracking.
- Recruiter applicant pipeline.
- University placement analytics.

---

## 🗺️ Project Vision

Udaan aims to make career development and internship management more transparent, connected, and accessible.

By bringing students, recruiters, and placement cells together, the platform creates a structured environment where opportunities can be discovered, applications can be managed, and career progress can be measured.

**One ecosystem. Three stakeholders. Countless opportunities.**

---

## 👨‍💻 Development & Contributions

Contributions, suggestions, and feedback are welcome.

If you would like to contribute:

1. Fork the repository.
2. Create a feature branch.
3. Implement your changes.
4. Test your implementation.
5. Submit a Pull Request.

---

<p align="center">
  <strong>Udaan — Where Ambition Takes Flight.</strong>
  <br />
  <sub>Built to connect talent with opportunity.</sub>
</p># Udaan — Where Ambition Takes Flight 🚀

<p align="center">
  <strong>A Unified Career & Internship Management Ecosystem</strong>
  <br />
  Connecting Students, Recruiters, and Universities through one intelligent, verified platform.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Firebase-Backend-FFCA28?logo=firebase&logoColor=black" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-Build_Tool-646CFF?logo=vite&logoColor=white" />
</p>

---

## 🌐 Overview

**Udaan** is a unified career and internship management platform designed to bridge the gap between students, companies, and educational institutions.

Traditional placement processes are often fragmented across spreadsheets, emails, forms, and disconnected platforms. Udaan brings the entire career and internship lifecycle into one centralized digital ecosystem.

From discovering opportunities and building professional portfolios to recruiting candidates, managing applications, and monitoring institutional placement performance, Udaan provides dedicated workspaces for every stakeholder.

### Built for three interconnected ecosystems

| Students | Companies & Recruiters | Universities |
|---|---|---|
| Discover opportunities | Publish internships | Verify organizations |
| Build Career Passports | Manage applicants | Approve opportunities |
| Apply and track progress | Schedule interviews | Monitor placements |
| Track internship milestones | Evaluate interns | Generate analytics |

---

## ✨ Key Features

### 1. Cinematic Public Experience

An immersive landing experience that introduces the Udaan ecosystem.

- Full-screen ambient HTML5 video background.
- Interactive Three.js 3D connection network.
- Visual representation of Students → Universities → Companies → Opportunities.
- Automatic SVG fallback for mobile devices.
- Accessibility support through `prefers-reduced-motion`.
- Real-time opportunity board displaying approved internships.
- Live platform impact statistics powered by Firestore.

### 2. 🎓 Student Career Workspace

A centralized workspace to manage the complete student career journey.

**Digital Career Passport**

A professional, shareable digital portfolio available through:

- Private editor: `/student/passport`
- Public profile: `/passport/:slug`

Students can showcase:

- Professional headline and introduction.
- Categorized technical and interpersonal skills.
- Projects with roles, technology stacks, and GitHub/live links.
- Professional experience and achievements.
- Educational qualifications.
- Certifications and credentials.
- Connected professional accounts.

**Privacy-first public profiles**

Public Career Passports exclude private email addresses, phone numbers, and personal resumes. Privacy restrictions are enforced through both application logic and Firestore security rules.

**Additional capabilities**

- One-click PDF Career Passport export using jsPDF.
- Live GitHub profile synchronization.
- Top six public GitHub repositories.
- LinkedIn, Portfolio, LeetCode, HackerRank, CodeChef, and GeeksforGeeks connections.
- Five-factor Career Readiness checklist.
- Personalized opportunity discovery.
- Save and revisit internship opportunities.
- Resume and cover letter submissions.
- Real-time application tracking.
- Interview management and notifications.
- Weekly internship progress and milestone tracking.

### 3. 🏢 Recruiter & Company Portal

A dedicated recruitment workspace for organizations.

**Company Management**
- Organization profile management.
- Official website and social account connections.
- LinkedIn, GitHub Organization, X/Twitter, and Instagram.

**Internship Management**
- Create and publish internship opportunities.
- Save and manage drafts.
- Submit postings for institutional approval.
- Edit pending opportunities.
- Close filled positions.

**Applicant Management**
- Dense applicant table and visual pipeline board.
- Candidate inspection through Career Passports.
- Resume downloads.
- Application-stage management.
- Interview scheduling.
- Intern progress monitoring.
- Structured candidate evaluations.

### 4. 🏛️ University & Placement Cell Administration

A centralized institutional dashboard for placement governance and analytics.

**Verification & Governance**
- Verify or suspend companies.
- Approve or reject internship postings.
- Maintain auditable administrative notes.
- Configure institutional verification policies.

**Institutional Settings**
- Application limits.
- Company verification policies.
- Official website and LinkedIn.
- Institutional email and contact information.

**Analytics & Reporting**
- Student and company statistics.
- Internship posting analytics.
- Application and selection tracking.
- Internship completion monitoring.
- Filterable institutional reports.
- CSV and PDF exports.
- Print-ready reporting.

**Demonstration Environment**

An idempotent demo data seeder populates a realistic institutional environment:

| Entity | Demo Records |
|---|---:|
| Students with public Career Passports | 12 |
| Companies | 6 |
| Internship opportunities | 12 |
| Applications | 20 |
| Interviews | Included |
| Progress milestones | Included |
| Structured evaluations | Included |

Demo records are identified using `isDemo: true`.

---

## 🛠️ Technology Stack

| Category | Technologies |
|---|---|
| Frontend | React 19, TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS v4 |
| Routing | React Router |
| 3D Graphics | Three.js |
| Authentication | Firebase Authentication |
| Database | Cloud Firestore |
| File Storage | Firebase Storage |
| Charts & Analytics | Recharts |
| PDF Generation | jsPDF |
| Validation | Zod |
| Notifications | Sonner |
| Icons | Lucide React |

### Architecture Highlights

- Role-based access control for Students, Recruiters, and University Administrators.
- Firebase Authentication with Google Sign-In and Email/Password.
- Real-time application data synchronization through Cloud Firestore.
- Strict Firestore security rules for data access and privacy.
- Validated external profile connections.
- Graceful GitHub API rate-limit handling.
- Firebase Storage with compact PDF fallback.
- Structured data validation using Zod.

---

## 🚀 Getting Started

Follow these instructions to run Udaan locally.

### Prerequisites

- Node.js (LTS recommended)
- npm
- A Firebase project
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/KKU022/Udaan.git
cd Udaan
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Firebase

Create a Firebase project through the [Firebase Console](https://console.firebase.google.com/).

Enable:

- Firebase Authentication
  - Google Sign-In
  - Email/Password
- Cloud Firestore
- Firebase Storage

Configure the Firebase environment variables using the names expected by the application's Firebase initialization module.

Add your local configuration to a `.env` file in the project root.

> Never commit private credentials, service account keys, or sensitive environment files to GitHub.

### 4. Start the Development Server

```bash
npm run dev
```

Open the local URL displayed in your terminal.

---

## 📦 Production Build

Build the application:

```bash
npm run build
```

Run lint checks:

```bash
npm run lint
```

---

## 🔐 Security & Privacy

Security and user privacy are fundamental parts of Udaan.

- Firebase Authentication for identity management.
- Role-based Firestore access restrictions.
- Protected application workflows.
- Public Career Passports expose only approved public information.
- Private contact details and resumes are excluded from public profiles.
- Sensitive configuration is maintained outside version control.

---

## 📸 Screenshots & Demo

Visual previews of Udaan's ecosystem will be added here.

Recommended showcase:

- Public landing page and interactive hero.
- Student dashboard.
- Digital Career Passport.
- Internship discovery and application tracking.
- Recruiter applicant pipeline.
- University placement analytics.

---

## 🗺️ Project Vision

Udaan aims to make career development and internship management more transparent, connected, and accessible.

By bringing students, recruiters, and placement cells together, the platform creates a structured environment where opportunities can be discovered, applications can be managed, and career progress can be measured.

**One ecosystem. Three stakeholders. Countless opportunities.**

---

## 👨‍💻 Development & Contributions

Contributions, suggestions, and feedback are welcome.

If you would like to contribute:

1. Fork the repository.
2. Create a feature branch.
3. Implement your changes.
4. Test your implementation.
5. Submit a Pull Request.

---

<p align="center">
  <strong>Udaan — Where Ambition Takes Flight.</strong>
  <br />
  <sub>Built to connect talent with opportunity.</sub>
</p>
