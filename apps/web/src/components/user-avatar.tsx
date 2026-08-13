import { useEffect, useState } from 'react';

interface UserAvatarProps {
  readonly fullName: string;
  readonly photoUrl?: string;
  readonly className?: string;
  readonly imageClassName?: string;
}

function initials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function UserAvatar({
  fullName,
  photoUrl,
  className = '',
  imageClassName = '',
}: UserAvatarProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [photoUrl]);

  return (
    <span
      className={`grid size-9 shrink-0 place-items-center overflow-hidden rounded-xl border border-emerald-300/50 bg-emerald-700 text-xs font-bold text-white dark:border-emerald-500/50 dark:bg-emerald-800 ${className}`}
    >
      {photoUrl && !failed ? (
        <img
          alt={`${fullName} profile photograph`}
          className={`size-full object-cover ${imageClassName}`}
          onError={() => setFailed(true)}
          src={photoUrl}
        />
      ) : (
        <span aria-label={`${fullName} initials`}>{initials(fullName)}</span>
      )}
    </span>
  );
}
