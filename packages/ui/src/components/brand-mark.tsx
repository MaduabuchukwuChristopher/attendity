import clsx from 'clsx';

export interface BrandMarkProps {
  readonly className?: string;
  readonly inverse?: boolean;
  readonly showName?: boolean;
}

export function BrandMark({ className, inverse = false, showName = true }: BrandMarkProps) {
  return (
    <span className={clsx('inline-flex items-center gap-2.5', className)}>
      <svg aria-hidden="true" className="size-9 shrink-0" fill="none" viewBox="0 0 40 40">
        <rect fill={inverse ? '#FFFFFF' : '#0B6B4F'} height="40" rx="12" width="40" />
        <path
          d="M10.5 17.25 20 11l9.5 6.25L20 23.5l-9.5-6.25Z"
          fill={inverse ? '#0B6B4F' : '#FFFFFF'}
        />
        <path
          d="M14 21.5v5.25c3.85 2.7 8.15 2.7 12 0V21.5"
          stroke={inverse ? '#0B6B4F' : '#FFFFFF'}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.25"
        />
        <path
          d="M29.5 17.5v7"
          stroke={inverse ? '#C99A2E' : '#E5B846'}
          strokeLinecap="round"
          strokeWidth="2"
        />
        <circle cx="29.5" cy="26" fill={inverse ? '#C99A2E' : '#E5B846'} r="1.5" />
      </svg>
      {showName ? (
        <span
          className={clsx('text-lg font-extrabold tracking-[-0.03em]', inverse && 'text-white')}
        >
          Attendity
        </span>
      ) : null}
    </span>
  );
}
