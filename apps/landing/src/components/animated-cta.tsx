import { buttonClassName } from '@qr/ui';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import type { MouseEvent } from 'react';
import { Link } from 'react-router-dom';

interface AnimatedCtaProps {
  readonly to: string;
  readonly children: string;
  readonly variant?: 'primary' | 'secondary' | 'glass' | 'gradient';
  readonly attention?: boolean;
  readonly className?: string;
  readonly disabled?: boolean;
  readonly loading?: boolean;
}

export function AnimatedCta({
  to,
  children,
  variant = 'primary',
  attention = false,
  className,
  disabled = false,
  loading = false,
}: AnimatedCtaProps) {
  const reduceMotion = useReducedMotion();
  const unavailable = disabled || loading;
  const preventUnavailableNavigation = (event: MouseEvent<HTMLAnchorElement>) => {
    if (unavailable) {
      event.preventDefault();
      return;
    }
    if (!to.startsWith('#')) return;
    const destination = document.getElementById(to.slice(1));
    if (!destination) return;
    event.preventDefault();
    destination.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    destination.focus({ preventScroll: true });
  };
  return (
    <motion.span
      className={`premium-cta-wrap ${attention ? 'premium-cta-attention' : ''}`}
      {...(reduceMotion || unavailable
        ? {}
        : { whileHover: { y: -3 }, whileTap: { scale: 0.97, y: 0 } })}
    >
      <Link
        aria-disabled={unavailable}
        aria-label={loading ? `${children}, loading` : undefined}
        className={buttonClassName(
          variant,
          `premium-cta premium-cta-${variant} group ${className ?? ''}`,
        )}
        onClick={preventUnavailableNavigation}
        tabIndex={unavailable ? -1 : undefined}
        to={to}
      >
        <span>{loading ? 'Loading…' : children}</span>
        {loading ? (
          <LoaderCircle aria-hidden="true" className="premium-cta-spinner" size={17} />
        ) : (
          <ArrowRight aria-hidden="true" className="premium-cta-arrow" size={17} />
        )}
        <i aria-hidden="true" />
      </Link>
    </motion.span>
  );
}
