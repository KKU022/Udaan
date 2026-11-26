import { format, isValid, parseISO } from 'date-fns';
import { jsPDF } from 'jspdf';
import type { FirestoreTimestamp, StudentProfile } from '../types';

export function toDate(value: FirestoreTimestamp | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  if (typeof value === 'string') {
    const parsed = parseISO(value);
    if (isValid(parsed)) return parsed;
    const fallback = new Date(value);
    return isValid(fallback) ? fallback : null;
  }
  if (typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    const d = value.toDate();
    return isValid(d) ? d : null;
  }
  return null;
}

export function formatDate(value: FirestoreTimestamp | undefined, pattern = 'dd MMM yyyy'): string {
  const d = toDate(value);
  return d ? format(d, pattern) : '—';
}

export function formatDateTime(value: FirestoreTimestamp | undefined): string {
  const d = toDate(value);
  return d ? format(d, 'dd MMM yyyy, HH:mm') : '—';
}

export function formatCurrencyINR(amount: number): string {
  if (!amount || amount <= 0) return 'Unpaid';
  return `₹${amount.toLocaleString('en-IN')}/mo`;
}

export function calculateProfileCompletion(profile: Partial<StudentProfile>): number {
  const checks = [
    Boolean(profile.fullName && profile.fullName.trim().length >= 2),
    Boolean(profile.phone && profile.phone.trim().length >= 7),
    Boolean(profile.college && profile.college.trim().length >= 2),
    Boolean(profile.degree && profile.degree.trim().length >= 2),
    Boolean(profile.branch && profile.branch.trim().length >= 2),
    Boolean(profile.cgpa && profile.cgpa > 0),
    Boolean(profile.skills && profile.skills.length >= 2),
    Boolean(profile.about && profile.about.trim().length >= 20),
    Boolean(profile.resumeId || profile.resumeUrl),
    Boolean(profile.githubUrl || profile.linkedinUrl || profile.portfolioUrl),
  ];
  const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  return Math.max(0, Math.min(100, score));
}

export function parseCommaList(input: string, maxItems = 20): string[] {
  return input
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, maxItems);
}

