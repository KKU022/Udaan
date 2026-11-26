import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Award,
  UserCircle,
  Compass,
  FileCheck2,
  Bookmark,
  Calendar,
  FileText,
  TrendingUp,
  Bell,
  Settings,
} from 'lucide-react';
import { DashboardLayout, type NavItem } from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { StudentOverview } from './StudentOverview';
import { CareerPassportPage } from './CareerPassportPage';
import { StudentProfilePage } from './StudentProfilePage';
import { StudentApplicationsPage } from './StudentApplicationsPage';
import {
  StudentSavedPage,
  StudentInterviewsPage,
  StudentDocumentsPage,
  StudentProgressPage,
} from './StudentWorkspacePages';
import { ExploreInternshipsPage } from '../ExploreInternshipsPage';
import { InternshipDetailPage } from '../InternshipDetailPage';
import { NotificationsPage, SettingsPage } from '../SharedPortalPages';

export const StudentPortal: React.FC = () => {
  const { unreadCount } = useAuth();

  const navItems: NavItem[] = [
    { label: 'Overview', to: '/student', icon: LayoutDashboard },
    { label: 'Career Passport', to: '/student/passport', icon: Award },
    { label: 'My Profile', to: '/student/profile', icon: UserCircle },
    { label: 'Explore Internships', to: '/student/explore', icon: Compass },
    { label: 'My Applications', to: '/student/applications', icon: FileCheck2 },
    { label: 'Saved Internships', to: '/student/saved', icon: Bookmark },
    { label: 'Interviews', to: '/student/interviews', icon: Calendar },
    { label: 'My Documents', to: '/student/documents', icon: FileText },
    { label: 'Internship Progress', to: '/student/progress', icon: TrendingUp },
    { label: 'Notifications', to: '/student/notifications', icon: Bell, badge: unreadCount },
    { label: 'Settings', to: '/student/settings', icon: Settings },
  ];

  return (
    <DashboardLayout portalName="Student Portal" navItems={navItems}>
      <Routes>
        <Route index element={<StudentOverview />} />
        <Route path="passport" element={<CareerPassportPage />} />
        <Route path="profile" element={<StudentProfilePage />} />
        <Route path="explore" element={<ExploreInternshipsPage embedded />} />
        <Route path="internships/:id" element={<InternshipDetailPage embedded />} />
        <Route path="applications" element={<StudentApplicationsPage />} />
        <Route path="saved" element={<StudentSavedPage />} />
        <Route path="interviews" element={<StudentInterviewsPage />} />
        <Route path="documents" element={<StudentDocumentsPage />} />
        <Route path="progress" element={<StudentProgressPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/student" replace />} />
      </Routes>
    </DashboardLayout>
  );
};
