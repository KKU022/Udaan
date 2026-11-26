import { doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import type { ApplicationStatus, WorkMode } from '../types';
import { recomputePlatformStats } from './adminService';

const DEMO_STUDENTS = [
  { id: 'demo_stu_01', name: 'Aarav Kulkarni', email: 'aarav.kulkarni@demo.udaan.edu', college: 'Medicaps University, Indore', degree: 'B.Tech', branch: 'Computer Science', semester: 6, gradYear: 2027, cgpa: 8.9, skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Docker'] },
  { id: 'demo_stu_02', name: 'Meera Deshmukh', email: 'meera.deshmukh@demo.udaan.edu', college: 'Medicaps University, Indore', degree: 'B.Tech', branch: 'Information Technology', semester: 6, gradYear: 2027, cgpa: 9.2, skills: ['Python', 'PyTorch', 'SQL', 'FastAPI', 'Data Analysis'] },
  { id: 'demo_stu_03', name: 'Rohan Malhotra', email: 'rohan.malhotra@demo.udaan.edu', college: 'SGSITS Indore', degree: 'B.Tech', branch: 'Electronics & Comm.', semester: 7, gradYear: 2026, cgpa: 8.4, skills: ['C++', 'Embedded C', 'RTOS', 'Verilog', 'Linux'] },
  { id: 'demo_stu_04', name: 'Ananya Sharma', email: 'ananya.sharma@demo.udaan.edu', college: 'Medicaps University, Indore', degree: 'B.Tech', branch: 'Computer Science', semester: 5, gradYear: 2027, cgpa: 8.7, skills: ['Figma', 'React', 'Tailwind CSS', 'User Research', 'Prototyping'] },
  { id: 'demo_stu_05', name: 'Kabir Verma', email: 'kabir.verma@demo.udaan.edu', college: 'IIIT Bhopal', degree: 'B.Tech', branch: 'Computer Science', semester: 6, gradYear: 2027, cgpa: 9.1, skills: ['Go', 'Kubernetes', 'AWS', 'Terraform', 'Linux'] },
  { id: 'demo_stu_06', name: 'Diya Nair', email: 'diya.nair@demo.udaan.edu', college: 'Medicaps University, Indore', degree: 'MCA', branch: 'Computer Applications', semester: 3, gradYear: 2027, cgpa: 8.6, skills: ['Java', 'Spring Boot', 'MySQL', 'REST APIs', 'Git'] },
  { id: 'demo_stu_07', name: 'Siddharth Joshi', email: 'siddharth.joshi@demo.udaan.edu', college: 'DAVV IET Indore', degree: 'B.E.', branch: 'Computer Engineering', semester: 7, gradYear: 2026, cgpa: 8.2, skills: ['React Native', 'TypeScript', 'Firebase', 'GraphQL'] },
  { id: 'demo_stu_08', name: 'Ishita Tiwari', email: 'ishita.tiwari@demo.udaan.edu', college: 'Medicaps University, Indore', degree: 'B.Tech', branch: 'Data Science', semester: 6, gradYear: 2027, cgpa: 9.0, skills: ['Python', 'Pandas', 'Tableau', 'SQL', 'Scikit-Learn'] },
  { id: 'demo_stu_09', name: 'Vikramaditya Rao', email: 'vikram.rao@demo.udaan.edu', college: 'MANIT Bhopal', degree: 'B.Tech', branch: 'Mechanical Engineering', semester: 7, gradYear: 2026, cgpa: 8.1, skills: ['SolidWorks', 'MATLAB', 'ANSYS', 'CAD', 'Python'] },
  { id: 'demo_stu_10', name: 'Neha Choudhary', email: 'neha.choudhary@demo.udaan.edu', college: 'Medicaps University, Indore', degree: 'B.Tech', branch: 'Cyber Security', semester: 6, gradYear: 2027, cgpa: 8.8, skills: ['Network Security', 'Burp Suite', 'Python', 'Linux', 'SIEM'] },
  { id: 'demo_stu_11', name: 'Pranav Agarwal', email: 'pranav.agarwal@demo.udaan.edu', college: 'SGSITS Indore', degree: 'B.Tech', branch: 'Computer Science', semester: 5, gradYear: 2027, cgpa: 7.9, skills: ['JavaScript', 'React', 'MongoDB', 'Express'] },
  { id: 'demo_stu_12', name: 'Tanvi Saxena', email: 'tanvi.saxena@demo.udaan.edu', college: 'Medicaps University, Indore', degree: 'MBA Tech', branch: 'Product & Analytics', semester: 6, gradYear: 2027, cgpa: 8.5, skills: ['SQL', 'Product Strategy', 'Excel', 'Mixpanel', 'Wireframing'] },
];

const DEMO_COMPANIES = [
  { id: 'demo_comp_01', name: 'Northstar Systems (Demo)', email: 'campus@northstar.demo', contact: 'Raghavendra Menon', industry: 'Enterprise Cloud SaaS', size: '201-500 employees', hq: 'Bengaluru, India', website: 'https://northstar.example.com', desc: 'Builds distributed workflow infrastructure and observability tools for global engineering teams.', status: 'verified' as const, logo: 'NS' },
  { id: 'demo_comp_02', name: 'Meridian FinTech Labs (Demo)', email: 'talent@meridianfintech.demo', contact: 'Shruti Banerjee', industry: 'Financial Technology', size: '101-200 employees', hq: 'Mumbai, India', website: 'https://meridian.example.com', desc: 'Real-time treasury reconciliation, payment rails, and risk intelligence platforms.', status: 'verified' as const, logo: 'MF' },
  { id: 'demo_comp_03', name: 'Aether Robotics & Silicon (Demo)', email: 'internships@aetherrobotics.demo', contact: 'Dr. Arvind Pillai', industry: 'Robotics & Embedded Systems', size: '51-200 employees', hq: 'Pune, India', website: 'https://aether.example.com', desc: 'Autonomous warehouse robotics, low-latency embedded firmware, and edge vision systems.', status: 'verified' as const, logo: 'AR' },
  { id: 'demo_comp_04', name: 'Kestrel Design Studio (Demo)', email: 'careers@kestreldesign.demo', contact: 'Nandini Kapoor', industry: 'Product Design & Research', size: '11-50 employees', hq: 'Remote / Gurugram', website: 'https://kestrel.example.com', desc: 'Human-centered design consultancy partnering with B2B SaaS and digital health organizations.', status: 'verified' as const, logo: 'KD' },
  { id: 'demo_comp_05', name: 'Vanguard Cyber Defense (Demo)', email: 'hiring@vanguardcyber.demo', contact: 'Col. Deepak Sinha', industry: 'Cybersecurity', size: '51-200 employees', hq: 'Hyderabad, India', website: 'https://vanguard.example.com', desc: 'Application security auditing, cloud posture management, and incident response engineering.', status: 'verified' as const, logo: 'VC' },
  { id: 'demo_comp_06', name: 'Solstice CleanGrid Tech (Demo)', email: 'hr@solsticegrid.demo', contact: 'Maya Krishnan', industry: 'Energy Analytics & IoT', size: '11-50 employees', hq: 'Indore, India', website: 'https://solstice.example.com', desc: 'Smart microgrid telemetry and solar forecasting software for industrial campuses.', status: 'pending' as const, logo: 'SC' },
];

const DEMO_INTERNSHIPS: Array<{
  id: string;
  companyIdx: number;
  title: string;
  category: string;
  duration: string;
  isPaid: boolean;
  stipend: number;
  location: string;
  workMode: WorkMode;
  openings: number;
  deadline: string;
  startDate: string;
  minCgpa: number;
  skills: string[];
  status: 'published' | 'pending_approval';
  approvalStatus: 'approved' | 'pending';
  desc: string;
  resp: string;
}> = [
  { id: 'demo_int_01', companyIdx: 0, title: 'Frontend Software Engineering Intern', category: 'Software Engineering', duration: '6 Months', isPaid: true, stipend: 35000, location: 'Bengaluru', workMode: 'Hybrid', openings: 4, deadline: '2027-02-28', startDate: '2027-03-15', minCgpa: 7.5, skills: ['TypeScript', 'React', 'Tailwind CSS', 'REST APIs'], status: 'published', approvalStatus: 'approved', desc: 'Join the core web platform team at Northstar Systems to design modular React workflows, high-density operational tables, and accessible UI architecture.', resp: 'Build reusable TypeScript components, write integration tests, and collaborate with product designers in weekly sprints.' },
  { id: 'demo_int_02', companyIdx: 0, title: 'Cloud Infrastructure & DevOps Intern', category: 'Cloud & DevOps', duration: '6 Months', isPaid: true, stipend: 38000, location: 'Bengaluru', workMode: 'Remote', openings: 2, deadline: '2027-03-10', startDate: '2027-04-01', minCgpa: 8.0, skills: ['Go', 'Docker', 'Kubernetes', 'AWS', 'Linux'], status: 'published', approvalStatus: 'approved', desc: 'Automate multi-region deployment pipelines, container telemetry, and reliability benchmarks for enterprise workloads.', resp: 'Maintain Terraform modules, improve CI/CD build speed, and participate in blameless post-incident reviews.' },
  { id: 'demo_int_03', companyIdx: 1, title: 'Backend Engineering Intern (Payments)', category: 'Software Engineering', duration: '6 Months', isPaid: true, stipend: 40000, location: 'Mumbai', workMode: 'Hybrid', openings: 3, deadline: '2027-02-20', startDate: '2027-03-10', minCgpa: 8.0, skills: ['Java', 'Spring Boot', 'PostgreSQL', 'Node.js'], status: 'published', approvalStatus: 'approved', desc: 'Build idempotent ledger APIs and real-time settlement services handling thousands of transactions per minute.', resp: 'Implement schema migrations, write unit/load tests, and document OpenAPI specifications.' },
  { id: 'demo_int_04', companyIdx: 1, title: 'Data Science & Risk Modeling Intern', category: 'Data & AI', duration: '4 Months', isPaid: true, stipend: 32000, location: 'Mumbai', workMode: 'Remote', openings: 2, deadline: '2027-03-05', startDate: '2027-03-25', minCgpa: 8.2, skills: ['Python', 'SQL', 'PyTorch', 'Pandas', 'Scikit-Learn'], status: 'published', approvalStatus: 'approved', desc: 'Develop anomaly detection pipelines and interpretable fraud scoring features on anonymized payment streams.', resp: 'Clean historical datasets, benchmark gradient-boosted models, and present evaluation reports to risk leads.' },
  { id: 'demo_int_05', companyIdx: 2, title: 'Embedded Firmware Engineering Intern', category: 'Hardware & Embedded', duration: '6 Months', isPaid: true, stipend: 28000, location: 'Pune', workMode: 'On-site', openings: 3, deadline: '2027-03-15', startDate: '2027-04-05', minCgpa: 7.5, skills: ['C++', 'Embedded C', 'RTOS', 'Linux'], status: 'published', approvalStatus: 'approved', desc: 'Work directly with autonomous mobile robots, writing deterministic motor-control firmware and CAN-bus telemetry drivers.', resp: 'Debug hardware-in-the-loop setups, profile memory consumption, and maintain board support packages.' },
  { id: 'demo_int_06', companyIdx: 2, title: 'Mechanical CAD & Thermal Simulation Intern', category: 'Core Engineering', duration: '4 Months', isPaid: true, stipend: 22000, location: 'Pune', workMode: 'On-site', openings: 2, deadline: '2027-03-01', startDate: '2027-03-20', minCgpa: 7.2, skills: ['SolidWorks', 'ANSYS', 'CAD', 'MATLAB'], status: 'published', approvalStatus: 'approved', desc: 'Model structural enclosures and thermal dissipation assemblies for next-generation industrial robotics.', resp: 'Run FEA stress studies, prepare tolerance drawings, and coordinate with prototype fabricators.' },
  { id: 'demo_int_07', companyIdx: 3, title: 'Product Design (UI/UX) Intern', category: 'Design', duration: '3 Months', isPaid: true, stipend: 25000, location: 'Gurugram', workMode: 'Remote', openings: 2, deadline: '2027-02-25', startDate: '2027-03-12', minCgpa: 7.0, skills: ['Figma', 'User Research', 'Prototyping', 'Wireframing'], status: 'published', approvalStatus: 'approved', desc: 'Craft clean enterprise workflows, conduct usability sessions, and maintain component tokens across B2B web products.', resp: 'Translate requirements into interactive Figma prototypes and partner closely with frontend engineers.' },
  { id: 'demo_int_08', companyIdx: 4, title: 'Application Security Analyst Intern', category: 'Cybersecurity', duration: '6 Months', isPaid: true, stipend: 30000, location: 'Hyderabad', workMode: 'Hybrid', openings: 2, deadline: '2027-03-20', startDate: '2027-04-10', minCgpa: 7.8, skills: ['Network Security', 'Burp Suite', 'Python', 'Linux'], status: 'published', approvalStatus: 'approved', desc: 'Assist senior security engineers with web penetration assessments, secure code reviews, and automated SAST rules.', resp: 'Validate vulnerability findings, write reproducible PoCs, and document remediation checklists.' },
  { id: 'demo_int_09', companyIdx: 0, title: 'Product Analytics & Growth Intern', category: 'Product & Business', duration: '4 Months', isPaid: true, stipend: 24000, location: 'Bengaluru', workMode: 'Remote', openings: 2, deadline: '2027-03-12', startDate: '2027-04-01', minCgpa: 7.5, skills: ['SQL', 'Product Strategy', 'Mixpanel', 'Tableau'], status: 'published', approvalStatus: 'approved', desc: 'Measure onboarding conversion funnels and cohort retention across enterprise customer workspaces.', resp: 'Build self-serve SQL dashboards and co-author experiment readouts with product managers.' },
  { id: 'demo_int_10', companyIdx: 1, title: 'Mobile App Engineering Intern (React Native)', category: 'Software Engineering', duration: '5 Months', isPaid: true, stipend: 30000, location: 'Mumbai', workMode: 'Hybrid', openings: 2, deadline: '2027-03-18', startDate: '2027-04-05', minCgpa: 7.5, skills: ['React Native', 'TypeScript', 'Firebase', 'GraphQL'], status: 'published', approvalStatus: 'approved', desc: 'Build biometric sign-in flows and real-time spend notifications for our merchant mobile application.', resp: 'Optimize frame rates, integrate push alerts, and test across Android and iOS viewports.' },
  { id: 'demo_int_11', companyIdx: 4, title: 'SOC Automation & Threat Intel Intern', category: 'Cybersecurity', duration: '6 Months', isPaid: true, stipend: 27000, location: 'Hyderabad', workMode: 'Remote', openings: 2, deadline: '2027-04-01', startDate: '2027-04-20', minCgpa: 7.5, skills: ['SIEM', 'Python', 'Linux', 'Network Security'], status: 'pending_approval', approvalStatus: 'pending', desc: 'Write automated alert triage playbooks and enrich threat intelligence feeds for managed security clients.', resp: 'Develop Python connectors and tune correlation rules to reduce false-positive alert fatigue.' },
  { id: 'demo_int_12', companyIdx: 3, title: 'Design Systems Engineering Intern', category: 'Design', duration: '4 Months', isPaid: false, stipend: 0, location: 'Remote', workMode: 'Remote', openings: 1, deadline: '2027-03-30', startDate: '2027-04-15', minCgpa: 7.0, skills: ['React', 'Tailwind CSS', 'Figma', 'TypeScript'], status: 'pending_approval', approvalStatus: 'pending', desc: 'Bridge design tokens and accessible React primitives for open-source academic research platforms.', resp: 'Audit WCAG AA contrast ratios and document interactive component specifications.' },
];

const DEMO_APPLICATIONS: Array<{
  studentIdx: number;
  internshipIdx: number;
  status: ApplicationStatus;
  note: string;
}> = [
  { studentIdx: 0, internshipIdx: 0, status: 'Selected', note: 'Strong TypeScript architecture and clean code assessment.' },
  { studentIdx: 1, internshipIdx: 3, status: 'Selected', note: 'Excellent model evaluation methodology and SQL speed.' },
  { studentIdx: 2, internshipIdx: 4, status: 'Selected', note: 'Deep hands-on RTOS debugging experience.' },
  { studentIdx: 3, internshipIdx: 6, status: 'Selected', note: 'Thoughtful portfolio case studies and structured UX critique.' },
  { studentIdx: 4, internshipIdx: 1, status: 'Interview Scheduled', note: 'Final systems design interview scheduled.' },
  { studentIdx: 5, internshipIdx: 2, status: 'Interview Scheduled', note: 'Technical round with Payments backend lead.' },
  { studentIdx: 6, internshipIdx: 9, status: 'Interview Scheduled', note: 'Live React Native architecture walkthrough.' },
  { studentIdx: 7, internshipIdx: 3, status: 'Interview Scheduled', note: 'Data modeling case study interview.' },
  { studentIdx: 9, internshipIdx: 7, status: 'Interview Scheduled', note: 'Security assessment review with AppSec team.' },
  { studentIdx: 0, internshipIdx: 2, status: 'Shortlisted', note: 'Shortlisted based on backend Node/Postgres projects.' },
  { studentIdx: 1, internshipIdx: 8, status: 'Shortlisted', note: 'Strong analytical background.' },
  { studentIdx: 4, internshipIdx: 0, status: 'Shortlisted', note: 'Clean systems thinking and TypeScript familiarity.' },
  { studentIdx: 7, internshipIdx: 8, status: 'Shortlisted', note: 'Relevant BI and SQL dashboarding portfolio.' },
  { studentIdx: 8, internshipIdx: 5, status: 'Under Review', note: 'Reviewing CAD portfolio assemblies.' },
  { studentIdx: 10, internshipIdx: 0, status: 'Under Review', note: 'Initial resume screening in progress.' },
  { studentIdx: 11, internshipIdx: 8, status: 'Under Review', note: 'Product strategy case under review.' },
  { studentIdx: 10, internshipIdx: 9, status: 'Applied', note: 'Application submitted by student.' },
  { studentIdx: 11, internshipIdx: 6, status: 'Applied', note: 'Application submitted by student.' },
  { studentIdx: 6, internshipIdx: 0, status: 'Rejected', note: 'Selected candidates with stronger web accessibility depth.' },
  { studentIdx: 8, internshipIdx: 4, status: 'Rejected', note: 'Role required prior C/RTOS microcontroller projects.' },
];

export async function seedDemoEcosystem(adminId: string, adminName: string): Promise<{ seededCount: number }> {
  try {
    const batch1 = writeBatch(db);
    const nowIso = new Date().toISOString();

    // 1. Seed 12 demo students (users + studentProfiles + studentPublicProfiles + careerPassports)
    DEMO_STUDENTS.forEach((s) => {
      const slug = `${s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${s.id.slice(-2)}`;
      const headline = `${s.degree} ${s.branch} Candidate · ${s.skills.slice(0, 2).join(' & ')}`;
      const demoProjects = [
        {
          title: `${s.skills[0]} Capstone Platform`,
          role: 'Lead Student Engineer',
          description: `Built an end-to-end academic engineering project utilizing ${s.skills.slice(0, 3).join(', ')}.`,
          techStack: s.skills.slice(0, 3).join(', '),
          githubUrl: 'https://github.com/octocat',
        },
      ];
      const demoAchievements = [
        {
          title: `${s.branch} Hackathon Finalist (Demo)`,
          category: 'Hackathon',
          issuer: s.college,
          date: '2026',
        },
      ];
      const demoSocial = {
        linkedin: 'https://linkedin.com',
        github: 'https://github.com/octocat',
        portfolio: '',
      };

      batch1.set(doc(db, 'users', s.id), {
        uid: s.id,
        fullName: s.name,
        email: s.email,
        role: 'student',
        accountStatus: 'active',
        emailVerified: true,
        isDemo: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch1.set(doc(db, 'studentProfiles', s.id), {
        uid: s.id,
        fullName: s.name,
        headline,
        email: s.email,
        phone: '+91 98260 00000',
        college: s.college,
        degree: s.degree,
        branch: s.branch,
        semester: s.semester,
        graduationYear: s.gradYear,
        cgpa: s.cgpa,
        skills: s.skills,
        interests: ['Software Architecture', 'Applied Systems'],
        projects: demoProjects,
        certifications: [`Verified ${s.branch} Lab Honors (Demo)`],
        achievements: demoAchievements,
        experience: [],
        linkedinUrl: demoSocial.linkedin,
        githubUrl: demoSocial.github,
        portfolioUrl: '',
        socialLinks: demoSocial,
        publicSlug: slug,
        isPassportPublic: true,
        about: `${s.degree} ${s.branch} undergraduate at ${s.college} (Demo Record) seeking hands-on industry internship opportunities.`,
        showContactToRecruiters: true,
        profileCompletion: 92,
        isDemo: true,
        updatedAt: serverTimestamp(),
      });
      batch1.set(doc(db, 'studentPublicProfiles', s.id), {
        uid: s.id,
        fullName: s.name,
        headline,
        college: s.college,
        degree: s.degree,
        branch: s.branch,
        semester: s.semester,
        graduationYear: s.gradYear,
        cgpa: s.cgpa,
        skills: s.skills,
        interests: ['Software Architecture', 'Applied Systems'],
        projects: demoProjects,
        certifications: [`Verified ${s.branch} Lab Honors (Demo)`],
        achievements: demoAchievements,
        experience: [],
        linkedinUrl: demoSocial.linkedin,
        githubUrl: demoSocial.github,
        portfolioUrl: '',
        socialLinks: demoSocial,
        publicSlug: slug,
        isPassportPublic: true,
        about: `${s.degree} ${s.branch} undergraduate at ${s.college} (Demo Record).`,
        profileCompletion: 92,
        isDemo: true,
        updatedAt: serverTimestamp(),
      });
      batch1.set(doc(db, 'careerPassports', slug), {
        slug,
        studentId: s.id,
        isPublic: true,
        fullName: s.name,
        headline,
        college: s.college,
        degree: s.degree,
        branch: s.branch,
        graduationYear: s.gradYear,
        cgpa: s.cgpa,
        about: `${s.degree} ${s.branch} undergraduate at ${s.college} (Demo Record).`,
        skills: s.skills,
        projects: demoProjects,
        experience: [],
        achievements: demoAchievements,
        certificates: [],
        socialLinks: demoSocial,
        resumeAvailable: true,
        profileCompletion: 92,
        isDemo: true,
        updatedAt: serverTimestamp(),
      });
    });

    // 2. Seed 6 demo companies
    DEMO_COMPANIES.forEach((c) => {
      batch1.set(doc(db, 'users', c.id), {
        uid: c.id,
        fullName: c.name,
        email: c.email,
        role: 'company',
        accountStatus: 'active',
        emailVerified: true,
        isDemo: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch1.set(doc(db, 'companyProfiles', c.id), {
        uid: c.id,
        companyName: c.name,
        officialEmail: c.email,
        contactPerson: c.contact,
        phone: '+91 80 4100 0000',
        website: c.website,
        industry: c.industry,
        companySize: c.size,
        headquarters: c.hq,
        description: c.desc,
        logoText: c.logo,
        verificationStatus: c.status,
        verifiedAt: c.status === 'verified' ? nowIso : '',
        verifiedBy: c.status === 'verified' ? adminId : '',
        isDemo: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch1.set(doc(db, 'companiesPublic', c.id), {
        uid: c.id,
        companyName: c.name,
        website: c.website,
        industry: c.industry,
        companySize: c.size,
        headquarters: c.hq,
        description: c.desc,
        logoText: c.logo,
        verificationStatus: c.status,
        isDemo: true,
        updatedAt: serverTimestamp(),
      });
    });

    await batch1.commit();

    // Batch 2: Internships, Applications, Interviews, Progress, Feedback, Logs
    const batch2 = writeBatch(db);

    const appCounts: Record<string, number> = {};
    DEMO_APPLICATIONS.forEach((a) => {
      const intId = DEMO_INTERNSHIPS[a.internshipIdx].id;
      appCounts[intId] = (appCounts[intId] || 0) + 1;
    });

    DEMO_INTERNSHIPS.forEach((item) => {
      const comp = DEMO_COMPANIES[item.companyIdx];
      batch2.set(doc(db, 'internships', item.id), {
        internshipId: item.id,
        companyId: comp.id,
        companyName: comp.name,
        companyIndustry: comp.industry,
        title: item.title,
        category: item.category,
        description: item.desc,
        responsibilities: item.resp,
        skills: item.skills,
        eligibilityText: `Minimum CGPA ${item.minCgpa.toFixed(1)} · Final & pre-final year students`,
        minCgpa: item.minCgpa,
        eligibleBranches: ['Computer Science', 'Information Technology', 'Data Science', 'Electronics & Comm.', 'Cyber Security'],
        duration: item.duration,
        isPaid: item.isPaid,
        stipendAmount: item.stipend,
        stipendDisplay: item.isPaid ? `₹${item.stipend.toLocaleString('en-IN')}/mo` : 'Unpaid',
        location: item.location,
        workMode: item.workMode,
        openings: item.openings,
        deadline: item.deadline,
        startDate: item.startDate,
        requiredDocuments: ['Resume (PDF)', 'Academic Transcript'],
        contactInstructions: `Questions routed through ${comp.contact} via Udaan portal.`,
        status: item.status,
        approvalStatus: item.approvalStatus,
        applicantsCount: appCounts[item.id] || 0,
        isDemo: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    DEMO_APPLICATIONS.forEach((a, idx) => {
      const s = DEMO_STUDENTS[a.studentIdx];
      const item = DEMO_INTERNSHIPS[a.internshipIdx];
      const comp = DEMO_COMPANIES[item.companyIdx];
      const appId = `${item.id}_${s.id}`;
      const history = [
        { status: 'Applied', changedBy: s.id, actorRole: 'student', note: 'Application submitted (Demo)', timestamp: '2026-11-10T09:30:00.000Z' },
      ];
      if (a.status !== 'Applied') {
        history.push({ status: a.status, changedBy: comp.id, actorRole: 'company', note: a.note, timestamp: '2026-11-18T14:00:00.000Z' });
      }

      batch2.set(doc(db, 'applications', appId), {
        applicationId: appId,
        internshipId: item.id,
        internshipTitle: item.title,
        studentId: s.id,
        studentName: s.name,
        studentEmail: s.email,
        studentCollege: s.college,
        studentBranch: s.branch,
        studentCgpa: s.cgpa,
        studentSkills: s.skills,
        companyId: comp.id,
        companyName: comp.name,
        resumeName: `${s.name.replace(/\s+/g, '_')}_Resume_Demo.pdf`,
        coverLetter: `I am excited to apply for the ${item.title} position at ${comp.name}. My coursework in ${s.branch} and hands-on work with ${s.skills.slice(0, 3).join(', ')} align closely with your team's objectives.`,
        status: a.status,
        statusHistory: history,
        joiningInfo: a.status === 'Selected' ? `Joining scheduled for ${item.startDate} · Onboarding orientation at 10:00 AM.` : '',
        isDemo: true,
        appliedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Seed Interviews for Interview Scheduled & first Selected
      if (a.status === 'Interview Scheduled' || idx < 2) {
        const ivwId = `demo_ivw_${String(idx + 1).padStart(2, '0')}`;
        batch2.set(doc(db, 'interviews', ivwId), {
          interviewId: ivwId,
          applicationId: appId,
          studentId: s.id,
          studentName: s.name,
          companyId: comp.id,
          companyName: comp.name,
          internshipId: item.id,
          internshipTitle: item.title,
          title: idx < 2 ? 'Final Technical Panel (Demo)' : 'Technical Architecture Interview (Demo)',
          interviewDate: idx < 2 ? '2026-11-16' : `2026-12-0${(idx % 7) + 2}`,
          startTime: '11:00',
          endTime: '11:45',
          mode: 'Online',
          meetingLink: 'https://meet.google.com',
          interviewer: comp.contact,
          instructions: 'Please have your GitHub projects and IDE ready for a brief technical discussion.',
          status: idx < 2 ? 'Completed' : 'Scheduled',
          isDemo: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // Seed Internship Progress + Feedback for Selected students
      if (a.status === 'Selected') {
        const progId = `prog_${appId}`;
        const completed = idx === 0;
        batch2.set(doc(db, 'internshipProgress', progId), {
          progressId: progId,
          applicationId: appId,
          studentId: s.id,
          studentName: s.name,
          companyId: comp.id,
          companyName: comp.name,
          internshipId: item.id,
          internshipTitle: item.title,
          mentorName: comp.contact,
          mentorEmail: comp.email,
          startDate: '2026-09-01',
          endDate: '2026-12-15',
          actualCompletionDate: completed ? '2026-11-22' : '',
          progressStatus: completed ? 'Completed' : 'In Progress',
          milestones: [
            { id: 'ms_1', title: 'Onboarding & Architecture Orientation', dueDate: '2026-09-15', completed: true },
            { id: 'ms_2', title: 'Core Feature Delivery & Code Review', dueDate: '2026-10-20', completed: true },
            { id: 'ms_3', title: 'Final Evaluation & Documentation Handover', dueDate: '2026-12-10', completed },
          ],
          weeklyUpdates: [
            { id: 'wk_1', weekLabel: 'Week 1–2', summary: 'Completed codebase onboarding, local dev setup, and first bugfix PR.', submittedAt: '2026-09-14T16:00:00.000Z' },
            { id: 'wk_2', weekLabel: 'Week 3–6', summary: 'Delivered primary sprint milestone with automated test coverage.', submittedAt: '2026-10-18T17:30:00.000Z' },
          ],
          documents: [
            { id: 'doc_1', title: 'Midterm Internship Report (Demo)', referenceUrl: 'https://example.com/midterm-report', submittedAt: '2026-10-22T12:00:00.000Z' },
          ],
          completionConfirmed: completed,
          isDemo: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        const fbkId = `demo_fbk_${String(idx + 1).padStart(2, '0')}`;
        batch2.set(doc(db, 'feedback', fbkId), {
          feedbackId: fbkId,
          applicationId: appId,
          internshipId: item.id,
          internshipTitle: item.title,
          studentId: s.id,
          studentName: s.name,
          companyId: comp.id,
          companyName: comp.name,
          stage: completed ? 'final' : 'midterm',
          rating: 5,
          strengths: 'High code ownership, clear written communication, and rapid debugging.',
          improvements: 'Continue documenting edge-case trade-offs before implementation.',
          comments: `${s.name} consistently met sprint milestones and collaborated smoothly with senior engineers (Demo Record).`,
          recommendation: completed ? 'Completed' : 'Strong Hire',
          isDemo: true,
          submittedAt: serverTimestamp(),
        });
      }
    });

    // Seed system settings + admin broadcast notification + audit log
    batch2.set(doc(db, 'systemSettings', 'config'), {
      institutionName: 'Medicaps University — Training & Placement Cell',
      academicYear: '2026–2027',
      institutionWebsite: 'https://www.medicaps.ac.in',
      institutionLinkedin: 'https://linkedin.com/school/medi-caps-university',
      contactEmail: 'placements@medicaps.ac.in',
      contactPhone: '+91 731 425 9500',
      requireCompanyVerification: true,
      requireInternshipApproval: true,
      maxActiveApplicationsPerStudent: 10,
      allowWithdrawBeforeInterview: true,
      updatedAt: serverTimestamp(),
    });

    batch2.set(doc(db, 'notifications', 'demo_ntf_admin_01'), {
      notificationId: 'demo_ntf_admin_01',
      recipientId: 'admin_broadcast',
      senderId: adminId,
      title: '1 company pending verification (Demo)',
      message: 'Solstice CleanGrid Tech (Demo) submitted its profile and is awaiting verification review.',
      type: 'verification',
      relatedEntityId: 'demo_comp_06',
      targetRoute: '/admin/verifications',
      read: false,
      isDemo: true,
      createdAt: serverTimestamp(),
    });

    batch2.set(doc(db, 'notifications', 'demo_ntf_admin_02'), {
      notificationId: 'demo_ntf_admin_02',
      recipientId: 'admin_broadcast',
      senderId: adminId,
      title: '2 internships awaiting approval (Demo)',
      message: 'Review pending postings in the Internship Approvals queue before publishing to students.',
      type: 'approval',
      relatedEntityId: 'demo_int_11',
      targetRoute: '/admin/approvals',
      read: false,
      isDemo: true,
      createdAt: serverTimestamp(),
    });

    batch2.set(doc(db, 'activityLogs', 'demo_act_seed_01'), {
      activityId: 'demo_act_seed_01',
      actorId: adminId,
      actorName: adminName,
      actorRole: 'admin',
      action: 'Seeded idempotent demonstration dataset',
      entityType: 'system',
      entityId: 'demo_seed',
      details: '12 students, 6 companies, 12 internships, 20 applications, 7 interviews, 4 progress records (marked isDemo)',
      isDemo: true,
      timestamp: serverTimestamp(),
    });

    await batch2.commit();
    await recomputePlatformStats();

    return { seededCount: DEMO_STUDENTS.length + DEMO_COMPANIES.length + DEMO_INTERNSHIPS.length + DEMO_APPLICATIONS.length };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seedDemoEcosystem');
  }
}
