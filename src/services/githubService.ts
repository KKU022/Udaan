export interface GitHubUserSummary {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
}

export interface GitHubRepoSummary {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
}

export interface GitHubFetchResult {
  status: 'ok' | 'rate_limited' | 'not_found' | 'error';
  user?: GitHubUserSummary;
  repos: GitHubRepoSummary[];
  message?: string;
}

const memoryCache = new Map<string, { ts: number; data: GitHubFetchResult }>();
const CACHE_TTL_MS = 10 * 60 * 1000;

export function extractGitHubUsername(urlOrHandle?: string): string | null {
  if (!urlOrHandle) return null;
  const trimmed = urlOrHandle.trim();
  if (!trimmed) return null;

  try {
    const withProtocol = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    if (!parsed.hostname.toLowerCase().includes('github.com')) return null;
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length === 0) return null;
    const candidate = segments[0].replace(/[^a-zA-Z0-9-]/g, '');
    return candidate.length > 0 && candidate.length <= 39 ? candidate : null;
  } catch {
    const clean = trimmed.replace(/^@/, '').trim();
    return /^[a-zA-Z0-9-]{1,39}$/.test(clean) ? clean : null;
  }
}

export async function fetchPublicGitHubProfile(urlOrHandle: string): Promise<GitHubFetchResult> {
  const username = extractGitHubUsername(urlOrHandle);
  if (!username) {
    return { status: 'not_found', repos: [], message: 'Invalid GitHub profile URL.' };
  }

  const cacheKey = username.toLowerCase();
  const cached = memoryCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const headers: HeadersInit = {
      Accept: 'application/vnd.github+json',
    };
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers }),
      fetch(
        `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=6&type=owner`,
        { headers }
      ),
    ]);

    if (userRes.status === 403 || reposRes.status === 403) {
      const result: GitHubFetchResult = {
        status: 'rate_limited',
        repos: [],
        message: 'GitHub public API rate limit reached for this network. Open profile directly on GitHub.',
      };
      memoryCache.set(cacheKey, { ts: Date.now(), data: result });
      return result;
    }

    if (userRes.status === 404) {
      const result: GitHubFetchResult = {
        status: 'not_found',
        repos: [],
        message: `GitHub user "@${username}" was not found.`,
      };
      memoryCache.set(cacheKey, { ts: Date.now(), data: result });
      return result;
    }

    if (!userRes.ok) {
      return {
        status: 'error',
        repos: [],
        message: 'Unable to load public GitHub summary right now.',
      };
    }

    const user = (await userRes.json()) as GitHubUserSummary;
    const repos = reposRes.ok ? ((await reposRes.json()) as GitHubRepoSummary[]) : [];
    const result: GitHubFetchResult = {
      status: 'ok',
      user,
      repos: Array.isArray(repos) ? repos.slice(0, 6) : [],
    };
    memoryCache.set(cacheKey, { ts: Date.now(), data: result });
    return result;
  } catch {
    return {
      status: 'error',
      repos: [],
      message: 'Network unavailable while contacting the public GitHub API.',
    };
  }
}
