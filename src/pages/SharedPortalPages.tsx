import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, KeyRound, Moon, Shield, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { EmptyState, StatusLabel } from '../components/ui/Primitives';
import { ConnectedAccountsSection } from '../components/ConnectedAccountsSection';
import { markAllNotificationsRead, markNotificationRead } from '../services/activityService';
import { getSystemSettings, saveSystemSettings } from '../services/adminService';
import { formatDateTime } from '../utils/formatters';

export const NotificationsPage: React.FC = () => {
  const { notifications, unreadCount } = useAuth();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const navigate = useNavigate();

  const visible = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
            Notifications
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Real-time updates across applications, interviews, approvals, and milestones.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex p-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[10px] text-xs">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-[7px] font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-[var(--action-bg)] text-[var(--action-text)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-3 py-1 rounded-[7px] font-medium transition-colors ${
                filter === 'unread'
                  ? 'bg-[var(--action-bg)] text-[var(--action-text)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={async () => {
                await markAllNotificationsRead(notifications);
                toast.success('All notifications marked as read.');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium mono-btn-secondary"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={filter === 'unread' ? 'All caught up' : 'No notifications yet'}
          description="When actions occur across your internship workflow, real-time notifications will appear here."
        />
      ) : (
        <div className="mono-card divide-y divide-[var(--border-color)] overflow-hidden">
          {visible.map((item) => (
            <div
              key={item.notificationId}
              className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                !item.read ? 'bg-[var(--bg-secondary)]' : 'bg-[var(--bg-card)]'
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <Bell
                  className={`w-4 h-4 mt-1 shrink-0 ${
                    !item.read ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'
                  }`}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</p>
                    {!item.read && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-primary)]">
                        Unread
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.message}</p>
                  <p className="mt-1.5 text-xs text-[var(--text-muted)] font-mono tabular-nums">
                    {formatDateTime(item.createdAt)} · {item.type}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!item.read && (
                  <button
                    type="button"
                    onClick={() => void markNotificationRead(item.notificationId)}
                    className="px-3 py-1.5 text-xs font-medium mono-btn-secondary"
                  >
                    Mark Read
                  </button>
                )}
                {item.targetRoute && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!item.read) await markNotificationRead(item.notificationId);
                      navigate(item.targetRoute!);
                    }}
                    className="px-3 py-1.5 text-xs font-medium mono-btn-primary"
                  >
                    Open
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const SettingsPage: React.FC = () => {
  const { userRecord, companyProfile, sendResetEmail } = useAuth();
  const { theme, setTheme } = useTheme();
  const [busy, setBusy] = useState(false);

  const [sysForm, setSysForm] = useState({
    institutionName: 'Medicaps University — Training & Placement Cell',
    academicYear: '2026–2027',
    institutionWebsite: '',
    institutionLinkedin: '',
    contactEmail: '',
    contactPhone: '',
    requireCompanyVerification: true,
    requireInternshipApproval: true,
    maxActiveApplicationsPerStudent: 10,
    allowWithdrawBeforeInterview: true,
  });

  useEffect(() => {
    if (userRecord?.role === 'admin') {
      void getSystemSettings().then((cfg) => {
        if (cfg) {
          setSysForm({
            institutionName: cfg.institutionName,
            academicYear: cfg.academicYear,
            institutionWebsite: cfg.institutionWebsite || '',
            institutionLinkedin: cfg.institutionLinkedin || '',
            contactEmail: cfg.contactEmail || '',
            contactPhone: cfg.contactPhone || '',
            requireCompanyVerification: cfg.requireCompanyVerification,
            requireInternshipApproval: cfg.requireInternshipApproval,
            maxActiveApplicationsPerStudent: cfg.maxActiveApplicationsPerStudent ?? 10,
            allowWithdrawBeforeInterview: cfg.allowWithdrawBeforeInterview ?? true,
          });
        }
      });
    }
  }, [userRecord?.role]);

  const handleSendReset = async () => {
    if (!userRecord?.email) return;
    setBusy(true);
    try {
      await sendResetEmail(userRecord.email);
      toast.success(`Password reset email sent to ${userRecord.email}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to send reset email.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveAdminSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userRecord) return;
    setBusy(true);
    try {
      await saveSystemSettings(userRecord.uid, userRecord.fullName, sysForm);
      toast.success('Institutional policy settings saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
          Account & Portal Settings
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Review your verified identity, theme preference, role permissions, and security options.
        </p>
      </div>

      {/* Appearance Theme Preference */}
      <div className="mono-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">Interface Appearance</p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Switch between monochromatic Dark and Light surfaces. Persisted across sessions.
          </p>
        </div>
        <div className="inline-flex p-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-[10px] self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[8px] transition-colors ${
              theme === 'dark'
                ? 'bg-[var(--action-bg)] text-[var(--action-text)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Moon className="w-3.5 h-3.5" /> Dark
          </button>
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[8px] transition-colors ${
              theme === 'light'
                ? 'bg-[var(--action-bg)] text-[var(--action-text)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Sun className="w-3.5 h-3.5" /> Light
          </button>
        </div>
      </div>

      <div className="mono-card p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <Shield className="w-4 h-4 text-[var(--text-secondary)]" />
          Account Overview
        </div>

        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm pt-3 border-t border-[var(--border-color)]">
          <div>
            <dt className="text-xs text-[var(--text-muted)]">Account Name</dt>
            <dd className="mt-1 font-medium text-[var(--text-primary)]">{userRecord?.fullName}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-muted)]">Verified Email</dt>
            <dd className="mt-1 font-medium text-[var(--text-primary)]">{userRecord?.email}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-muted)]">Role</dt>
            <dd className="mt-1 capitalize font-medium text-[var(--text-primary)]">
              {userRecord?.role}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--text-muted)]">Account Status</dt>
            <dd className="mt-1">
              <StatusLabel status={userRecord?.accountStatus || 'active'} />
            </dd>
          </div>
          {companyProfile && (
            <div>
              <dt className="text-xs text-[var(--text-muted)]">Company Verification</dt>
              <dd className="mt-1">
                <StatusLabel status={companyProfile.verificationStatus} />
              </dd>
            </div>
          )}
        </dl>

        <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Password Management</p>
            <p className="text-xs text-[var(--text-secondary)]">
              Send a secure Firebase password reset link to your email address.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={handleSendReset}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium mono-btn-secondary whitespace-nowrap"
          >
            <KeyRound className="w-3.5 h-3.5" />
            Send Reset Link
          </button>
        </div>
      </div>

      {userRecord?.role === 'admin' && (
        <form onSubmit={handleSaveAdminSettings} className="mono-card p-6 space-y-5">
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Institutional Governance Rules
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Stored in Firestore systemSettings/config and audited in activity logs.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Institution Name
              </label>
              <input
                required
                value={sysForm.institutionName}
                onChange={(e) => setSysForm({ ...sysForm, institutionName: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Academic Year
              </label>
              <input
                required
                value={sysForm.academicYear}
                onChange={(e) => setSysForm({ ...sysForm, academicYear: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px] font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Max Active Applications / Student
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={sysForm.maxActiveApplicationsPerStudent}
                onChange={(e) =>
                  setSysForm({
                    ...sysForm,
                    maxActiveApplicationsPerStudent: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px] font-mono tabular-nums"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[var(--border-color)] space-y-3">
            <div>
              <h4 className="text-sm font-semibold text-[var(--text-primary)]">
                Institutional Accounts & Contacts
              </h4>
              <p className="text-xs text-[var(--text-muted)]">
                Official campus links and placement office contact channels.
              </p>
            </div>
            <ConnectedAccountsSection
              mode="admin"
              links={{
                institutionWebsite: sysForm.institutionWebsite,
                institutionLinkedin: sysForm.institutionLinkedin,
                contactEmail: sysForm.contactEmail,
                contactPhone: sysForm.contactPhone,
              }}
              editable
              onChange={(next) =>
                setSysForm((prev) => ({
                  ...prev,
                  institutionWebsite: next.institutionWebsite ?? '',
                  institutionLinkedin: next.institutionLinkedin ?? '',
                  contactEmail: next.contactEmail ?? '',
                  contactPhone: next.contactPhone ?? '',
                }))
              }
            />
          </div>

          <div className="space-y-3 pt-3 border-t border-[var(--border-color)] text-sm text-[var(--text-secondary)]">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={sysForm.requireCompanyVerification}
                onChange={(e) =>
                  setSysForm({ ...sysForm, requireCompanyVerification: e.target.checked })
                }
              />
              <span>Require administrator verification before companies can post internships</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={sysForm.requireInternshipApproval}
                onChange={(e) =>
                  setSysForm({ ...sysForm, requireInternshipApproval: e.target.checked })
                }
              />
              <span>
                Require administrator approval before internships appear in student discovery
              </span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={sysForm.allowWithdrawBeforeInterview}
                onChange={(e) =>
                  setSysForm({ ...sysForm, allowWithdrawBeforeInterview: e.target.checked })
                }
              />
              <span>Allow students to withdraw active applications prior to final selection</span>
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2 text-sm font-semibold mono-btn-primary disabled:opacity-50"
            >
              {busy ? 'Saving...' : 'Save Policy Settings'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