export function exportRowsToCsv(filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]) {
  const escapeCell = (cell: string | number | boolean | null | undefined) => {
    const str = String(cell ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportReportToPdf(
  title: string,
  subtitle: string,
  summaryItems: { label: string; value: string }[],
  headers: string[],
  rows: string[][]
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const margin = 40;
  let y = 48;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(17, 17, 17);
  doc.text(`Udaan — ${title}`, margin, y);

  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(82, 82, 82);
  doc.text(`${subtitle} | Generated ${format(new Date(), 'dd MMM yyyy HH:mm')}`, margin, y);

  y += 24;
  doc.setDrawColor(212, 212, 212);
  doc.line(margin, y, 800, y);

  y += 20;
  doc.setFontSize(10);
  let x = margin;
  summaryItems.forEach((item) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(115, 115, 115);
    doc.text(item.label, x, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 17, 17);
    doc.text(item.value, x, y + 14);
    x += 145;
  });

  y += 38;
  const colWidth = Math.floor((800 - margin) / Math.max(headers.length, 1));
  doc.setFillColor(17, 17, 17);
  doc.rect(margin, y - 12, 760, 22, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  headers.forEach((header, idx) => {
    doc.text(header.slice(0, 22), margin + idx * colWidth + 6, y + 2);
  });

  y += 22;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(17, 17, 17);
  rows.slice(0, 45).forEach((row, rIdx) => {
    if (y > 540) {
      doc.addPage();
      y = 48;
    }
    if (rIdx % 2 === 1) {
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, y - 11, 760, 18, 'F');
    }
    row.forEach((cell, cIdx) => {
      doc.text(String(cell ?? '').slice(0, 26), margin + cIdx * colWidth + 6, y);
    });
    y += 18;
  });

  doc.save(`udaan-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`);
}

export function exportCareerPassportToPdf(profile: {
  fullName: string;
  headline?: string;
  college: string;
  degree: string;
  branch: string;
  graduationYear: number;
  cgpa: number;
  about?: string;
  skills: string[];
  projects?: Array<{ title: string; role?: string; techStack: string; description: string }>;
  experience?: Array<{ role: string; organization: string; duration: string; summary: string }>;
  achievements?: Array<{ title: string; category: string; issuer?: string; date?: string }>;
  socialLinks?: Record<string, string | undefined>;
}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const margin = 44;
  const maxWidth = 507;
  let y = 52;

  const ensureSpace = (needed = 48) => {
    if (y + needed > 790) {
      doc.addPage();
      y = 48;
    }
  };

  doc.setFillColor(17, 17, 17);
  doc.rect(0, 0, 595, 96, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text(profile.fullName, margin, 46);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(212, 212, 212);
  doc.text(
    profile.headline || `${profile.degree} in ${profile.branch} · ${profile.college}`,
    margin,
    66
  );
  doc.setFontSize(9);
  doc.setTextColor(163, 163, 163);
  doc.text(
    `Udaan Career Passport · Class of ${profile.graduationYear} · CGPA ${profile.cgpa.toFixed(2)}`,
    margin,
    82
  );

  y = 122;

  if (profile.about) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 17, 17);
    doc.text('ABOUT', margin, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(82, 82, 82);
    const aboutLines = doc.splitTextToSize(profile.about, maxWidth) as string[];
    doc.text(aboutLines, margin, y);
    y += aboutLines.length * 14 + 14;
  }

  ensureSpace(60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 17, 17);
  doc.text('EDUCATION', margin, y);
  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${profile.college}`, margin, y);
  y += 14;
  doc.setTextColor(115, 115, 115);
  doc.text(
    `${profile.degree} — ${profile.branch} | Graduating ${profile.graduationYear} | CGPA: ${profile.cgpa.toFixed(2)}`,
    margin,
    y
  );
  y += 22;

  if (profile.skills.length > 0) {
    ensureSpace(50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 17, 17);
    doc.text('SKILLS', margin, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(82, 82, 82);
    const skillLines = doc.splitTextToSize(profile.skills.join(' · '), maxWidth) as string[];
    doc.text(skillLines, margin, y);
    y += skillLines.length * 14 + 14;
  }

  if (profile.projects && profile.projects.length > 0) {
    ensureSpace(60);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 17, 17);
    doc.text('PROJECTS', margin, y);
    y += 16;
    profile.projects.forEach((p) => {
      ensureSpace(54);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(17, 17, 17);
      doc.text(`${p.title}${p.role ? ` — ${p.role}` : ''}`, margin, y);
      y += 13;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(115, 115, 115);
      doc.text(p.techStack, margin, y);
      y += 13;
      doc.setTextColor(82, 82, 82);
      const descLines = doc.splitTextToSize(p.description, maxWidth) as string[];
      doc.text(descLines, margin, y);
      y += descLines.length * 13 + 10;
    });
  }

  if (profile.experience && profile.experience.length > 0) {
    ensureSpace(60);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 17, 17);
    doc.text('EXPERIENCE', margin, y);
    y += 16;
    profile.experience.forEach((exp) => {
      ensureSpace(48);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(17, 17, 17);
      doc.text(`${exp.role} · ${exp.organization}`, margin, y);
      y += 13;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(115, 115, 115);
      doc.text(exp.duration, margin, y);
      y += 13;
      doc.setTextColor(82, 82, 82);
      const sumLines = doc.splitTextToSize(exp.summary, maxWidth) as string[];
      doc.text(sumLines, margin, y);
      y += sumLines.length * 13 + 10;
    });
  }

  if (profile.achievements && profile.achievements.length > 0) {
    ensureSpace(50);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 17, 17);
    doc.text('ACHIEVEMENTS & CERTIFICATIONS', margin, y);
    y += 15;
    profile.achievements.forEach((ach) => {
      ensureSpace(24);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(17, 17, 17);
      doc.text(
        `• ${ach.title} (${ach.category}${ach.issuer ? ` · ${ach.issuer}` : ''}${ach.date ? ` · ${ach.date}` : ''})`,
        margin,
        y
      );
      y += 14;
    });
    y += 8;
  }

  const activeLinks = Object.entries(profile.socialLinks || {}).filter(([, v]) => Boolean(v));
  if (activeLinks.length > 0) {
    ensureSpace(44);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(17, 17, 17);
    doc.text('CONNECTED PROFILES', margin, y);
    y += 15;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(82, 82, 82);
    activeLinks.forEach(([key, url]) => {
      ensureSpace(16);
      doc.text(`${key.toUpperCase()}: ${url}`, margin, y);
      y += 13;
    });
  }

  doc.save(`udaan-career-passport-${profile.fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`);
}

export function isDeadlinePassed(deadline?: string): boolean {
  if (!deadline) return false;
  const d = toDate(deadline);
  if (!d) return false;
  const endOfDeadline = new Date(d);
  endOfDeadline.setHours(23, 59, 59, 999);
  return endOfDeadline.getTime() < Date.now();
}

export function getInitials(name?: string): string {
  if (!name) return 'UD';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
