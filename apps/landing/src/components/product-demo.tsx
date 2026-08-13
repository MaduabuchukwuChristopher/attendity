import {
  BarChart3,
  BookOpenCheck,
  Check,
  MapPinCheck,
  QrCode,
  ScanFace,
  ScanLine,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

const steps = [
  {
    title: 'Create session',
    description: 'An educator opens a class or event attendance window.',
    icon: BookOpenCheck,
  },
  {
    title: 'Activate dynamic QR',
    description: 'A signed, short-lived credential begins rotating securely.',
    icon: QrCode,
  },
  {
    title: 'Student scans',
    description: 'The mobile experience guides the learner through check-in.',
    icon: ScanLine,
  },
  {
    title: 'Verify presence',
    description: 'Configured GPS and face checks confirm the attendance context.',
    icon: ScanFace,
  },
  {
    title: 'Record attendance',
    description: 'The verified record appears for authorised staff in real time.',
    icon: UserCheck,
  },
  {
    title: 'Update analytics',
    description: 'Attendance trends and operational summaries refresh immediately.',
    icon: BarChart3,
  },
  {
    title: 'Refresh standing',
    description: 'Eligibility or event participation status reflects the new evidence.',
    icon: ShieldCheck,
  },
] as const;

const qrCells = [
  1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1,
  0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0,
  1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0,
  1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1,
  0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1, 1,
  0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1,
  1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1,
  0, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 1, 1, 1,
] as const;

export function ProductDemo() {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = Boolean(entry?.isIntersecting);
        setInView(visible);
        if (visible) setActive(0);
      },
      { threshold: 0.35 },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reduceMotion || paused || !inView) return;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % steps.length), 2600);
    return () => window.clearInterval(timer);
  }, [inView, paused, reduceMotion]);

  const current = steps[active] ?? steps[0];
  const CurrentIcon = current.icon;
  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const nextIndex =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? steps.length - 1
          : event.key === 'ArrowRight' || event.key === 'ArrowDown'
            ? (index + 1) % steps.length
            : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
              ? (index - 1 + steps.length) % steps.length
              : undefined;
    if (nextIndex === undefined) return;
    event.preventDefault();
    setActive(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  };
  return (
    <div
      className="product-demo"
      onBlur={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      ref={rootRef}
    >
      <div className="product-demo-steps" role="tablist" aria-label="Attendity workflow steps">
        {steps.map(({ icon: Icon, title }, index) => (
          <button
            aria-controls="attendity-demo-panel"
            aria-label={`${index + 1}. ${title}`}
            aria-selected={index === active}
            className={index === active ? 'product-demo-step-active' : ''}
            id={`attendity-demo-step-${index}`}
            key={title}
            onClick={() => setActive(index)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            role="tab"
            tabIndex={index === active ? 0 : -1}
            type="button"
          >
            <span>{index + 1}</span>
            <Icon size={17} />
            <strong>{title}</strong>
          </button>
        ))}
      </div>
      <div
        aria-labelledby={`attendity-demo-step-${active}`}
        className="product-demo-panel"
        id="attendity-demo-panel"
        role="tabpanel"
      >
        <div className="demo-session-card">
          <div className="demo-window-bar">
            <span />
            <span />
            <span />
            <small>Illustrative product walkthrough</small>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="demo-current-step"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              key={current.title}
              transition={{ duration: 0.25 }}
              {...(reduceMotion ? {} : { exit: { opacity: 0, y: -10 } })}
            >
              <span className="demo-current-icon">
                <CurrentIcon size={23} />
              </span>
              <p>
                Step {active + 1} of {steps.length}
              </p>
              <h3>{current.title}</h3>
              <span>{current.description}</span>
            </motion.div>
          </AnimatePresence>
          <div className="demo-verification-row">
            <span className={active >= 3 ? 'verified' : ''}>
              <MapPinCheck size={15} /> GPS {active >= 3 ? 'verified' : 'waiting'}
            </span>
            <span className={active >= 3 ? 'verified' : ''}>
              <ScanFace size={15} /> Face {active >= 3 ? 'matched' : 'waiting'}
            </span>
          </div>
        </div>
        <div className="demo-qr-card">
          <div className="demo-qr-grid" aria-label="Animated sample QR credential" role="img">
            {qrCells.slice(0, 225).map((filled, index) => (
              <motion.i
                key={index}
                style={{ opacity: filled ? 1 : 0.08 }}
                transition={{ delay: (index % 10) * 0.025, duration: 1.4, repeat: Infinity }}
                {...(reduceMotion || active < 1
                  ? {}
                  : { animate: { opacity: filled ? [0.65, 1, 0.65] : 0.08 } })}
              />
            ))}
          </div>
          <p>Dynamic credential</p>
          <strong>{active >= 1 ? 'Active · refreshes securely' : 'Waiting for session'}</strong>
        </div>
        <div className="demo-live-card">
          <div className="flex items-center justify-between">
            <div>
              <p>Live attendance</p>
              <strong>{active >= 4 ? 'Record received' : 'Awaiting check-in'}</strong>
            </div>
            <span className={active >= 4 ? 'demo-live-dot active' : 'demo-live-dot'} />
          </div>
          <div className="demo-student-row">
            <span>AO</span>
            <div>
              <strong>Amara Okafor</strong>
              <small>{active >= 4 ? 'Present · verified now' : 'Not checked in'}</small>
            </div>
            {active >= 4 ? <Check className="text-primary" size={17} /> : null}
          </div>
          <div className="demo-metric-row">
            <div>
              <span>Preview rate</span>
              <strong>{active >= 5 ? '84%' : '—'}</strong>
            </div>
            <div>
              <span>Standing</span>
              <strong>{active >= 6 ? 'On track' : 'Updating'}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
