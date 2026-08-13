import type { ReactNode } from 'react';
export function Skeleton({ className = '' }: { readonly className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800 ${className}`}
    />
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  readonly title: string;
  readonly description: string;
  readonly action?: ReactNode;
}) {
  return (
    <section className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-border p-8 text-center dark:border-slate-700">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-300">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </section>
  );
}
export function ErrorState({
  title,
  description,
  retry,
}: {
  readonly title: string;
  readonly description: string;
  readonly retry?: () => void;
}) {
  return (
    <section
      role="alert"
      className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900 dark:border-red-950 dark:bg-red-950 dark:text-red-100"
    >
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-1 text-sm">{description}</p>
      {retry ? (
        <button className="mt-4 text-sm font-semibold underline" type="button" onClick={retry}>
          Try again
        </button>
      ) : null}
    </section>
  );
}
