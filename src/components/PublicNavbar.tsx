import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from './BrandLogo';
import { ThemeToggle } from './ThemeToggle';

export const PublicNavbar: React.FC = () => {
  const { userRecord } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const dashboardPath =
    userRecord?.role === 'admin'
      ? '/admin'
      : userRecord?.role === 'company'
      ? '/recruiter'
      : '/student';

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg-primary)]/90 backdrop-blur-md border-b border-[var(--border-color)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Brand Wordmark */}
        <Link to="/" aria-label="Udaan home">
          <BrandLogo size="md" />
        </Link>

        {/* Zone 2: Concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[var(--text-secondary)]">
          <Link
            to="/explore"
            className="hover:text-[var(--text-primary)] transition-colors duration-150 whitespace-nowrap shrink-0"
          >
            Explore Opportunities
          </Link>
          <a
            href="/#for-everyone"
            className="hover:text-[var(--text-primary)] transition-colors duration-150 whitespace-nowrap shrink-0"
          >
            For Students
          </a>
          <a
            href="/#for-everyone"
            className="hover:text-[var(--text-primary)] transition-colors duration-150 whitespace-nowrap shrink-0"
          >
            For Companies
          </a>
          <a
            href="/#ecosystem"
            className="hover:text-[var(--text-primary)] transition-colors duration-150 whitespace-nowrap shrink-0"
          >
            Ecosystem
          </a>
          {!userRecord && (
            <Link
              to="/login"
              className="hover:text-[var(--text-primary)] transition-colors duration-150 whitespace-nowrap shrink-0"
            >
              Sign In
            </Link>
          )}
        </nav>

        {/* Zone 3: Theme Toggle + Primary Action */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          <ThemeToggle />
          {userRecord ? (
            <button
              type="button"
              onClick={() => navigate(dashboardPath)}
              className="px-4 py-2 text-sm font-medium mono-btn-primary whitespace-nowrap shrink-0"
            >
              Open Dashboard
            </button>
          ) : (
            <Link
              to="/register"
              className="px-4 py-2 text-sm font-medium mono-btn-primary whitespace-nowrap shrink-0"
            >
              Get Started
            </Link>
          )}
        </div>

        {/* Mobile controls */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="p-2 text-[var(--text-primary)] rounded-[10px] hover:bg-[var(--bg-elevated)] transition-colors"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-4 space-y-2 udaan-fade-in">
          <Link
            to="/explore"
            onClick={() => setMobileOpen(false)}
            className="block py-2 text-sm font-medium text-[var(--text-primary)]"
          >
            Explore Opportunities
          </Link>
          <a
            href="/#for-everyone"
            onClick={() => setMobileOpen(false)}
            className="block py-2 text-sm font-medium text-[var(--text-secondary)]"
          >
            For Students & Companies
          </a>
          <a
            href="/#ecosystem"
            onClick={() => setMobileOpen(false)}
            className="block py-2 text-sm font-medium text-[var(--text-secondary)]"
          >
            Ecosystem
          </a>
          <div className="pt-3 border-t border-[var(--border-color)] flex items-center gap-3">
            {userRecord ? (
              <Link
                to={dashboardPath}
                onClick={() => setMobileOpen(false)}
                className="flex-1 text-center px-4 py-2.5 text-sm font-medium mono-btn-primary"
              >
                Open Dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center px-4 py-2.5 text-sm font-medium mono-btn-secondary"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="flex-1 text-center px-4 py-2.5 text-sm font-medium mono-btn-primary"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
