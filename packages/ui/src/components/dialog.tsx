import { useEffect, useId, useRef, type PropsWithChildren, type ReactNode } from 'react';
export interface DialogProps extends PropsWithChildren {
  readonly isOpen: boolean;
  readonly title: string;
  readonly onClose: () => void;
  readonly footer?: ReactNode;
}
export function Dialog({ children, footer, isOpen, onClose, title }: DialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!isOpen) return undefined;
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [
        ...dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      ];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center overflow-x-hidden bg-slate-950/45 p-2 sm:p-4"
      role="dialog"
      aria-labelledby={titleId}
    >
      <button
        aria-label="Close dialog"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        tabIndex={-1}
        type="button"
      />
      <section
        className="relative flex max-h-[calc(100dvh-2rem)] min-w-0 w-full max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl dark:border-slate-800 dark:bg-dark-surface sm:max-w-lg"
        data-testid="dialog-panel"
        ref={dialogRef}
      >
        <header className="flex min-w-0 shrink-0 items-start justify-between gap-4 border-b border-border px-4 py-4 dark:border-slate-800 sm:px-6 sm:py-5">
          <h2 className="min-w-0 break-words text-lg font-semibold" id={titleId}>
            {title}
          </h2>
          <button
            aria-label="Close dialog"
            className="text-slate-500 hover:text-slate-900 dark:hover:text-white"
            onClick={onClose}
            ref={closeRef}
            type="button"
          >
            ×
          </button>
        </header>
        <div
          className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4 sm:px-6"
          data-testid="dialog-scroll-region"
        >
          {children}
        </div>
        {footer ? (
          <footer className="flex max-w-full shrink-0 flex-col-reverse gap-3 border-t border-border px-4 py-4 dark:border-slate-800 sm:flex-row sm:justify-end sm:px-6 [&>*]:w-full sm:[&>*]:w-auto">
            {footer}
          </footer>
        ) : null}
      </section>
    </div>
  );
}
