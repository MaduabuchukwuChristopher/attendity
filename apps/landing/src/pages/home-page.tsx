import { BrandMark, buttonClassName, Card } from '@qr/ui';
import {
  ArrowRight,
  BarChart3,
  BellRing,
  BookOpenCheck,
  Building2,
  CalendarCheck,
  Check,
  FileCheck2,
  Fingerprint,
  Globe2,
  GraduationCap,
  MapPinCheck,
  Megaphone,
  Printer,
  QrCode,
  ScanFace,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { AnimatedCta } from '../components/animated-cta.js';
import { AcademicPrinciplesCarousel } from '../components/academic-principles-carousel.js';
import { CountryTrustStatement } from '../components/country-trust-statement.js';
import { DashboardPreview } from '../components/dashboard-preview.js';
import { MobileAppPreview } from '../components/mobile-app-preview.js';
import { ProductDemo } from '../components/product-demo.js';
import { Reveal } from '../components/reveal.js';
import { features } from '../constants/content.js';
import { LandingLayout } from '../layouts/landing-layout.js';

const featureIcons = [
  QrCode,
  MapPinCheck,
  BarChart3,
  BookOpenCheck,
  Sparkles,
  ShieldCheck,
] as const;

const institutionTypes = [
  ['University', 'Faculty · Department · Lecturer · Course'],
  ['Polytechnic', 'School · Department · Lecturer · Course'],
  ['Technical college', 'Division · Instructor · Trade or programme'],
  ['Institute', 'Division · Facilitator · Programme'],
  ['Health sciences school', 'School · Department · Lecturer · Course'],
  ['Academy or training centre', 'Configurable units, roles, and learning terms'],
] as const;

const useScenarios = [
  {
    title: 'A multi-campus institution',
    body: 'Management compares attendance across campuses while each academic unit retains the correct operational scope.',
    icon: Building2,
  },
  {
    title: 'A practical training programme',
    body: 'Instructors combine secure QR, location assurance, and configurable terminology for hands-on sessions.',
    icon: UsersRound,
  },
  {
    title: 'A mandatory orientation event',
    body: 'Organisers target the right learners, send reminders, verify attendance, and review participation evidence.',
    icon: CalendarCheck,
  },
] as const;

const evidenceCapabilities: ReadonlyArray<readonly [LucideIcon, string, string]> = [
  [
    FileCheck2,
    'Exam eligibility',
    'Apply configured attendance policy and show a clear, explainable standing.',
  ],
  [
    Printer,
    'Reports and printing',
    'Produce branded PDF, Excel, CSV, and print-ready evidence with metadata.',
  ],
  [
    QrCode,
    'Server-side QR verification',
    'Verify clearance against the live record rather than trusting a printed page.',
  ],
  [
    BarChart3,
    'Management analytics',
    'Compare permitted units, trends, arrival patterns, and verification outcomes.',
  ],
  [
    Megaphone,
    'Announcements',
    'Publish targeted, scheduled institutional communication with read tracking.',
  ],
  [
    ShieldCheck,
    'Audit-ready operations',
    'Preserve sensitive administrative actions in a complete tenant-scoped trail.',
  ],
];

const faqs = [
  [
    'Can Attendity serve institutions outside universities?',
    'Yes. Institution type, academic terminology, location, time zone, and policy defaults are configurable for post-secondary institutions worldwide.',
  ],
  [
    'Does country personalization track precise location?',
    'No. The public site uses approximate country detection only. It does not display or use city, street, coordinates, or precise location.',
  ],
  [
    'Can an institution choose its verification methods?',
    'Yes. Authorised policy can combine dynamic QR, GPS, face verification, manual attendance, or secure PIN where supported.',
  ],
  [
    'Are preview numbers presented as real customer data?',
    'No. Product mockups and walkthrough values are clearly illustrative and are not customer, adoption, or endorsement claims.',
  ],
] as const;

export function HomePage() {
  const reduceMotion = useReducedMotion();
  return (
    <LandingLayout>
      <main className="landing-page-enter">
        <section className="hero-section">
          <div className="hero-grid" aria-hidden="true" />
          <div className="mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-14 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:pb-28 lg:pt-20">
            <motion.div
              animate={reduceMotion ? false : { x: 0 }}
              initial={reduceMotion ? false : { x: -24 }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="eyebrow-pill">
                <Globe2 size={16} /> Built for higher learning worldwide
              </div>
              <h1 className="mt-7 max-w-2xl text-5xl font-extrabold leading-[1.02] tracking-[-0.055em] sm:text-6xl xl:text-7xl">
                Every class.
                <br />
                Every learner.
                <br />
                <span className="text-primary">One trusted record.</span>
              </h1>
              <CountryTrustStatement />
              <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">
                Attendity connects secure attendance, academic engagement, events, insight, and
                examination clearance in one beautifully focused platform for post-secondary
                education.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <AnimatedCta attention to="/contact">
                  Book a Demo
                </AnimatedCta>
                <AnimatedCta to="#product-demo" variant="secondary">
                  Explore Attendity
                </AnimatedCta>
              </div>
              <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-semibold text-slate-600">
                {['Tenant-secure', 'Mobile ready', 'Built for academic policy'].map((item) => (
                  <span className="flex items-center gap-2" key={item}>
                    <span className="grid size-5 place-items-center rounded-full bg-emerald-100 text-primary">
                      <Check size={12} strokeWidth={3} />
                    </span>
                    {item}
                  </span>
                ))}
              </div>
            </motion.div>
            <motion.div
              animate={reduceMotion ? false : { opacity: 1, scale: 1, x: 0 }}
              className="hero-visual"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.96, x: 20 }}
              transition={{ delay: 0.1, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="hero-photo-main">
                <img
                  alt="University students walking together across a contemporary campus"
                  fetchPriority="high"
                  height="1067"
                  src="/images/attendity-campus-premium.png"
                  width="1600"
                />
                <div className="hero-photo-label">
                  <span className="grid size-9 place-items-center rounded-xl bg-white text-primary">
                    <GraduationCap size={19} />
                  </span>
                  <div>
                    <strong>Designed for learning</strong>
                    <small>From classroom to examination hall</small>
                  </div>
                </div>
              </div>
              <motion.div
                animate={reduceMotion ? false : { y: [0, -8, 0] }}
                className="hero-photo-secondary"
                transition={{ duration: 5, ease: 'easeInOut', repeat: Infinity }}
              >
                <img
                  alt="University students collaborating in an active-learning seminar"
                  height="960"
                  loading="lazy"
                  src="/images/attendity-learning-premium.png"
                  width="1440"
                />
              </motion.div>
              <motion.div
                animate={reduceMotion ? false : { rotate: [0, 2, 0], y: [0, 5, 0] }}
                className="hero-proof-card"
                transition={{ duration: 4, repeat: Infinity }}
              >
                <span className="hero-proof-icon">
                  <Fingerprint size={20} />
                </span>
                <div>
                  <strong>Attendance verified</strong>
                  <small>CSC 412 · illustrative preview</small>
                </div>
              </motion.div>
              <div className="hero-mini-dashboard" aria-label="Attendity dashboard preview">
                <div>
                  <span />
                  <span />
                  <span />
                </div>
                <strong>Live overview</strong>
                <p>
                  <i style={{ height: '52%' }} />
                  <i style={{ height: '74%' }} />
                  <i style={{ height: '63%' }} />
                  <i style={{ height: '88%' }} />
                </p>
              </div>
              <div className="hero-mini-mobile" aria-label="Attendity mobile app preview">
                <span>
                  <QrCode size={17} />
                </span>
                <strong>Scan ready</strong>
              </div>
              <div className="hero-accent-block" aria-hidden="true">
                <BrandMark inverse showName={false} />
              </div>
            </motion.div>
          </div>
        </section>

        <section className="institution-strip" aria-label="Illustrative product capabilities">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-5 sm:grid-cols-4">
            {[
              ['30–60 sec', 'Configurable QR rotation'],
              ['QR + GPS + face', 'Layered verification'],
              ['4 workspaces', 'Role-aware experience'],
              ['WCAG 2.2 AA', 'Accessibility target'],
            ].map(([value, label]) => (
              <div className="institution-stat" key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-24 sm:py-28">
          <Reveal className="section-heading-row">
            <div>
              <p className="section-kicker">One platform, many academic traditions</p>
              <h2 className="section-title">Terminology that respects each institution.</h2>
            </div>
            <p className="section-intro">
              Attendity adapts labels and onboarding copy while preserving one stable, secure
              attendance architecture underneath.
            </p>
          </Reveal>
          <div className="institution-coverage-grid">
            {institutionTypes.map(([title, detail], index) => (
              <Reveal delay={index * 0.04} key={title}>
                <article className="institution-type-card">
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <h3>{title}</h3>
                  <p>{detail}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="mobile-pocket-section">
          <div className="mx-auto grid max-w-7xl gap-14 px-5 py-24 lg:grid-cols-2 lg:items-center sm:py-28">
            <Reveal className="order-2 lg:order-1">
              <div className="mobile-pocket-visual">
                <img
                  alt="A university student using her phone as she enters a lecture theatre"
                  className="mobile-pocket-photo"
                  height="1024"
                  loading="lazy"
                  src="/images/attendity-mobile-attendance-premium.png"
                  width="1536"
                />
                <MobileAppPreview />
              </div>
            </Reveal>
            <Reveal className="order-1 lg:order-2">
              <p className="section-kicker">Attendity in every pocket</p>
              <h2 className="section-title section-title-flash">
                A student experience made for motion.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                Learners check in, view schedules and events, follow attendance progress, and
                understand academic standing from a responsive progressive web app.
              </p>
              <div className="mt-8 space-y-5">
                {[
                  ['Fast at the classroom door', 'Guided QR scanning keeps arrival simple.'],
                  [
                    'Transparent to every learner',
                    'History and eligibility remain understandable.',
                  ],
                  ['Ready beyond one device', 'Installable PWA support keeps essentials close.'],
                ].map(([title, text], index) => (
                  <div className="mobile-benefit" key={title}>
                    <span>0{index + 1}</span>
                    <div>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-9">
                <AnimatedCta to="/solutions" variant="secondary">
                  Explore Mobile Attendity
                </AnimatedCta>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="product-demo-section" id="product-demo" tabIndex={-1}>
          <div className="mx-auto max-w-7xl px-5 py-24 sm:py-28">
            <Reveal className="mx-auto max-w-3xl text-center">
              <p className="section-kicker section-kicker-light section-kicker-featured">
                See how Attendity works
              </p>
              <h2 className="product-demo-title">
                From session creation to trusted insight—in real time.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                An illustrative, interactive walkthrough of the shared class and event attendance
                workflow.
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <ProductDemo />
            </Reveal>
            <div className="mt-10 flex justify-center">
              <AnimatedCta to="/features" variant="secondary">
                See How It Works
              </AnimatedCta>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-24 sm:py-28">
          <Reveal className="section-heading-row">
            <div>
              <p className="section-kicker">Academic operations, elevated</p>
              <h2 className="section-title">Built for the full rhythm of institutional life.</h2>
            </div>
            <p className="section-intro">
              Focused experiences for management, educators, learners, organisers, and examination
              teams—without generic administrative clutter.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = featureIcons[index] ?? ShieldCheck;
              return (
                <Reveal delay={index * 0.05} key={feature.title}>
                  <Card className={`feature-card feature-card-${(index % 3) + 1}`}>
                    <span className="feature-icon">
                      <Icon size={22} />
                    </span>
                    <p className="feature-number">0{index + 1}</p>
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                    <Link to="/features">
                      Discover capability <ArrowRight size={15} />
                    </Link>
                  </Card>
                </Reveal>
              );
            })}
          </div>
        </section>

        <section className="assurance-section">
          <div className="mx-auto grid max-w-7xl gap-5 px-5 py-24 lg:grid-cols-3 sm:py-28">
            {[
              {
                icon: ScanFace,
                kicker: 'Presence assurance',
                title: 'Face verification and GPS validation',
                body: 'Apply only the checks authorised by institutional policy, with clear consent, permission states, and failure reasons.',
                points: [
                  'Configurable geofence',
                  'Provider-backed face matching',
                  'Duplicate prevention',
                ],
              },
              {
                icon: CalendarCheck,
                kicker: 'Beyond the classroom',
                title: 'Events and mandatory participation',
                body: 'Run orientation, seminars, workshops, assemblies, and institutional ceremonies through a dedicated event experience.',
                points: ['Targeted audiences', 'Mandatory status', 'Participation history'],
              },
              {
                icon: BellRing,
                kicker: 'Prepared learners',
                title: 'Class reminders, your way',
                body: 'Let users choose supported reminder timing, channels, quiet hours, course mutes, and schedule-change alerts.',
                points: [
                  'In-app, email, and push ready',
                  'Flexible offsets',
                  'No duplicate reminders',
                ],
              },
            ].map(({ body, icon: Icon, kicker, points, title }, index) => (
              <Reveal delay={index * 0.07} key={title}>
                <article className="assurance-card">
                  <span className="assurance-icon">
                    <Icon size={22} />
                  </span>
                  <p>{kicker}</p>
                  <h3>{title}</h3>
                  <div>{body}</div>
                  <ul>
                    {points.map((point) => (
                      <li key={point}>
                        <Check size={14} /> {point}
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="product-story-section">
          <div className="mx-auto grid max-w-7xl gap-14 px-5 py-24 lg:grid-cols-[0.88fr_1.12fr] lg:items-center sm:py-28">
            <Reveal>
              <p className="section-kicker section-kicker-light">Lecturer and management preview</p>
              <h2 className="mt-4 max-w-xl text-4xl font-extrabold tracking-[-0.04em] text-white sm:text-5xl">
                Insight that helps people act, not just observe.
              </h2>
              <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
                See attendance momentum, identify learners who need support, and move from class
                records to defensible decisions with confidence.
              </p>
              <div className="mt-9 grid gap-4 sm:grid-cols-2">
                {[
                  ['Live session visibility', 'Monitor authorised check-ins as they happen.'],
                  ['Early risk signals', 'Intervene while there is still time to improve.'],
                  ['Verified clearance', 'Generate secure, auditable examination evidence.'],
                  ['Role-aware workspaces', 'Give each institutional role exactly what it needs.'],
                ].map(([title, text]) => (
                  <div className="story-benefit" key={title}>
                    <Check size={16} strokeWidth={3} />
                    <div>
                      <strong>{title}</strong>
                      <span>{text}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-9">
                <AnimatedCta to="/solutions" variant="secondary">
                  View the Dashboard
                </AnimatedCta>
              </div>
            </Reveal>
            <Reveal delay={0.12}>
              <DashboardPreview />
            </Reveal>
          </div>
        </section>

        <section className="evidence-section">
          <div className="mx-auto max-w-7xl px-5 py-24 sm:py-28">
            <Reveal className="section-heading-row">
              <div>
                <p className="section-kicker">From evidence to action</p>
                <h2 className="section-title">
                  Clearance, reporting, and analytics that stand up to scrutiny.
                </h2>
              </div>
              <p className="section-intro">
                Every view remains role-scoped, tenant-aware, accessible, and grounded in live
                attendance records.
              </p>
            </Reveal>
            <div className="evidence-grid">
              {evidenceCapabilities.map(([Icon, title, text], index) => (
                <Reveal delay={index * 0.04} key={String(title)}>
                  <article>
                    <span>
                      <Icon size={20} />
                    </span>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="academic-quote-section">
          <div className="mx-auto max-w-7xl px-5 py-24 sm:py-28">
            <Reveal className="mx-auto max-w-3xl text-center">
              <p className="section-kicker">Principles that move learning forward</p>
              <h2 className="section-title section-title-flash">
                Presence today. Possibility tomorrow.
              </h2>
            </Reveal>
            <Reveal delay={0.08}>
              <AcademicPrinciplesCarousel />
            </Reveal>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-24 sm:py-28">
          <Reveal className="mx-auto max-w-3xl text-center">
            <p className="section-kicker">Illustrative institution scenarios</p>
            <h2 className="section-title">Designed around real academic operations.</h2>
            <p className="mt-5 text-slate-600">
              These are product use scenarios—not customer claims or endorsements.
            </p>
          </Reveal>
          <div className="scenario-grid">
            {useScenarios.map(({ body, icon: Icon, title }, index) => (
              <Reveal delay={index * 0.07} key={title}>
                <article>
                  <span>
                    <Icon size={21} />
                  </span>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="faq-home-section">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 lg:grid-cols-[0.75fr_1.25fr] sm:py-28">
            <Reveal>
              <p className="section-kicker">Frequently asked</p>
              <h2 className="section-title">Clear answers for careful institutions.</h2>
              <p className="mt-5 max-w-md leading-7 text-slate-600">
                Explore practical details about scope, privacy, verification, and product previews.
              </p>
              <div className="mt-8">
                <AnimatedCta to="/faq" variant="secondary">
                  Explore Attendity
                </AnimatedCta>
              </div>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="faq-home-list">
                {faqs.map(([question, answer], index) => (
                  <details key={question} open={index === 0}>
                    <summary>{question}</summary>
                    <p>{answer}</p>
                  </details>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-24 sm:py-28">
          <div className="campus-story-card">
            <div className="campus-story-image">
              <img
                alt="Learners collaborating with laptops in a higher-learning environment"
                height="1067"
                loading="lazy"
                src="/images/attendity-learning-premium.png"
                width="1600"
              />
            </div>
            <div className="campus-story-copy">
              <p className="section-kicker section-kicker-light">
                Rooted in learning, ready for the world
              </p>
              <h2>Academic technology should understand institutional life.</h2>
              <p>
                Attendity adapts to faculties, schools, divisions, departments, programmes, terms,
                courses, events, and the policies that shape post-secondary education.
              </p>
              <Link
                className={buttonClassName(
                  'secondary',
                  'mt-7 border-white/25 bg-white text-slate-950',
                )}
                to="/about"
              >
                Why Attendity <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-24">
          <Reveal className="final-cta">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-100">
                A stronger academic record starts here
              </p>
              <h2>Give every attendance decision the confidence it deserves.</h2>
            </div>
            <AnimatedCta attention className="final-cta-button" to="/contact" variant="secondary">
              Start a Pilot
            </AnimatedCta>
          </Reveal>
        </section>
      </main>
    </LandingLayout>
  );
}
