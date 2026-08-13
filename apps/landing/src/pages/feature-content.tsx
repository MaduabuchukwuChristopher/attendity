import {
  BarChart3,
  BookOpenCheck,
  Check,
  Fingerprint,
  MapPinCheck,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Reveal } from '../components/reveal.js';

const featureStories: ReadonlyArray<{
  readonly icon: LucideIcon;
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly points: readonly string[];
}> = [
  {
    icon: QrCode,
    eyebrow: 'At the lecture door',
    title: 'Dynamic QR attendance that earns trust.',
    description:
      'Lecturers open a time-bound class session and display a signed QR credential that rotates at the university’s approved interval. Students receive a clear check-in journey while the server validates every request.',
    points: [
      'Short-lived signed credentials',
      'Course registration validation',
      'Duplicate attendance prevention',
    ],
  },
  {
    icon: MapPinCheck,
    eyebrow: 'Presence assurance',
    title: 'Verification shaped by university policy.',
    description:
      'Universities can combine QR with an approved geofence, face verification, secure PIN, or controlled manual attendance. Each method communicates permission, consent, and failure states clearly.',
    points: [
      'Configurable venue boundaries',
      'Policy-aware verification methods',
      'Explainable rejection reasons',
    ],
  },
  {
    icon: BarChart3,
    eyebrow: 'Before risk becomes outcome',
    title: 'Attendance intelligence built for academic action.',
    description:
      'Role-scoped dashboards translate live records into trends lecturers, departments, faculties, and university leadership can use to support students early.',
    points: ['Course and faculty trends', 'Late-arrival patterns', 'Early support signals'],
  },
  {
    icon: BookOpenCheck,
    eyebrow: 'At examination time',
    title: 'Clearance evidence that remains verifiable.',
    description:
      'Configured thresholds are applied to live attendance evidence. Students understand their standing, authorised staff review exceptions, and examiners verify only the clearance information they need.',
    points: [
      'Explainable eligibility standing',
      'Signed verification reference',
      'Role-limited examiner view',
    ],
  },
  {
    icon: Fingerprint,
    eyebrow: 'Across the academic calendar',
    title: 'One operational record for classes and events.',
    description:
      'Orientation, seminars, workshops, assemblies, and mandatory university events use the same trusted participation foundation without becoming mixed into classroom workflows.',
    points: ['Targeted audiences', 'Mandatory participation status', 'Dedicated event history'],
  },
  {
    icon: ShieldCheck,
    eyebrow: 'Behind every interaction',
    title: 'Privacy-aware, tenant-secure university operations.',
    description:
      'Attendity applies university isolation, role-based access, secure tokens, validation, and audit events so sensitive academic records stay within the right institutional scope.',
    points: [
      'Tenant-isolated records',
      'Auditable administrative actions',
      'Accessible, secure defaults',
    ],
  },
];

export function FeatureContent() {
  return (
    <div className="feature-page">
      <section className="feature-page-lead">
        <div>
          <p className="section-kicker">A complete attendance journey</p>
          <h2>Technology that disappears into the rhythm of university life.</h2>
          <p>
            Attendity connects the moments before a lecture, at check-in, during academic support,
            and at examination clearance—without asking any role to navigate irrelevant
            administrative clutter.
          </p>
        </div>
        <img
          alt="Students and a lecturer collaborating in a university seminar"
          height="1024"
          loading="lazy"
          src="/images/attendity-learning-premium.png"
          width="1536"
        />
      </section>
      <div className="feature-story-list">
        {featureStories.map(({ description, eyebrow, icon: Icon, points, title }, index) => (
          <Reveal delay={index * 0.04} key={title}>
            <article className="feature-story">
              <div className="feature-story-number">{String(index + 1).padStart(2, '0')}</div>
              <div className="feature-story-icon">
                <Icon size={24} />
              </div>
              <div className="feature-story-copy">
                <p>{eyebrow}</p>
                <h3>{title}</h3>
                <div>{description}</div>
              </div>
              <ul>
                {points.map((point) => (
                  <li key={point}>
                    <Check size={15} /> {point}
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>
        ))}
      </div>
      <section className="content-conversion-band">
        <div>
          <p>See Attendity in your university context</p>
          <h2>Map your attendance policy to a working demonstration.</h2>
        </div>
        <Link to="/contact">Book an institutional demonstration</Link>
      </section>
    </div>
  );
}
