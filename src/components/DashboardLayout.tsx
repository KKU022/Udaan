import React, { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, X, CheckCheck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from './BrandLogo';
import { ThemeToggle } from './ThemeToggle';
import { UserAvatar } from './ui/Primitives';
import { markAllNotificationsRead, markNotificationRead } from '../services/activityService';
import { formatDateTime } from '../utils/formatters';

export interface NavItem {
  label: string;
  to: string;
  icon: LucideIcon;
  badge?: number;
}

interface DashboardLayoutProps {
  portalName: string;
  navItems: NavItem[];
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  portalName,
  navItems,
  children,
}) => {
  const { userRecord, notifications, unreadCount, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentNav =
    navItems.find((item) => item.to === location.pathname) ||
    navItems.find((item) => item.to !== '/' && location.pathname.startsWith(item.to + '/')) ||
    navItems[0];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const notificationsPage =
    userRecord?.role === 'admin'
      ? '/admin/notifications'
      : userRecord?.role === 'company'
      ? '/recruiter/notifications'
      : '/student/notifications';

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[var(--bg-secondary)] border-r border-[var(--border-color)] text-[var(--text-primary)]">
      <div className="h-16 px-5 flex items-center justify-between border-b border-[var(--border-color)]">
        <Link to="/" aria-label="Udaan home">
          <BrandLogo size="md" />
        </Link>
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-5 py-3 border-b border-[var(--border-color)]">
        <p className="text-[11px] font-medium tracking-wide uppercase text-[var(--text-muted)]">
          {portalName}
        </p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isExactRoot =
            item.to === '/student' || item.to === '/recruiter' || item.to === '/admin';
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={isExactRoot}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-[var(--action-bg)] text-[var(--action-text)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="flex items-center gap-3 min-w-0">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span
                      className={`font-mono tabular-nums text-[11px] px-1.5 py-0.5 rounded-md ${
                        isActive
                          ? 'bg-[var(--action-text)]/15 text-[var(--action-text)]'
                          : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-color)]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[var(--border-color)]">
        <div className="flex items-center gap-3 mb-3">
          <UserAvatar name={userRecord?.fullName} photoURL={userRecord?.photoURL} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[var(--text-primary)] truncate">
              {userRecord?.fullName}
            </p>
            <p className="text-xs text-[var(--text-muted)] truncate">{userRecord?.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium mono-btn-secondary"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-68 max-w-[82vw] h-full">{sidebarContent}</div>
          <div
            className="flex-1 bg-[var(--overlay-backdrop)]"
            onClick={() => setSidebarOpen(false)}
          />
        </div>
      )}

      {/* Main Column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 bg-[var(--bg-primary)]/90 backdrop-blur-md border-b border-[var(--border-color)] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Open navigation"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-[var(--text-primary)] rounded-[10px] hover:bg-[var(--bg-elevated)]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-[var(--text-muted)] hidden sm:inline truncate">
                {portalName}
              </span>
              <span className="text-[var(--border-color)] hidden sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="font-semibold text-[var(--text-primary)] truncate">
                {currentNav?.label || 'Overview'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <ThemeToggle />

            {/* Notification Dropdown */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                aria-label="Notifications"
                onClick={() => setNotifOpen((prev) => !prev)}
                className="relative w-9 h-9 flex items-center justify-center rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors duration-150"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--action-bg)] text-[var(--action-text)] text-[10px] font-mono tabular-nums font-semibold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 mono-card udaan-fade-in shadow-[var(--shadow-elevated)] overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-[var(--border-color)] flex items-center justify-between">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                      Notifications ({unreadCount} unread)
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => void markAllNotificationsRead(notifications)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-[var(--border-color)]">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[var(--text-muted)]">
                        No notifications yet. Activity updates will appear here.
                      </div>
                    ) : (
                      notifications.slice(0, 6).map((item) => (
                        <button
                          key={item.notificationId}
                          type="button"
                          onClick={async () => {
                            if (!item.read) {
                              await markNotificationRead(item.notificationId);
                            }
                            setNotifOpen(false);
                            if (item.targetRoute) navigate(item.targetRoute);
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-[var(--bg-elevated)] transition-colors ${
                            !item.read ? 'bg-[var(--bg-secondary)]' : 'bg-[var(--bg-card)]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-semibold text-[var(--text-primary)]">
                              {item.title}
                            </p>
                            {!item.read && (
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-primary)] shrink-0">
                                New
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-[var(--text-secondary)] line-clamp-2">
                            {item.message}
                          </p>
                          <p className="mt-1.5 text-[11px] text-[var(--text-muted)] font-mono tabular-nums">
                            {formatDateTime(item.createdAt)}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="px-4 py-2.5 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] text-center">
                    <Link
                      to={notificationsPage}
                      onClick={() => setNotifOpen(false)}
                      className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      View all notifications
                    </Link>
                  </div>
                </div>
              )}
            </div>

            <Link
              to="/explore"
              className="hidden sm:inline-flex items-center px-3 py-1.5 text-xs font-medium mono-btn-secondary whitespace-nowrap"
            >
              Browse Board
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1320px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
