interface PolicySection {
  readonly title: string;
  readonly paragraphs: readonly string[];
}

const privacySections: readonly PolicySection[] = [
  {
    title: '1. Scope and responsibility',
    paragraphs: [
      'This Privacy Notice explains how Attendity supports participating universities in processing personal and academic information. The university that provides or authorises a record determines the academic purpose and applicable retention policy; Attendity operates the platform and protects the information within the agreed service scope.',
      'Students and staff should also review notices issued by their university because institutional rules, lawful bases, verification methods, and rights procedures may differ.',
    ],
  },
  {
    title: '2. Information processed',
    paragraphs: [
      'Attendity may process identity and account information, university identifiers, matriculation or staff numbers, academic registrations, class and event schedules, attendance records, device and verification results, communications preferences, examination-clearance status, support correspondence, and security audit events.',
      'Where a university enables location or face verification, the interface explains the purpose and permission state. Verification is used only for an authorised attendance workflow and is not silently enabled by the public website.',
    ],
  },
  {
    title: '3. Public website information',
    paragraphs: [
      'The public website may use an approximate country result to personalise general supporting copy. It does not display or use a visitor’s city, street, coordinates, or precise location, and country personalisation is never used for authentication, authorisation, attendance, or academic decisions.',
      'Basic technical logs may be processed to protect availability, investigate abuse, and understand service reliability. Raw visitor IP addresses are not retained in the country-personalisation cache.',
    ],
  },
  {
    title: '4. Purposes of processing',
    paragraphs: [
      'Information is processed to provision secure accounts, validate authorised course registration, record attendance, prevent duplicate or fraudulent check-ins, communicate schedules and reminders, calculate attendance standing, produce permitted reports, verify examination clearance, resolve support requests, and maintain an auditable security record.',
      'Attendity does not sell university records or use attendance evidence for unrelated advertising.',
    ],
  },
  {
    title: '5. Sharing and access',
    paragraphs: [
      'Access is limited by university tenancy, role, academic unit, and purpose. Lecturers, authorised administrators, students, organisers, and examiners receive different views. Service providers may process limited information where required for hosting, communication, security, or approved verification under contractual safeguards.',
      'Information may be disclosed where a university directs it, where law requires it, or where necessary to protect users and the service.',
    ],
  },
  {
    title: '6. Retention and deletion',
    paragraphs: [
      'Academic and audit records follow the university’s configured retention policy and applicable obligations. Account and security records may be retained for the period necessary to investigate activity, preserve integrity, or meet legal requirements.',
      'When information is no longer required, it is deleted or anonymised according to the applicable policy, backup cycle, and lawful preservation obligations.',
    ],
  },
  {
    title: '7. Security',
    paragraphs: [
      'Attendity uses tenant isolation, role-based access, encrypted transport, secure password hashing, short-lived access tokens, refresh-token rotation, request validation, rate limits, security headers, audit events, and controlled administrative workflows. No system can promise absolute security, so incidents are assessed and handled under the applicable response process.',
    ],
  },
  {
    title: '8. Rights and enquiries',
    paragraphs: [
      'Requests to access, correct, restrict, object to, or delete university-controlled information should normally begin with the responsible university. Attendity supports authorised universities in responding where applicable.',
      'Privacy and security enquiries may be sent to hello@attendity.ng. Identity and authority may be verified before information is disclosed or changed.',
    ],
  },
];

const termsSections: readonly PolicySection[] = [
  {
    title: '1. Agreement and authorised users',
    paragraphs: [
      'These Terms govern access to Attendity by universities and authorised users. Accessing the service means the user will follow these Terms, the university’s academic rules, and applicable law.',
      'Accounts are personal to the authorised user. Credentials, active sessions, verification links, QR credentials, and clearance references must not be shared or used to impersonate another person.',
    ],
  },
  {
    title: '2. University responsibilities',
    paragraphs: [
      'The university is responsible for the accuracy and lawful supply of source data, authorised user administration, approved attendance and examination policy, verification-method selection, notices and consents, exception handling, and final academic decisions.',
      'Attendity provides configurable technology and evidence; it does not replace university governance or professional judgement.',
    ],
  },
  {
    title: '3. Acceptable use',
    paragraphs: [
      'Users must not bypass registration, identity, location, face, QR, session, or role controls; submit false attendance; interfere with another user; probe or disrupt security; upload malicious material; scrape restricted data; or use the service for an unauthorised purpose.',
      'Suspected misuse may be limited, suspended, investigated, and recorded in the audit trail.',
    ],
  },
  {
    title: '4. Attendance and clearance records',
    paragraphs: [
      'Attendance and clearance results depend on authorised source records, configured policy, session state, and successful verification. Users should report an apparent error through the university’s approved correction process rather than attempting to alter evidence.',
      'A printable or downloaded report may become outdated. The live verification service is the authoritative source where a signed reference is provided.',
    ],
  },
  {
    title: '5. Service availability and change',
    paragraphs: [
      'Attendity is maintained to support reliable university operations, but uninterrupted availability cannot be guaranteed. Maintenance, security events, external networks, devices, browsers, or provider dependencies may affect access.',
      'Features may evolve to improve security, accessibility, reliability, or university needs. Material changes are communicated through the applicable university or service channel.',
    ],
  },
  {
    title: '6. Intellectual property',
    paragraphs: [
      'Attendity software, branding, interfaces, documentation, and original content remain protected by applicable intellectual-property rights. Universities and users retain rights in the information they lawfully provide, subject to the processing permissions required to operate the service.',
    ],
  },
  {
    title: '7. Suspension and termination',
    paragraphs: [
      'Access may be suspended or terminated when authorisation ends, a university relationship changes, security is at risk, fees or contractual obligations are not met, or these Terms are materially breached. Relevant records may remain subject to retention and audit obligations.',
    ],
  },
  {
    title: '8. Liability and contact',
    paragraphs: [
      'To the extent permitted by law, responsibilities and liability are allocated through the applicable university agreement. Nothing in these Terms excludes rights or liability that cannot lawfully be excluded.',
      'Questions about these Terms or authorised use may be sent to hello@attendity.ng.',
    ],
  },
];

export function PolicyContent({ type }: { readonly type: 'privacy' | 'terms' }) {
  const sections = type === 'privacy' ? privacySections : termsSections;
  return (
    <article className="policy-page">
      <header>
        <p>Effective 8 August 2026</p>
        <strong>
          {type === 'privacy' ? 'Attendity Privacy Notice' : 'Attendity Terms of Use'}
        </strong>
        <span>
          Professional guidance for universities and authorised users. This public document should
          be read with the applicable university agreement and institutional policy.
        </span>
      </header>
      <nav aria-label={`${type} document sections`}>
        {sections.map((section) => (
          <a href={`#policy-${section.title.split('.')[0]}`} key={section.title}>
            {section.title}
          </a>
        ))}
      </nav>
      <div className="policy-sections">
        {sections.map((section) => (
          <section id={`policy-${section.title.split('.')[0]}`} key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ))}
      </div>
    </article>
  );
}
