import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { FIREBASE_PROJECT_ID, FIRESTORE_DATABASE_ID } from '../firebase/config';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
  isQuotaError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '', isQuotaError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const raw = error?.message || 'An unexpected error occurred.';
    const isQuotaError = raw.toLowerCase().includes('quota exceeded');
    let friendly = raw;
    try {
      const parsed = JSON.parse(raw) as { error?: string; path?: string };
      if (parsed.error) {
        friendly = parsed.error.includes('insufficient permissions')
          ? `Access restricted for ${parsed.path || 'this record'}. Please verify your account permissions.`
          : parsed.error;
      }
    } catch {
      // Plain error message
    }
    return { hasError: true, message: friendly, isQuotaError };
  }

  componentDidCatch(error: Error) {
    console.error('Application ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      const upgradeUrl = `https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/firestore/databases/${FIRESTORE_DATABASE_ID}/data?openUpgradeDialog=true`;
      return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center p-6">
          <div className="max-w-lg w-full mono-card p-8">
            <div className="flex items-center gap-3 text-[var(--text-primary)] mb-4">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h2 className="text-lg font-semibold">Something went wrong</h2>
            </div>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-6">
              {this.state.message}
            </p>
            {this.state.isQuotaError && (
              <p className="text-xs text-[var(--text-muted)] mb-6 leading-relaxed">
                Your Firestore free-tier daily quota resets tomorrow. You can inspect database usage
                in the{' '}
                <a
                  href={upgradeUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--text-primary)] underline font-medium"
                >
                  Firebase Console
                </a>
                .
              </p>
            )}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false, message: '', isQuotaError: false });
                  window.location.reload();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium mono-btn-primary"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Application
              </button>
              <a href="/" className="px-4 py-2 text-sm font-medium mono-btn-secondary">
                Return Home
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
