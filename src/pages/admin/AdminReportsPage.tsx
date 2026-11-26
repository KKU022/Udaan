import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Download, FileText, Printer, Search } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import {
  listAllCompanyProfiles,
  listAllStudentProfiles,
} from '../../services/adminService';
import { listAllInternships } from '../../services/internshipService';
import { listAllApplications } from '../../services/applicationService';
import { listAllProgress } from '../../services/interviewProgressService';
import type {
  ApplicationRecord,
  CompanyProfile,
  InternshipProgressRecord,
  InternshipRecord,
  StudentProfile,
} from '../../types';
import { ErrorState, LoadingSkeleton, StatCard } from '../../components/ui/Primitives';
import {
  exportReportToPdf,
  exportRowsToCsv,
  formatDate,
  toDate,
} from '../../utils/formatters';

type ReportType =
  | 'students'
  | 'companies'
  | 'verified_companies'
  | 'internships'
  | 'applications'
  | 'selections'
  | 'completions';

const REPORT_TABS: { id: ReportType; label: string }[] = [
  { id: 'students', label: 'Student Registrations' },
  { id: 'companies', label: 'Company Registrations' },
  { id: 'verified_companies', label: 'Verified Companies' },
  { id: 'internships', label: 'Internship Postings' },
  { id: 'applications', label: 'Applications' },
  { id: 'selections', label: 'Selections' },
  { id: 'completions', label: 'Internship Completion' },
];

