import { BookOpenCheck, Eye, ShieldCheck, UsersRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const values: ReadonlyArray<readonly [LucideIcon, string, string]> = [
  [
    Eye,
    'Clarity before consequence',
    'Students and university teams should understand attendance standing before it becomes an examination problem.',
  ],
  [
    ShieldCheck,
    'Trust without intrusion',
    'Verification should be proportionate, policy-led, privacy-aware, and explainable to the people it affects.',
  ],
  [
    UsersRound,
    'Belonging through presence',
    'Attendance is not only administration; it is one signal that a learner remains connected to academic life.',
  ],
  [
    BookOpenCheck,
    'Evidence in service of learning',
    'Insight should help lecturers and academic teams support progress, not simply produce reports.',
  ],
];

export function AboutContent() {
  return (
    <div className="about-page">
      <section className="about-origin">
        <div>
          <p className="section-kicker">The scenario that started Attendity</p>
          <h2>A crowded lecture theatre. A paper register. A decision that arrived too late.</h2>
          <p>
            Imagine a lecturer beginning a Monday morning course with hundreds of students. A paper
            sheet moves from row to row. Names are missed, signatures are repeated, and the register
            returns with no immediate way to know who is drifting away from the course.
          </p>
          <p>
            Weeks later, a student reaches examination clearance and discovers that the record does
            not reflect the lectures they attended. The lecturer searches folders, the department
            reconciles spreadsheets, and everyone is asked to trust evidence that was never designed
            to carry such weight.
          </p>
          <p>
            Attendity was conceived for that gap: to make presence easy to record, difficult to
            falsify, clear to understand, and useful early enough to support learning—not merely to
            judge it at the end.
          </p>
        </div>
        <img
          alt="A lecturer guiding students in a collaborative university seminar"
          height="1024"
          loading="lazy"
          src="/images/attendity-learning-premium.png"
          width="1536"
        />
      </section>
      <blockquote className="about-quote">
        “The most valuable attendance record is not the one that proves absence later; it is the one
        that helps a university respond while possibility remains.”
        <span>Attendity founding principle</span>
      </blockquote>
      <section className="about-values">
        {values.map(([Icon, title, body]) => (
          <article key={title}>
            <span>
              <Icon size={23} />
            </span>
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </section>
      <section className="about-campus">
        <img
          alt="University students crossing a contemporary international campus"
          height="1024"
          loading="lazy"
          src="/images/attendity-campus-premium.png"
          width="1536"
        />
        <div>
          <p className="section-kicker section-kicker-light">Built for the citadel of learning</p>
          <h2>Local academic understanding. Global product discipline.</h2>
          <p>
            Attendity uses Nigerian university language—faculties, departments, lecturers, courses,
            semesters, matriculation numbers, and examination clearance—inside an architecture ready
            for secure, accessible higher learning.
          </p>
        </div>
      </section>
    </div>
  );
}
