import { BookOpen, Building2, GraduationCap, Landmark, ScanLine } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

const roles: ReadonlyArray<{
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description: string;
  readonly className: string;
}> = [
  {
    icon: Landmark,
    title: 'Institution leadership',
    description:
      'See university-wide attendance, risk, participation, and eligibility trends without replacing academic ownership.',
    className: 'solution-role-centre',
  },
  {
    icon: Building2,
    title: 'Academic-unit teams',
    description:
      'Manage faculties, departments, courses, registrations, policy, and defensible reporting within the correct scope.',
    className: 'solution-role-top-left',
  },
  {
    icon: BookOpen,
    title: 'Lecturers',
    description:
      'Open secure sessions, monitor live check-ins, address exceptions, and close records cleanly.',
    className: 'solution-role-bottom-left',
  },
  {
    icon: GraduationCap,
    title: 'Students',
    description:
      'Confirm attendance, understand progress, receive reminders, and access verifiable eligibility evidence.',
    className: 'solution-role-top-right',
  },
  {
    icon: ScanLine,
    title: 'Examiners',
    description:
      'Verify clearance references quickly without seeing unrelated student or university information.',
    className: 'solution-role-bottom-right',
  },
];

export function SolutionContent() {
  return (
    <div className="solution-page">
      <div className="solution-intro">
        <p className="section-kicker">One record, the right view for every role</p>
        <h2>University teams stay connected without losing responsibility.</h2>
        <p>
          Attendity gives each authorised role a focused workspace while every decision remains
          grounded in the same tenant-secure attendance evidence.
        </p>
      </div>
      <div className="solution-constellation">
        {roles.map(({ className, description, icon: Icon, title }) => (
          <article className={`solution-role ${className}`} key={title}>
            <span>
              <Icon size={23} />
            </span>
            <h3>{title}</h3>
            <p>{description}</p>
          </article>
        ))}
      </div>
      <section className="solution-workflow">
        <img
          alt="A student using Attendity while entering a university lecture theatre"
          height="1024"
          loading="lazy"
          src="/images/attendity-mobile-attendance-premium.png"
          width="1536"
        />
        <div>
          <p className="section-kicker section-kicker-light">Shared confidence</p>
          <h2>From student check-in to examiner verification.</h2>
          <p>
            A secure record moves through the university only as far as each role is permitted to
            see and act.
          </p>
          <Link to="/contact">Plan a role-based demonstration</Link>
        </div>
      </section>
    </div>
  );
}
