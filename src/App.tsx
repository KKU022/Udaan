import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ShieldAlert, LogOut } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { BrandLogo } from './components/BrandLogo';
import { LandingPage } from './pages/LandingPage';
import { LoginPage, OnboardingPage, RegisterPage } from './pages/AuthPages';
import { ExploreInternshipsPage } from './pages/ExploreInternshipsPage';
import { InternshipDetailPage } from './pages/InternshipDetailPage';
import { PublicPassportPage } from './pages/PublicPassportPage';
import type { UserRole } from './types';

const StudentPortal = lazy(() =>
  import('./pages/student/StudentPortal').then((m) => ({ default: m.StudentPortal }))
);
const RecruiterPortal = lazy(() =>
  import('./pages/recruiter/RecruiterPortal').then((m) => ({ default: m.RecruiterPortal }))
);
const AdminPortal = lazy(() =>
  import('./pages/admin/AdminPortal').then((m) => ({ default: m.AdminPortal }))
);

function getRoleHome(role: UserRole): string {
  if (role === 'admin') return '/admin';
  if (role === 'company') return '/recruiter';
  return '/student';
}

const FullscreenLoader: React.FC<{ label?: string }> = ({ label = 'Loading Udaan...' }) => (
  <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center p-6">
    <div className="text-center space-y-3 flex flex-col items-center">
      <div className="animate-pulse">
        <BrandLogo size="md" />
      </div>
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
    </div>
  </div>
);

const ProtectedRoleRoute: React.FC<{
  allowedRole: UserRole;
  children: React.ReactNode;
}> = ({ allowedRole, children }) => {
  const {
    firebaseUser,
    userRecord,
    loading,
    needsOnboarding,
    needsEmailVerification,
    logout,
  } = useAuth();

  if (loading) {
    return <FullscreenLoader label="Verifying session and permissions..." />;
  }

  if (!firebaseUser) {
    return <Navigate to="/login" replace />;
  }

  if (needsEmailVerification || needsOnboarding || !userRecord) {
    return <Navigate to="/onboarding" replace />;
  }

  if (userRecord.accountStatus !== 'active') {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center p-6">
        <div className="max-w-md w-full mono-card p-8 text-center">
          <ShieldAlert className="w-8 h-8 text-[var(--text-primary)] mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">
            Account {userRecord.accountStatus}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
            Your Udaan account is currently marked as{' '}
            <strong className="text-[var(--text-primary)]">{userRecord.accountStatus}</strong>. Your
            historical records remain preserved. Contact the university placement office for
            assistance.
          </p>
          <button
            type="button"
            onClick={() => logout()}
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium mono-btn-primary"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  if (userRecord.role !== allowedRole) {
    return <Navigate to={getRoleHome(userRecord.role)} replace />;
  }

  return <>{children}</>;
};

const ThemedToaster: React.FC = () => {
  const { theme } = useTheme();
  return (
    <Toaster
      position="top-right"
      theme={theme}
      closeButton
      toastOptions={{
        style: {
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
        },
      }}
    />
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <ThemedToaster />
            <Suspense fallback={<FullscreenLoader />}>
              <Routes>
                {/* Public Experience */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/explore" element={<ExploreInternshipsPage />} />
                <Route path="/internships" element={<ExploreInternshipsPage />} />
                <Route path="/internships/:id" element={<InternshipDetailPage />} />
                <Route path="/passport/:slug" element={<PublicPassportPage />} />

                {/* Authentication & Onboarding */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/onboarding" element={<OnboardingPage />} />

                {/* Role-Protected Portals */}
                <Route
                  path="/student/*"
                  element={
                    <ProtectedRoleRoute allowedRole="student">
                      <StudentPortal />
                    </ProtectedRoleRoute>
                  }
                />
                <Route
                  path="/recruiter/*"
                  element={
                    <ProtectedRoleRoute allowedRole="company">
                      <RecruiterPortal />
                    </ProtectedRoleRoute>
                  }
                />
                <Route
                  path="/admin/*"
                  element={
                    <ProtectedRoleRoute allowedRole="admin">
                      <AdminPortal />
                    </ProtectedRoleRoute>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
