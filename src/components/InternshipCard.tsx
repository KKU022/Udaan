import React from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, ArrowUpRight } from 'lucide-react';
import type { InternshipRecord } from '../types';
import { formatDate, getInitials, isDeadlinePassed } from '../utils/formatters';

interface InternshipCardProps {
  internship: InternshipRecord;
  isSaved?: boolean;
  hasApplied?: boolean;
  onToggleSave?: (internship: InternshipRecord) => void;
  detailBasePath?: string;
}

export const InternshipCard: React.FC<InternshipCardProps> = ({
  internship,
  isSaved = false,
  hasApplied = false,
  onToggleSave,
  detailBasePath = '/internships',
}) => {
  const expired = isDeadlinePassed(internship.deadline);

  return (
    <article className="mono-card p-5 hover:border-[var(--text-muted)] transition-colors duration-150 flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-[10px] bg-[var(--action-bg)] text-[var(--action-text)] text-xs font-semibold flex items-center justify-center shrink-0 tracking-tight">
              {getInitials(internship.companyName)}
            </div>
            <div className="min-w-0">
              <Link
                to={`${detailBasePath}/${internship.internshipId}`}
                className="text-base font-semibold text-[var(--text-primary)] hover:underline underline-offset-4 transition-colors block truncate"
              >
                {internship.title}
              </Link>
              <p className="mt-0.5 text-sm text-[var(--text-secondary)] truncate">
                {internship.companyName}
              </p>
            </div>
          </div>

          {onToggleSave && (
            <button
              type="button"
              aria-label={isSaved ? 'Remove bookmark' : 'Save internship'}
              onClick={() => onToggleSave(internship)}
              className={`p-2 rounded-[10px] border transition-colors duration-150 shrink-0 ${
                isSaved
                  ? 'border-[var(--action-bg)] bg-[var(--action-bg)] text-[var(--action-text)]'
                  : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
              }`}
            >
              <Bookmark className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>

        {/* Clean unboxed metadata row */}
        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--text-secondary)]">
          <span>{internship.location}</span>
          <span aria-hidden="true">·</span>
          <span>{internship.workMode}</span>
          <span aria-hidden="true">·</span>
          <span>{internship.duration}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums font-medium text-[var(--text-primary)]">
            {internship.stipendDisplay}
          </span>
        </div>

        <p className="mt-3 text-sm text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
          {internship.description}
        </p>

        {internship.skills && internship.skills.length > 0 && (
          <p className="mt-3 text-xs text-[var(--text-muted)] truncate">
            <span className="font-medium text-[var(--text-primary)]">Skills:</span>{' '}
            {internship.skills.slice(0, 5).join(' · ')}
            {internship.skills.length > 5 ? ` +${internship.skills.length - 5}` : ''}
          </p>
        )}
      </div>

      <div className="mt-5 pt-4 border-t border-[var(--border-color)] flex items-center justify-between gap-3">
        <div className="text-xs text-[var(--text-muted)] font-mono tabular-nums">
          <span>Deadline {formatDate(internship.deadline)}</span>
          {internship.minCgpa ? <span> · Min CGPA {internship.minCgpa}</span> : null}
        </div>

        <Link
          to={`${detailBasePath}/${internship.internshipId}`}
          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
            hasApplied || expired ? 'mono-btn-secondary' : 'mono-btn-primary'
          }`}
        >
          {hasApplied ? 'Applied' : expired ? 'View Details' : 'Apply Now'}
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </article>
  );
};
