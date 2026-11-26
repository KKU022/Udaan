import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Code2,
  ExternalLink,
  GitBranch,
  Globe,
  Instagram,
  Link2,
  Linkedin,
  Mail,
  Phone,
  RefreshCw,
  Star,
  Terminal,
  Twitter,
} from 'lucide-react';
import {
  extractGitHubUsername,
  fetchPublicGitHubProfile,
  type GitHubFetchResult,
} from '../services/githubService';
import type { StudentSocialLinks } from '../types';

export function isValidHttpUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const u = new URL(value.trim());
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

interface GitHubLiveCardProps {
  githubUrl?: string;
  compact?: boolean;
}

export const GitHubLivePreview: React.FC<GitHubLiveCardProps> = ({
  githubUrl,
  compact = false,
}) => {
  const [result, setResult] = useState<GitHubFetchResult | null>(null);
  const [loading, setLoading] = useState(false);

  const username = extractGitHubUsername(githubUrl);

  const loadProfile = async (url: string) => {
    setLoading(true);
    const data = await fetchPublicGitHubProfile(url);
    setResult(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!githubUrl || !username) {
      setResult(null);
      return;
    }
    void loadProfile(githubUrl);
  }, [githubUrl, username]);

  if (!githubUrl || !username) return null;

  return (
    <div className="mono-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {result?.user?.avatar_url ? (
            <img
              src={result.user.avatar_url}
              alt={result.user.login}
              className="w-10 h-10 rounded-[10px] border border-[var(--border-color)] object-cover shrink-0 grayscale"
            />
          ) : (
            <div className="w-10 h-10 rounded-[10px] bg-[var(--action-bg)] text-[var(--action-text)] flex items-center justify-center shrink-0">
              <GitBranch className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">
                GitHub · @{result?.user?.login || username}
              </p>
              {result?.status === 'ok' && (
                <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                  Public API synced
                </span>
              )}
            </div>
            {result?.user && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5 font-mono tabular-nums">
                {result.user.public_repos} public repositories · {result.user.followers} followers
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void loadProfile(githubUrl)}
            disabled={loading}
            className="p-1.5 rounded-[8px] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] disabled:opacity-50 transition-colors"
            title="Refresh public GitHub data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium mono-btn-secondary px-2.5 py-1.5"
          >
            Open GitHub <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {loading && !result && (
        <p className="text-xs text-[var(--text-muted)] mt-3">
          Loading public repositories from GitHub...
        </p>
      )}

      {result && result.status !== 'ok' && (
        <div className="mt-3 flex items-start gap-2 rounded-[10px] bg-[var(--bg-secondary)] border border-[var(--border-color)] px-3 py-2 text-xs text-[var(--text-secondary)]">
          <AlertCircle className="w-3.5 h-3.5 text-[var(--text-primary)] shrink-0 mt-0.5" />
          <span>{result.message}</span>
        </div>
      )}

      {result?.status === 'ok' && result.repos.length > 0 && (
        <div className={`mt-4 grid gap-2.5 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {result.repos.slice(0, compact ? 3 : 6).map((repo) => (
            <a
              key={repo.id}
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-elevated)] hover:border-[var(--text-muted)] p-3 transition-colors"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[var(--text-primary)] group-hover:underline truncate">
                  {repo.name}
                </p>
                <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-secondary)] font-mono tabular-nums shrink-0">
                  <Star className="w-3 h-3 text-[var(--text-muted)]" />
                  {repo.stargazers_count}
                </span>
              </div>
              {repo.description && (
                <p className="text-[11px] text-[var(--text-secondary)] mt-1 line-clamp-2 leading-relaxed">
                  {repo.description}
                </p>
              )}
              <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                {repo.language && (
                  <span className="font-medium text-[var(--text-primary)]">{repo.language}</span>
                )}
                {repo.language && <span>·</span>}
                <span>Public repository</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

interface StudentConnectedAccountsProps {
  mode: 'student';
  links: StudentSocialLinks;
  editable?: boolean;
  onChange?: (next: StudentSocialLinks) => void;
  showGitHubRepos?: boolean;
  compact?: boolean;
}

interface CompanyConnectedAccountsProps {
  mode: 'company';
  links: {
    website?: string;
    linkedinUrl?: string;
    githubUrl?: string;
    twitterUrl?: string;
    instagramUrl?: string;
  };
  editable?: boolean;
  onChange?: (next: CompanyConnectedAccountsProps['links']) => void;
}

interface AdminConnectedAccountsProps {
  mode: 'admin';
  links: {
    institutionWebsite?: string;
    institutionLinkedin?: string;
    contactEmail?: string;
    contactPhone?: string;
  };
  editable?: boolean;
  onChange?: (next: AdminConnectedAccountsProps['links']) => void;
}

type ConnectedAccountsSectionProps =
  | StudentConnectedAccountsProps
  | CompanyConnectedAccountsProps
  | AdminConnectedAccountsProps;

interface AccountFieldDef {
  key: string;
  label: string;
  placeholder: string;
  helper?: string;
  type: 'url' | 'email' | 'tel';
  icon: React.ReactNode;
}

const STUDENT_FIELDS: AccountFieldDef[] = [
  {
    key: 'github',
    label: 'GitHub',
    placeholder: 'https://github.com/username',
    helper: 'Fetches public repositories via GitHub API',
    type: 'url',
    icon: <GitBranch className="w-4 h-4" />,
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    placeholder: 'https://linkedin.com/in/username',
    helper: 'External verified profile URL',
    type: 'url',
    icon: <Linkedin className="w-4 h-4" />,
  },
  {
    key: 'portfolio',
    label: 'Portfolio Website',
    placeholder: 'https://yourportfolio.dev',
    type: 'url',
    icon: <Globe className="w-4 h-4" />,
  },
  {
    key: 'personalWebsite',
    label: 'Personal Website',
    placeholder: 'https://yourdomain.com',
    type: 'url',
    icon: <Link2 className="w-4 h-4" />,
  },
  {
    key: 'leetcode',
    label: 'LeetCode',
    placeholder: 'https://leetcode.com/u/username',
    type: 'url',
    icon: <Code2 className="w-4 h-4" />,
  },
  {
    key: 'hackerrank',
    label: 'HackerRank',
    placeholder: 'https://www.hackerrank.com/profile/username',
    type: 'url',
    icon: <Terminal className="w-4 h-4" />,
  },
  {
    key: 'codechef',
    label: 'CodeChef',
    placeholder: 'https://www.codechef.com/users/username',
    type: 'url',
    icon: <Code2 className="w-4 h-4" />,
  },
  {
    key: 'gfg',
    label: 'GeeksforGeeks',
    placeholder: 'https://www.geeksforgeeks.org/user/username',
    type: 'url',
    icon: <Terminal className="w-4 h-4" />,
  },
];

const COMPANY_FIELDS: AccountFieldDef[] = [
  {
    key: 'website',
    label: 'Official Website',
    placeholder: 'https://company.com',
    type: 'url',
    icon: <Globe className="w-4 h-4" />,
  },
  {
    key: 'linkedinUrl',
    label: 'LinkedIn Company Page',
    placeholder: 'https://linkedin.com/company/your-company',
    type: 'url',
    icon: <Linkedin className="w-4 h-4" />,
  },
  {
    key: 'githubUrl',
    label: 'GitHub Organization',
    placeholder: 'https://github.com/your-org',
    type: 'url',
    icon: <GitBranch className="w-4 h-4" />,
  },
  {
    key: 'twitterUrl',
    label: 'X / Twitter',
    placeholder: 'https://x.com/company',
    type: 'url',
    icon: <Twitter className="w-4 h-4" />,
  },
  {
    key: 'instagramUrl',
    label: 'Instagram',
    placeholder: 'https://instagram.com/company',
    type: 'url',
    icon: <Instagram className="w-4 h-4" />,
  },
];

const ADMIN_FIELDS: AccountFieldDef[] = [
  {
    key: 'institutionWebsite',
    label: 'Official Institution Website',
    placeholder: 'https://university.edu',
    type: 'url',
    icon: <Globe className="w-4 h-4" />,
  },
  {
    key: 'institutionLinkedin',
    label: 'Institution LinkedIn Page',
    placeholder: 'https://linkedin.com/school/university',
    type: 'url',
    icon: <Linkedin className="w-4 h-4" />,
  },
  {
    key: 'contactEmail',
    label: 'Placement Cell Email',
    placeholder: 'placements@university.edu',
    type: 'email',
    icon: <Mail className="w-4 h-4" />,
  },
  {
    key: 'contactPhone',
    label: 'Placement Cell Phone',
    placeholder: '+91 22 4000 1200',
    type: 'tel',
    icon: <Phone className="w-4 h-4" />,
  },
];

export const ConnectedAccountsSection: React.FC<ConnectedAccountsSectionProps> = (props) => {
  const fields =
    props.mode === 'student'
      ? STUDENT_FIELDS
      : props.mode === 'company'
      ? COMPANY_FIELDS
      : ADMIN_FIELDS;

  const linkMap = props.links as Record<string, string | undefined>;

  const handleFieldChange = (key: string, value: string) => {
    if (!props.editable || !props.onChange) return;
    const next = { ...linkMap, [key]: value };
    (props.onChange as (val: Record<string, string | undefined>) => void)(next);
  };

  // Read-only display mode
  if (!props.editable) {
    const activeFields = fields.filter((f) => Boolean(linkMap[f.key]?.trim()));

    return (
      <div className="space-y-4">
        {activeFields.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">No external accounts connected yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {activeFields.map((field) => {
              const rawVal = (linkMap[field.key] || '').trim();
              const href =
                field.type === 'email'
                  ? `mailto:${rawVal}`
                  : field.type === 'tel'
                  ? `tel:${rawVal}`
                  : rawVal;
              return (
                <a
                  key={field.key}
                  href={href}
                  target={field.type === 'url' ? '_blank' : undefined}
                  rel={field.type === 'url' ? 'noopener noreferrer' : undefined}
                  className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--border-color)] bg-[var(--bg-secondary)] px-3.5 py-2.5 hover:bg-[var(--bg-elevated)] hover:border-[var(--text-muted)] transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[var(--text-secondary)] shrink-0">{field.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--text-primary)]">
                        {field.label}
                      </p>
                      <p className="text-[11px] text-[var(--text-muted)] truncate">{rawVal}</p>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] shrink-0" />
                </a>
              );
            })}
          </div>
        )}

        {props.mode === 'student' && props.showGitHubRepos && linkMap.github && (
          <GitHubLivePreview githubUrl={linkMap.github} compact={props.compact} />
        )}
      </div>
    );
  }

  // Editable management mode
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {fields.map((field) => {
          const val = linkMap[field.key] ?? '';
          const connected = val.trim().length > 0;
          const valid = field.type !== 'url' || isValidHttpUrl(val);

          return (
            <div
              key={field.key}
              className={`rounded-[12px] border p-3.5 transition-colors ${
                !valid
                  ? 'border-[var(--text-primary)] border-dashed bg-[var(--bg-elevated)]'
                  : connected
                  ? 'border-[var(--text-muted)] bg-[var(--bg-card)]'
                  : 'border-[var(--border-color)] bg-[var(--bg-secondary)]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[var(--text-primary)]">{field.icon}</span>
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    {field.label}
                  </span>
                </div>
                {connected && valid ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-primary)]">
                    <CheckCircle2 className="w-3 h-3" /> Connected
                  </span>
                ) : (
                  <span className="text-[11px] text-[var(--text-muted)]">Not linked</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type={field.type === 'url' ? 'url' : field.type}
                  value={val}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full rounded-[8px] border border-[var(--border-color)] px-3 py-1.5 text-xs"
                />
                {connected && valid && field.type === 'url' && (
                  <a
                    href={val.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-[8px] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] shrink-0"
                    title={`Open ${field.label}`}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {!valid ? (
                <p className="text-[11px] text-[var(--text-primary)] font-medium mt-1.5">
                  Enter a valid URL starting with https:// or http://
                </p>
              ) : field.helper ? (
                <p className="text-[11px] text-[var(--text-muted)] mt-1.5">{field.helper}</p>
              ) : null}
            </div>
          );
        })}
      </div>

      {props.mode === 'student' &&
        props.showGitHubRepos &&
        linkMap.github &&
        isValidHttpUrl(linkMap.github) && (
          <GitHubLivePreview githubUrl={linkMap.github} compact={props.compact} />
        )}
    </div>
  );
};
