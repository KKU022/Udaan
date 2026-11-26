import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  Building2,
  ShieldCheck,
  ClipboardCheck,
  Briefcase,
  FileCheck2,
  Calendar,
  Activity,
  BarChart3,
  Bell,
  Settings,
} from 'lucide-react';
import { DashboardLayout, type NavItem } from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { AdminOverview } from './AdminOverview';
import { AdminCompaniesPage, AdminStudentsPage } from './AdminUsersPages';
import {
  AdminApplicationsPage,
  AdminInternshipsPage,
  AdminInterviewsPage,
  AdminMonitoringPage,
} from './AdminOperationsPages';
import { AdminReportsPage } from './AdminReportsPage';
import { NotificationsPage, SettingsPage } from '../SharedPortalPages';

export const AdminPortal: React.FC = () => {
  const { unreadCount } = useAuth();

  const navItems: NavItem[] = [
    { label: 'Overview', to: '/admin', icon: LayoutDashboard },
    { label: 'Students', to: '/admin/students', icon: GraduationCap },
    { label: 'Companies', to: '/admin/companies', icon: Building2 },
    { label: 'Company Verification', to: '/admin/verifications', icon: ShieldCheck },
    { label: 'Internship Approvals', to: '/admin/approvals', icon: ClipboardCheck },
    { label: 'All Internships', to: '/admin/internships', icon: Briefcase },
    { label: 'Applications', to: '/admin/applications', icon: FileCheck2 },
    { label: 'Interviews', to: '/admin/interviews', icon: Calendar },
    { label: 'Internship Monitoring', to: '/admin/monitoring', icon: Activity },
    { label: 'Reports & Analytics', to: '/admin/reports', icon: BarChart3 },
    { label: 'Notifications', to: '/admin/notifications', icon: Bell, badge: unreadCount },
    { label: 'Settings', to: '/admin/settings', icon: Settings },
  ];

  return (
    <DashboardLayout portalName="Administrator Portal" navItems={navItems}>
      <Routes>
        <Route index element={<AdminOverview />} />
        <Route path="students" element={<AdminStudentsPage />} />
        <Route path="companies" element={<AdminCompaniesPage />} />
        <Route path="verifications" element={<AdminCompaniesPage pendingOnly />} />
        <Route path="approvals" element={<AdminInternshipsPage pendingOnly />} />
        <Route path="internships" element={<AdminInternshipsPage />} />
        <Route path="applications" element={<AdminApplicationsPage />} />
        <Route path="interviews" element={<AdminInterviewsPage />} />
        <Route path="monitoring" element={<AdminMonitoringPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </DashboardLayout>
  );
};
