import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Briefcase,
  PlusCircle,
  Users,
  UserCheck,
  Calendar,
  TrendingUp,
  MessageSquare,
  Bell,
  Settings,
} from 'lucide-react';
import { DashboardLayout, type NavItem } from '../../components/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { RecruiterOverview } from './RecruiterOverview';
import {
  RecruiterProfilePage,
  ManageInternshipsPage,
  PostInternshipPage,
} from './RecruiterInternshipsPages';
import { RecruiterApplicantsPage } from './RecruiterApplicantsPage';
import {
  RecruiterInterviewsPage,
  RecruiterProgressPage,
  RecruiterFeedbackPage,
} from './RecruiterWorkflowPages';
import { NotificationsPage, SettingsPage } from '../SharedPortalPages';

export const RecruiterPortal: React.FC = () => {
  const { unreadCount } = useAuth();

  const navItems: NavItem[] = [
    { label: 'Overview', to: '/recruiter', icon: LayoutDashboard },
    { label: 'Company Profile', to: '/recruiter/profile', icon: Building2 },
    { label: 'My Internships', to: '/recruiter/internships', icon: Briefcase },
    { label: 'Post Internship', to: '/recruiter/post', icon: PlusCircle },
    { label: 'Applicants', to: '/recruiter/applicants', icon: Users },
    { label: 'Shortlisted Candidates', to: '/recruiter/shortlisted', icon: UserCheck },
    { label: 'Interviews', to: '/recruiter/interviews', icon: Calendar },
    { label: 'Internship Progress', to: '/recruiter/progress', icon: TrendingUp },
    { label: 'Feedback', to: '/recruiter/feedback', icon: MessageSquare },
    { label: 'Notifications', to: '/recruiter/notifications', icon: Bell, badge: unreadCount },
    { label: 'Settings', to: '/recruiter/settings', icon: Settings },
  ];

  return (
    <DashboardLayout portalName="Recruiter Portal" navItems={navItems}>
      <Routes>
        <Route index element={<RecruiterOverview />} />
        <Route path="profile" element={<RecruiterProfilePage />} />
        <Route path="internships" element={<ManageInternshipsPage />} />
        <Route path="post" element={<PostInternshipPage />} />
        <Route path="post/:editId" element={<PostInternshipPage />} />
        <Route path="applicants" element={<RecruiterApplicantsPage />} />
        <Route path="shortlisted" element={<RecruiterApplicantsPage shortlistedOnly />} />
        <Route path="interviews" element={<RecruiterInterviewsPage />} />
        <Route path="progress" element={<RecruiterProgressPage />} />
        <Route path="feedback" element={<RecruiterFeedbackPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/recruiter" replace />} />
      </Routes>
    </DashboardLayout>
  );
};
