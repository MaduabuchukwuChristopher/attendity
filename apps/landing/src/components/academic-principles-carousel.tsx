import { ChevronLeft, ChevronRight, GraduationCap } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';

const academicPrinciples = [
  {
    quote: 'Attendance is the first visible signal of academic belonging.',
    note: 'A consistent presence creates the conditions for participation, support, and progress.',
  },
  {
    quote: 'Every lecture attended compounds into confidence for the future.',
    note: 'Small acts of academic commitment become stronger learning outcomes over time.',
  },
  {
    quote: 'Reliable records turn student support from reaction into timely action.',
    note: 'Clear insight helps academic teams respond before eligibility or learning is at risk.',
  },
  {
    quote: 'Presence creates the opportunity; participation transforms it into learning.',
    note: 'Showing up is the beginning of the deeper academic work of inquiry and contribution.',
  },
  {
    quote: 'A trusted attendance record protects both the learner and the institution.',
    note: 'Fair evidence gives every academic decision a clear and defensible foundation.',
  },
  {
    quote: 'The future is built in the rooms where curiosity is practised today.',
    note: 'Each class connects present effort to the knowledge, character, and capability ahead.',
  },
  {
    quote: 'Learning gains momentum when students know that their presence matters.',
    note: 'Visible belonging encourages consistency, confidence, and shared responsibility.',
  },
  {
    quote: 'Timely attendance insight is an invitation to support, not merely a statistic.',
    note: 'The strongest institutions use evidence to open conversations before difficulties grow.',
  },
  {
    quote: 'Academic excellence is rarely one grand act; it is a pattern of returning prepared.',
    note: 'Reliable participation turns daily discipline into durable achievement.',
  },
  {
    quote: 'When presence is trusted, every next academic decision becomes clearer.',
    note: 'Secure evidence supports learners, lecturers, examiners, and university leadership alike.',
  },
] as const;

export function AcademicPrinciplesCarousel() {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const [inView, setInView] = useState(false);
  const [paused, setPaused] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const current = academicPrinciples[active] ?? academicPrinciples[0];
  const show = useCallback(
    (index: number) => setActive((index + academicPrinciples.length) % academicPrinciples.length),
    [],
  );

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry?.isIntersecting)),
      { threshold: 0.35 },
    );
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || paused || reduceMotion) return;
    const timer = window.setInterval(() => show(active + 1), 5200);
    return () => window.clearInterval(timer);
  }, [active, inView, paused, reduceMotion, show]);

  return (
    <div
      aria-label="Attendity academic principles"
      className="principles-carousel"
      onBlur={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      ref={rootRef}
      role="region"
    >
      <div className="principles-carousel-stage">
        <span className="principles-carousel-mark" aria-hidden="true">
          <GraduationCap size={23} />
        </span>
        <AnimatePresence mode="wait">
          <motion.figure
            animate={{ opacity: 1, y: 0 }}
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            key={active}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            {...(reduceMotion ? {} : { exit: { opacity: 0, y: -12 } })}
          >
            <blockquote>“{current.quote}”</blockquote>
            <figcaption>
              {current.note}
              <strong>Attendity academic principle</strong>
            </figcaption>
          </motion.figure>
        </AnimatePresence>
      </div>
      <div className="principles-carousel-controls">
        <p aria-live="polite" role="status">
          Quotation {active + 1} of {academicPrinciples.length}
        </p>
        <div className="principles-carousel-dots" aria-label="Choose an academic principle">
          {academicPrinciples.map((principle, index) => (
            <button
              aria-label={`Show quotation ${index + 1}`}
              aria-pressed={active === index}
              key={principle.quote}
              onClick={() => show(index)}
              type="button"
            />
          ))}
        </div>
        <div className="principles-carousel-buttons">
          <button
            aria-label="Previous academic principle"
            onClick={() => show(active - 1)}
            type="button"
          >
            <ChevronLeft size={19} />
          </button>
          <button
            aria-label="Next academic principle"
            onClick={() => show(active + 1)}
            type="button"
          >
            <ChevronRight size={19} />
          </button>
        </div>
      </div>
    </div>
  );
}