export const AdminReportsPage: React.FC = () => {
  const { theme } = useTheme();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [internships, setInternships] = useState<InternshipRecord[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [progress, setProgress] = useState<InternshipProgressRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeReport, setActiveReport] = useState<ReportType>('applications');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [s, c, i, a, p] = await Promise.all([
        listAllStudentProfiles(),
        listAllCompanyProfiles(),
        listAllInternships(),
        listAllApplications(),
        listAllProgress(),
      ]);
      setStudents(s);
      setCompanies(c);
      setInternships(i);
      setApplications(a);
      setProgress(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const inDateRange = (val: unknown): boolean => {
    if (!startDate && !endDate) return true;
    const d = toDate(val as never);
    if (!d) return true;
    if (startDate && d < new Date(startDate)) return false;
    if (endDate && d > new Date(`${endDate}T23:59:59`)) return false;
    return true;
  };

  const reportData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    if (activeReport === 'students') {
      const list = students.filter(
        (s) =>
          inDateRange(s.updatedAt) &&
          (!q ||
            s.fullName.toLowerCase().includes(q) ||
            s.college.toLowerCase().includes(q) ||
            s.branch.toLowerCase().includes(q))
      );
      return {
        title: 'Student Registration Report',
        headers: ['Student Name', 'Email', 'College', 'Branch', 'CGPA', 'Profile %'],
        rows: list.map((s) => [
          s.fullName,
          s.email,
          s.college,
          `${s.degree} - ${s.branch}`,
          s.cgpa ? s.cgpa.toFixed(2) : '—',
          `${s.profileCompletion}%`,
        ]),
        chart: Array.from(
          list.reduce(
            (m, s) => m.set(s.branch, (m.get(s.branch) || 0) + 1),
            new Map<string, number>()
          )
        ).map(([label, count]) => ({ label: label.slice(0, 16), count })),
      };
    }

    if (activeReport === 'companies' || activeReport === 'verified_companies') {
      const list = companies.filter(
        (c) =>
          (activeReport === 'companies' || c.verificationStatus === 'verified') &&
          inDateRange(c.createdAt) &&
          (!q || c.companyName.toLowerCase().includes(q) || c.industry.toLowerCase().includes(q))
      );
      return {
        title:
          activeReport === 'verified_companies'
            ? 'Verified Companies Report'
            : 'Company Registration Report',
        headers: ['Company Name', 'Industry', 'HQ', 'Contact', 'Status', 'Verified Date'],
        rows: list.map((c) => [
          c.companyName,
          c.industry,
          c.headquarters || '—',
          c.contactPerson,
          c.verificationStatus,
          formatDate(c.verifiedAt),
        ]),
        chart: Array.from(
          list.reduce(
            (m, c) => m.set(c.verificationStatus, (m.get(c.verificationStatus) || 0) + 1),
            new Map<string, number>()
          )
        ).map(([label, count]) => ({ label, count })),
      };
    }

    if (activeReport === 'internships') {
      const list = internships.filter(
        (i) =>
          inDateRange(i.createdAt) &&
          (!q ||
            i.title.toLowerCase().includes(q) ||
            i.companyName.toLowerCase().includes(q) ||
            i.category.toLowerCase().includes(q))
      );
      return {
        title: 'Internship Posting Report',
        headers: ['Role Title', 'Company', 'Category', 'Stipend', 'Applicants', 'Status'],
        rows: list.map((i) => [
          i.title,
          i.companyName,
          i.category,
          i.stipendDisplay,
          String(i.applicantsCount || 0),
          i.status,
        ]),
        chart: Array.from(
          list.reduce(
            (m, i) => m.set(i.category, (m.get(i.category) || 0) + 1),
            new Map<string, number>()
          )
        ).map(([label, count]) => ({ label: label.slice(0, 16), count })),
      };
    }

    if (activeReport === 'selections') {
      const list = applications.filter(
        (a) =>
          a.status === 'Selected' &&
          inDateRange(a.appliedAt) &&
          (!q ||
            a.studentName.toLowerCase().includes(q) ||
            a.companyName.toLowerCase().includes(q) ||
            a.internshipTitle.toLowerCase().includes(q))
      );
      return {
        title: 'Student Selection Report',
        headers: ['Student', 'College', 'Branch', 'Company', 'Internship', 'Updated'],
        rows: list.map((a) => [
          a.studentName,
          a.studentCollege || '—',
          a.studentBranch || '—',
          a.companyName,
          a.internshipTitle,
          formatDate(a.updatedAt),
        ]),
        chart: Array.from(
          list.reduce(
            (m, a) => m.set(a.companyName, (m.get(a.companyName) || 0) + 1),
            new Map<string, number>()
          )
        ).map(([label, count]) => ({ label: label.replace(' (Demo)', '').slice(0, 16), count })),
      };
    }

    if (activeReport === 'completions') {
      const list = progress.filter(
        (p) =>
          inDateRange(p.updatedAt) &&
          (!q ||
            p.studentName.toLowerCase().includes(q) ||
            p.companyName.toLowerCase().includes(q) ||
            p.internshipTitle.toLowerCase().includes(q))
      );
      return {
        title: 'Internship Completion Report',
        headers: ['Student', 'Company', 'Internship', 'Mentor', 'Status', 'Confirmed'],
        rows: list.map((p) => [
          p.studentName,
          p.companyName,
          p.internshipTitle,
          p.mentorName || 'Unassigned',
          p.progressStatus,
          p.completionConfirmed ? 'Yes' : 'Pending',
        ]),
        chart: Array.from(
          list.reduce(
            (m, p) => m.set(p.progressStatus, (m.get(p.progressStatus) || 0) + 1),
            new Map<string, number>()
          )
        ).map(([label, count]) => ({ label, count })),
      };
    }

    const list = applications.filter(
      (a) =>
        inDateRange(a.appliedAt) &&
        (!q ||
          a.studentName.toLowerCase().includes(q) ||
          a.companyName.toLowerCase().includes(q) ||
          a.internshipTitle.toLowerCase().includes(q))
    );
    return {
      title: 'Applications Report',
      headers: ['Student', 'College', 'Internship', 'Company', 'Status', 'Applied Date'],
      rows: list.map((a) => [
        a.studentName,
        a.studentCollege || '—',
        a.internshipTitle,
        a.companyName,
        a.status,
        formatDate(a.appliedAt),
      ]),
      chart: Array.from(
        list.reduce(
          (m, a) => m.set(a.status, (m.get(a.status) || 0) + 1),
          new Map<string, number>()
        )
      ).map(([label, count]) => ({ label, count })),
    };
  }, [
    activeReport,
    students,
    companies,
    internships,
    applications,
    progress,
    startDate,
    endDate,
    searchQuery,
  ]);

  const selectionRate =
    applications.length > 0
      ? `${Math.round(
          (applications.filter((a) => a.status === 'Selected').length / applications.length) * 100
        )}%`
      : '0%';

  const gridColor = theme === 'dark' ? '#262626' : '#E5E5E5';
  const tickColor = theme === 'dark' ? '#A3A3A3' : '#525252';
  const barColor = theme === 'dark' ? '#FFFFFF' : '#111111';
  const tooltipStyle = {
    backgroundColor: theme === 'dark' ? '#171717' : '#FFFFFF',
    border: `1px solid ${theme === 'dark' ? '#303030' : '#D4D4D4'}`,
    borderRadius: '10px',
    color: theme === 'dark' ? '#FFFFFF' : '#111111',
    fontSize: '12px',
  };

  if (loading) return <LoadingSkeleton rows={6} />;
  if (error) return <ErrorState message={error} onRetry={loadAll} />;

  return (
    <div className="space-y-6 udaan-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
            Reports & Analytics
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Generate real-time placement reports directly from Firestore and export as CSV, PDF, or print layouts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() =>
              exportRowsToCsv(
                `udaan-${activeReport}-report.csv`,
                reportData.headers,
                reportData.rows
              )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium mono-btn-secondary"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() =>
              exportReportToPdf(
                reportData.title,
                startDate || endDate
                  ? `Filtered ${startDate || 'start'} to ${endDate || 'present'}`
                  : 'All recorded dates',
                [
                  { label: 'Records in Report', value: String(reportData.rows.length) },
                  { label: 'Total Students', value: String(students.length) },
                  {
                    label: 'Verified Companies',
                    value: String(companies.filter((c) => c.verificationStatus === 'verified').length),
                  },
                  { label: 'Selection Rate', value: selectionRate },
                ],
                reportData.headers,
                reportData.rows
              )
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold mono-btn-primary"
          >
            <FileText className="w-3.5 h-3.5" />
            Export PDF
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium mono-btn-secondary"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
        </div>
      </div>

      {/* Report Selector Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-[var(--border-subtle)] pb-3 print:hidden">
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveReport(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-[10px] transition-colors ${
              activeReport === tab.id
                ? 'bg-[var(--action-bg)] text-[var(--action-text)]'
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Rows in Active Report" value={reportData.rows.length} />
        <StatCard
          label="Verified Companies"
          value={companies.filter((c) => c.verificationStatus === 'verified').length}
        />
        <StatCard label="Overall Selection Rate" value={selectionRate} />
        <StatCard
          label="Completed Internships"
          value={progress.filter((p) => p.progressStatus === 'Completed').length}
        />
      </div>

      {/* Date & Search Filters */}
      <div className="mono-card p-4 flex flex-col sm:flex-row gap-3 print:hidden">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search within ${reportData.title}...`}
            className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            aria-label="Report start date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 text-xs border border-[var(--border-color)] rounded-[10px]"
          />
          <span className="text-xs text-[var(--text-muted)]">to</span>
          <input
            type="date"
            aria-label="Report end date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 text-xs border border-[var(--border-color)] rounded-[10px]"
          />
        </div>
      </div>

      {/* Breakdown Chart */}
      {reportData.chart.length > 0 && (
        <div className="mono-card p-6">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            {reportData.title} — Distribution
          </h3>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={reportData.chart}
                margin={{ top: 8, right: 12, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: tickColor }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: tickColor }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  cursor={{
                    fill: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(17,17,17,0.05)',
                  }}
                />
                <Bar dataKey="count" fill={barColor} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Searchable Report Table */}
      <div className="mono-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{reportData.title}</h3>
          <span className="text-xs font-mono text-[var(--text-muted)]">
            {reportData.rows.length} rows
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)] text-xs text-[var(--text-muted)]">
                {reportData.headers.map((h) => (
                  <th key={h} className="py-3 px-4 font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {reportData.rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={reportData.headers.length}
                    className="py-8 text-center text-sm text-[var(--text-muted)]"
                  >
                    No records match the current report filters.
                  </td>
                </tr>
              ) : (
                reportData.rows.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-[var(--bg-secondary)] transition-colors"
                  >
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className="py-3 px-4 text-xs text-[var(--text-primary)] whitespace-nowrap"
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
