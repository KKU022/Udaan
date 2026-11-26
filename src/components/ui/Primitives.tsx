import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Inbox,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Ban,
} from 'lucide-react';
import type { ApplicationStatus } from '../../types';
import { getInitials } from '../../utils/formatters';

export const StatusLabel: React.FC<{ status: string }> = ({ status }) => {
  const normalized = status.toLowerCase();

  let styleClass =
    'text-[var(--text-secondary)] bg-[var(--bg-elevated)] border-[var(--border-color)]';
  let Icon = Clock;

  if (
    ['selected', 'verified', 'approved', 'published', 'active', 'completed', 'strong hire', 'hire'].includes(
      normalized
    )
  ) {
    styleClass =
      'text-[var(--text-primary)] bg-[var(--bg-elevated)] border-[var(--text-muted)]/50';
    Icon = CheckCircle2;
  } else if (
    [
      'pending',
      'pending_approval',
      'under review',
      'shortlisted',
      'interview scheduled',
      'in progress',
      'rescheduled',
      'scheduled',
      'hold',
    ].includes(normalized)
  ) {
    styleClass =
      'text-[var(--text-secondary)] bg-[var(--bg-secondary)] border-[var(--border-color)]';
    Icon = Clock;
  } else if (
    ['rejected', 'suspended', 'deactivated', 'cancelled', 'no hire', 'incomplete'].includes(normalized)
  ) {
    styleClass =
      'text-[var(--text-primary)] bg-[var(--bg-secondary)] border-[var(--border-color)] border-dashed';
    Icon = XCircle;
  } else if (['withdrawn', 'closed', 'expired', 'draft', 'not started'].includes(normalized)) {
    styleClass =
      'text-[var(--text-muted)] bg-[var(--bg-secondary)] border-[var(--border-subtle)]';
    Icon = Ban;
  }

  const label = status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[11px] font-medium whitespace-nowrap ${styleClass}`}
    >
      <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
};

export const StatCard: React.FC<{
  label: string;
  value: string | number;
  detail?: string;
  accent?: 'default' | 'emerald' | 'amber' | 'navy';
}> = ({ label, value, detail }) => {
  return (
    <div className="mono-card p-5 transition-colors duration-150 hover:border-[var(--text-muted)]">
      <p className="text-xs font-medium text-[var(--text-muted)] truncate">{label}</p>
      <p className="mt-2.5 text-2xl font-semibold tracking-tight font-mono tabular-nums text-[var(--text-primary)]">
        {value}
      </p>
      {detail && <p className="mt-1.5 text-xs text-[var(--text-secondary)] truncate">{detail}</p>}
    </div>
  );
};

export const UserAvatar: React.FC<{
  name?: string;
  photoURL?: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ name, photoURL, size = 'md' }) => {
  const sizeMap = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
  };

  if (photoURL && photoURL.startsWith('http')) {
    return (
      <img
        src={photoURL}
        alt={name || 'User'}
        referrerPolicy="no-referrer"
        className={`${sizeMap[size]} rounded-[10px] object-cover border border-[var(--border-color)] shrink-0`}
      />
    );
  }

  return (
    <div
      aria-label={name || 'User'}
      className={`${sizeMap[size]} rounded-[10px] bg-[var(--action-bg)] text-[var(--action-text)] font-semibold flex items-center justify-center shrink-0 tracking-tight`}
    >
      {getInitials(name)}
    </div>
  );
};

export const EmptyState: React.FC<{
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ title, description, action }) => (
  <div className="mono-card p-10 text-center">
    <div className="w-10 h-10 rounded-[10px] bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-secondary)] flex items-center justify-center mx-auto mb-3.5">
      <Inbox className="w-5 h-5" />
    </div>
    <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
    <p className="mt-1.5 text-sm text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
      {description}
    </p>
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({
  message,
  onRetry,
}) => (
  <div className="mono-card p-8 text-center">
    <AlertCircle className="w-6 h-6 text-[var(--text-primary)] mx-auto mb-3" />
    <h3 className="text-sm font-semibold text-[var(--text-primary)]">Unable to load data</h3>
    <p className="mt-1 text-sm text-[var(--text-secondary)] max-w-md mx-auto">{message}</p>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 px-4 py-2 text-xs font-medium mono-btn-primary"
      >
        Try Again
      </button>
    )}
  </div>
);

export const LoadingSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="space-y-3" aria-busy="true" aria-label="Loading content">
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="h-16 mono-card animate-pulse flex items-center px-5 gap-4"
      >
        <div className="w-9 h-9 rounded-[10px] bg-[var(--bg-elevated)] shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-[var(--bg-elevated)] rounded w-1/3" />
          <div className="h-2.5 bg-[var(--bg-secondary)] rounded w-1/2" />
        </div>
        <div className="h-3 bg-[var(--bg-elevated)] rounded w-20" />
      </div>
    ))}
  </div>
);

const ACTIVE_STEPS: ApplicationStatus[] = [
  'Applied',
  'Under Review',
  'Shortlisted',
  'Interview Scheduled',
  'Selected',
];

export const ApplicationTimeline: React.FC<{ status: ApplicationStatus }> = ({ status }) => {
  if (status === 'Rejected' || status === 'Withdrawn') {
    return (
      <div className="flex flex-wrap items-center gap-3 py-2 text-xs">
        <span className="text-[var(--text-secondary)]">Applied</span>
        <span className="text-[var(--text-muted)]" aria-hidden="true">
          →
        </span>
        <StatusLabel status={status} />
        <span className="text-[var(--text-muted)]">Final outcome recorded</span>
      </div>
    );
  }

  const activeIdx = ACTIVE_STEPS.indexOf(status);

  return (
    <div className="flex flex-wrap items-center gap-y-2 gap-x-2 py-2">
      {ACTIVE_STEPS.map((step, idx) => {
        const done = idx <= activeIdx;
        const current = idx === activeIdx;
        return (
          <React.Fragment key={step}>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-5 h-5 rounded-full text-[11px] font-mono tabular-nums flex items-center justify-center border transition-colors ${
                  done
                    ? 'bg-[var(--action-bg)] text-[var(--action-text)] border-[var(--action-bg)]'
                    : 'bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-color)]'
                }`}
              >
                {idx + 1}
              </span>
              <span
                className={`text-xs whitespace-nowrap ${
                  current
                    ? 'font-semibold text-[var(--text-primary)]'
                    : done
                    ? 'font-medium text-[var(--text-secondary)]'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                {step}
              </span>
            </div>
            {idx < ACTIVE_STEPS.length - 1 && (
              <span
                aria-hidden="true"
                className={`h-px w-5 sm:w-8 ${
                  idx < activeIdx ? 'bg-[var(--text-primary)]' : 'bg-[var(--border-color)]'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-[var(--overlay-backdrop)] backdrop-blur-[2px] flex items-center justify-center p-4"
    >
      <div className="mono-card udaan-fade-in max-w-md w-full p-6 shadow-[var(--shadow-elevated)]">
        <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
        <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">{description}</p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium mono-btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium disabled:opacity-50 ${
              destructive
                ? 'mono-btn-primary border border-[var(--border-color)]'
                : 'mono-btn-primary'
            }`}
          >
            {busy ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export const PaginationBar: React.FC<{
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}> = ({ page, totalPages, totalItems, onPageChange }) => {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)] text-xs text-[var(--text-muted)]">
      <span className="font-mono tabular-nums">
        Page {page} of {totalPages} · {totalItems} records
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 px-3 py-1.5 mono-btn-secondary text-xs disabled:opacity-40"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Previous
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 px-3 py-1.5 mono-btn-secondary text-xs disabled:opacity-40"
        >
          Next
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
