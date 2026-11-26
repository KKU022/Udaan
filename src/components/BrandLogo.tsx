import React from 'react';

interface BrandLogoProps {
  theme?: 'auto' | 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  theme = 'auto',
  size = 'md',
  showTagline = false,
}) => {
  const iconDims = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';
  const textSize = size === 'sm' ? 'text-[15px]' : size === 'lg' ? 'text-2xl' : 'text-[17px]';

  // 'auto' inherits theme CSS variables; 'light' = white text for dark surface; 'dark' = black text for light surface
  const wordmarkClass =
    theme === 'light'
      ? 'text-[#FFFFFF]'
      : theme === 'dark'
      ? 'text-[#111111]'
      : 'text-[var(--text-primary)]';

  const taglineClass =
    theme === 'light'
      ? 'text-[#A3A3A3]'
      : theme === 'dark'
      ? 'text-[#525252]'
      : 'text-[var(--text-muted)]';

  const rectFill =
    theme === 'light'
      ? '#FFFFFF'
      : theme === 'dark'
      ? '#111111'
      : 'var(--action-bg)';

  const primaryStroke =
    theme === 'light'
      ? '#090909'
      : theme === 'dark'
      ? '#FFFFFF'
      : 'var(--action-text)';

  const secondaryStroke = '#737373';

  return (
    <span className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0">
      <svg
        viewBox="0 0 36 36"
        className={`${iconDims} shrink-0`}
        aria-hidden="true"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="36" height="36" rx="9" fill={rectFill} />
        <path
          d="M10 24 C14.5 14.5, 20 11.5, 26 12.5"
          stroke={primaryStroke}
          strokeWidth="2.35"
          strokeLinecap="round"
        />
        <path
          d="M11.5 24.5 C17.5 22.5, 22 18.5, 25.5 13.5"
          stroke={secondaryStroke}
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <circle cx="9.5" cy="24" r="2.7" fill={secondaryStroke} />
        <circle cx="26.5" cy="12" r="2.9" fill={primaryStroke} />
      </svg>
      <span className="inline-flex flex-col leading-none">
        <span className={`${textSize} font-semibold tracking-tight ${wordmarkClass}`}>
          Udaan
        </span>
        {showTagline && (
          <span className={`text-[11px] font-medium mt-0.5 ${taglineClass}`}>
            Where ambition takes flight.
          </span>
        )}
      </span>
    </span>
  );
};
