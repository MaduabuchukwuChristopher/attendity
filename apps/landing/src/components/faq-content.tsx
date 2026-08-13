import { ArrowRight, HelpCircle, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const faqItems = [
  [
    'Attendance',
    'Can a student mark attendance for an unregistered course?',
    'No. Attendity verifies an approved course registration before accepting attendance.',
  ],
  [
    'Attendance',
    'What happens when a QR code is shared?',
    'Codes are signed, short-lived, and rotated. The server validates the current credential and can apply authorised GPS or face checks before accepting a record.',
  ],
  [
    'Attendance',
    'Can a lecturer correct an attendance record?',
    'Authorised staff can make controlled corrections with a reason. The original evidence and every administrative action remain available in the audit trail.',
  ],
  [
    'Policy',
    'Can each university set its own attendance threshold?',
    'Yes. Authorised university administrators configure the institutional minimum, while permitted course-level requirements can reflect approved academic policy.',
  ],
  [
    'Policy',
    'How is examination clearance verified?',
    'Each examination clearance report contains a signed reference and verification path backed by the current server record. Examiners see only the information needed for that decision.',
  ],
  [
    'Policy',
    'Does Attendity decide whether a student may write an examination?',
    'Attendity applies the configured university attendance policy and presents explainable evidence. The university remains responsible for its academic regulations and final decisions.',
  ],
  [
    'Mobile',
    'Does Attendity work on mobile devices?',
    'Yes. Student, lecturer, and examiner workspaces are responsive and installable as a progressive web app on supported devices.',
  ],
  [
    'Mobile',
    'What if a student temporarily loses connectivity?',
    'The interface communicates connection state clearly and prevents a failed request from appearing successful. Universities can define the approved alternative process for exceptional circumstances.',
  ],
  [
    'Security',
    'How does Attendity protect university data?',
    'Tenant isolation, role-based permissions, encrypted transport, short-lived access tokens, refresh-token rotation, input validation, and audit events protect institutional records.',
  ],
  [
    'Security',
    'Is biometric verification always required?',
    'No. A university enables face verification only where it is supported, lawful, consented to, and authorised by policy. QR, GPS, secure PIN, and manual methods remain configurable.',
  ],
  [
    'Privacy',
    'Does the public website track precise visitor location?',
    'No. Public country personalisation uses approximate country information only and does not display or use a visitor’s city, street, coordinates, or precise position.',
  ],
  [
    'Implementation',
    'Can Attendity reflect Nigerian university terminology?',
    'Yes. Faculties, departments, lecturers, courses, sessions, semesters, levels, matriculation numbers, and examination clearance are supported throughout the university experience.',
  ],
  [
    'Implementation',
    'How long does implementation take?',
    'Timing depends on university structure, enrolment data, identity integration, policy review, training, and pilot scope. The implementation desk prepares a phased plan after discovery.',
  ],
  [
    'Reporting',
    'Can universities export attendance evidence?',
    'Authorised users can produce branded, metadata-rich PDF, Excel, CSV, and print-ready outputs according to their role and university scope.',
  ],
] as const;

export function FaqContent() {
  const [query, setQuery] = useState('');
  const matches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return faqItems;
    return faqItems.filter(([category, question, answer]) =>
      `${category} ${question} ${answer}`.toLowerCase().includes(normalized),
    );
  }, [query]);

  return (
    <div className="faq-page-layout">
      <aside className="faq-page-story">
        <img
          alt="University students walking together on a contemporary campus"
          height="1024"
          loading="lazy"
          src="/images/attendity-campus-premium.png"
          width="1536"
        />
        <div>
          <HelpCircle size={24} />
          <p>Need an answer for your university?</p>
          <Link to="/contact">
            Ask the implementation desk <ArrowRight size={16} />
          </Link>
        </div>
      </aside>
      <div className="faq-page-content">
        <label className="faq-search">
          <span>Search frequently asked questions</span>
          <span>
            <Search aria-hidden="true" size={19} />
            <input
              aria-label="Search frequently asked questions"
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder="Search attendance, privacy, policy…"
              type="search"
              value={query}
            />
          </span>
        </label>
        <p className="faq-result-count">
          Showing {matches.length} {matches.length === 1 ? 'answer' : 'answers'}
        </p>
        <div className="faq-page-list">
          {matches.map(([category, question, answer], index) => (
            <details key={question} open={!query && index === 0}>
              <summary>
                <span>{category}</span>
                {question}
              </summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
        {matches.length === 0 ? (
          <div className="faq-empty" role="status">
            <HelpCircle size={24} />
            <p>No answer matches that search.</p>
            <Link to="/contact">Contact the implementation desk</Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
