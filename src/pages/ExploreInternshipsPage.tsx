import React, { useEffect, useMemo, useState } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { PublicNavbar } from '../components/PublicNavbar';
import { InternshipCard } from '../components/InternshipCard';
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
  PaginationBar,
} from '../components/ui/Primitives';
import { listPublishedInternships } from '../services/internshipService';
import { listSavedInternships, toggleSavedInternship } from '../services/studentService';
import { listStudentApplications } from '../services/applicationService';
import { useAuth } from '../context/AuthContext';
import type { InternshipRecord } from '../types';

const PAGE_SIZE = 9;

interface ExploreInternshipsProps {
  embedded?: boolean;
}

export const ExploreInternshipsPage: React.FC<ExploreInternshipsProps> = ({
  embedded = false,
}) => {
  const { userRecord, studentProfile } = useAuth();
  const [internships, setInternships] = useState<InternshipRecord[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [workMode, setWorkMode] = useState<string>('All');
  const [category, setCategory] = useState<string>('All');
  const [paidFilter, setPaidFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [minStipend, setMinStipend] = useState<number>(0);
  const [locationQuery, setLocationQuery] = useState('');
  const [sortBy, setSortBy] = useState<'latest' | 'deadline' | 'stipend' | 'relevant'>('latest');
  const [page, setPage] = useState(1);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const list = await listPublishedInternships();
      setInternships(list);
      if (userRecord?.role === 'student') {
        const [saved, apps] = await Promise.all([
          listSavedInternships(userRecord.uid),
          listStudentApplications(userRecord.uid),
        ]);
        setSavedIds(new Set(saved.map((s) => s.internshipId)));
        setAppliedIds(new Set(apps.map((a) => a.internshipId)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load internships.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRecord?.uid]);

  const categories = useMemo(() => {
    const set = new Set(internships.map((i) => i.category).filter(Boolean));
    return ['All', ...Array.from(set).sort()];
  }, [internships]);

  const studentSkillSet = useMemo(
    () => new Set((studentProfile?.skills || []).map((s) => s.toLowerCase())),
    [studentProfile?.skills]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const loc = locationQuery.trim().toLowerCase();

    const list = internships.filter((item) => {
      if (workMode !== 'All' && item.workMode !== workMode) return false;
      if (category !== 'All' && item.category !== category) return false;
      if (paidFilter === 'paid' && !item.isPaid) return false;
      if (paidFilter === 'unpaid' && item.isPaid) return false;
      if (minStipend > 0 && item.stipendAmount < minStipend) return false;
      if (loc && !item.location.toLowerCase().includes(loc)) return false;
      if (q) {
        const haystack =
          `${item.title} ${item.companyName} ${item.description} ${(item.skills || []).join(' ')}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'stipend') return b.stipendAmount - a.stipendAmount;
      if (sortBy === 'deadline') return a.deadline.localeCompare(b.deadline);
      if (sortBy === 'relevant' && studentSkillSet.size > 0) {
        const scoreA = (a.skills || []).filter((s) => studentSkillSet.has(s.toLowerCase())).length;
        const scoreB = (b.skills || []).filter((s) => studentSkillSet.has(s.toLowerCase())).length;
        return scoreB - scoreA;
      }
      return 0;
    });
  }, [
    internships,
    search,
    workMode,
    category,
    paidFilter,
    minStipend,
    locationQuery,
    sortBy,
    studentSkillSet,
  ]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleToggleSave = async (internship: InternshipRecord) => {
    if (!userRecord || userRecord.role !== 'student') {
      toast.info('Sign in as a student to bookmark internships.');
      return;
    }
    const currentlySaved = savedIds.has(internship.internshipId);
    try {
      const next = await toggleSavedInternship(userRecord.uid, internship, currentlySaved);
      setSavedIds((prev) => {
        const copy = new Set(prev);
        if (next) copy.add(internship.internshipId);
        else copy.delete(internship.internshipId);
        return copy;
      });
      toast.success(next ? 'Saved to your bookmarks.' : 'Removed from bookmarks.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to update bookmark.');
    }
  };

  const resetFilters = () => {
    setSearch('');
    setWorkMode('All');
    setCategory('All');
    setPaidFilter('all');
    setMinStipend(0);
    setLocationQuery('');
    setSortBy('latest');
    setPage(1);
  };

  const content = (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Explore Internships
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Showing{' '}
            <span className="font-mono tabular-nums font-medium text-[var(--text-primary)]">
              {filtered.length}
            </span>{' '}
            approved opportunities currently open for applications.
          </p>
        </div>
        <button
          type="button"
          onClick={resetFilters}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset filters
        </button>
      </div>

      {/* Filter Bar */}
      <div className="mono-card p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search title, company, or skills (e.g. React, Python)"
              className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
            />
          </div>
          <div className="md:col-span-3">
            <input
              type="text"
              value={locationQuery}
              onChange={(e) => {
                setLocationQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Location (e.g. Bengaluru, Pune)"
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
            />
          </div>
          <div className="md:col-span-2">
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="w-full px-3 py-2 text-sm border border-[var(--border-color)] rounded-[10px]"
            >
              <option value="latest">Sort: Latest</option>
              <option value="deadline">Deadline Approaching</option>
              <option value="stipend">Highest Stipend</option>
              <option value="relevant">Skill Relevance</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-[var(--border-color)] text-xs">
          <div className="flex items-center gap-1 p-1 bg-[var(--bg-secondary)] rounded-[10px] border border-[var(--border-color)]">
            {['All', 'Remote', 'Hybrid', 'On-site'].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setWorkMode(mode);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-[7px] font-medium transition-colors ${
                  workMode === mode
                    ? 'bg-[var(--action-bg)] text-[var(--action-text)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 p-1 bg-[var(--bg-secondary)] rounded-[10px] border border-[var(--border-color)]">
            {[
              { id: 'all', label: 'All Compensation' },
              { id: 'paid', label: 'Paid' },
              { id: 'unpaid', label: 'Unpaid' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setPaidFilter(opt.id as typeof paidFilter);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-[7px] font-medium transition-colors ${
                  paidFilter === opt.id
                    ? 'bg-[var(--action-bg)] text-[var(--action-text)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-[var(--text-secondary)]">
            <span>Min Stipend:</span>
            <select
              value={minStipend}
              onChange={(e) => {
                setMinStipend(Number(e.target.value));
                setPage(1);
              }}
              className="px-2.5 py-1 border border-[var(--border-color)] rounded-[8px] font-mono tabular-nums"
            >
              <option value={0}>Any</option>
              <option value={15000}>₹15,000+</option>
              <option value={25000}>₹25,000+</option>
              <option value={35000}>₹35,000+</option>
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : paginated.length === 0 ? (
        <EmptyState
          title="No matching internships found"
          description="Try broadening your search terms, clearing location filters, or resetting stipend thresholds."
          action={
            <button
              type="button"
              onClick={resetFilters}
              className="px-4 py-2 text-xs font-medium mono-btn-primary"
            >
              Reset All Filters
            </button>
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginated.map((item) => (
              <InternshipCard
                key={item.internshipId}
                internship={item}
                isSaved={savedIds.has(item.internshipId)}
                hasApplied={appliedIds.has(item.internshipId)}
                onToggleSave={userRecord?.role === 'student' ? handleToggleSave : undefined}
                detailBasePath={embedded ? '/student/internships' : '/internships'}
              />
            ))}
          </div>
          <PaginationBar
            page={page}
            totalPages={totalPages}
            totalItems={filtered.length}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );

  if (embedded) return content;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col">
      <PublicNavbar />
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">{content}</main>
    </div>
  );
};
