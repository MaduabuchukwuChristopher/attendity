import { buttonClassName, Card } from '@qr/ui';
import { ArrowRight, Check, Clock3, Globe2, Mail, MapPin, ShieldCheck } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ContactForm } from '../components/contact-form.js';
import { FaqContent } from '../components/faq-content.js';
import { Reveal } from '../components/reveal.js';
import { LandingLayout } from '../layouts/landing-layout.js';
import { AboutContent } from './about-content.js';
import { FeatureContent } from './feature-content.js';
import { PolicyContent } from './policy-content.js';
import { SolutionContent } from './solution-content.js';

const content: Record<string, { title: string; intro: string }> = {
  '/features': {
    title: 'Everything your attendance operation needs.',
    intro:
      'From the lecture theatre to the examination hall, Attendity gives every academic team clear, defensible attendance information.',
  },
  '/solutions': {
    title: 'A platform for every academic team.',
    intro:
      'Institution leaders, academic units, educators, students, organisers, and examiners work from one trusted attendance record.',
  },
  '/pricing': {
    title: 'Simple institutional planning.',
    intro:
      'A demonstration plan shaped around your institution’s campuses, academic units, terminology, and attendance policy.',
  },
  '/about': {
    title: 'Designed around academic trust.',
    intro:
      'Attendity helps post-secondary institutions make attendance fairer, clearer, and easier to manage.',
  },
  '/contact': {
    title: 'Plan your Attendity rollout.',
    intro:
      'Tell us about your institution and an implementation specialist will help you map the next step.',
  },
  '/privacy': {
    title: 'Privacy for academic data.',
    intro:
      'How Attendity minimises data collection and protects tenant-scoped institution records.',
  },
  '/terms': {
    title: 'Terms of use.',
    intro:
      'The responsibilities that keep institutional Attendity access secure, fair, and reliable.',
  },
  '/faq': {
    title: 'Questions, answered.',
    intro: 'Practical answers for teams evaluating digital attendance operations.',
  },
};
function StandardContent({ pathname }: { readonly pathname: string }) {
  if (pathname === '/features') return <FeatureContent />;
  if (pathname === '/solutions') return <SolutionContent />;
  if (pathname === '/pricing')
    return (
      <div className="pricing-experience">
        <div className="pricing-photo">
          <img
            alt="A student using a phone while entering a university lecture theatre"
            height="1024"
            loading="lazy"
            src="/images/attendity-mobile-attendance-premium.png"
            width="1536"
          />
          <div>
            <ShieldCheck size={22} />
            <span>Scope-led. Policy-aware. University-ready.</span>
          </div>
        </div>
        <Card className="pricing-card">
          <p className="section-kicker">Institutional demonstration</p>
          <h2>Planning shaped around your university—not a generic package.</h2>
          <p>
            Commercial scope is prepared around active students, campuses, faculties, departments,
            integrations, verification policy, support, and rollout requirements.
          </p>
          <ol>
            {[
              'Discovery and requirements workshop',
              'Configured university demonstration',
              'Security and data-flow review',
              'Phased rollout and support proposal',
            ].map((item, index) => (
              <li key={item}>
                <span>0{index + 1}</span>
                {item}
              </li>
            ))}
          </ol>
          <div className="pricing-includes">
            {[
              'No unsupported adoption claims',
              'Clear implementation assumptions',
              'Pilot-to-rollout planning',
              'Accessible stakeholder review',
            ].map((item) => (
              <span key={item}>
                <Check size={15} />
                {item}
              </span>
            ))}
          </div>
          <Link className={buttonClassName('primary', 'landing-primary-button')} to="/contact">
            Request a planning call <ArrowRight size={17} />
          </Link>
        </Card>
      </div>
    );
  if (pathname === '/about') return <AboutContent />;
  if (pathname === '/faq') return <FaqContent />;
  if (pathname === '/privacy') return <PolicyContent type="privacy" />;
  return <PolicyContent type="terms" />;
}

export function ContentPage() {
  const { pathname } = useLocation();
  const page = content[pathname] ?? content['/features']!;
  const isContact = pathname === '/contact';
  useEffect(() => {
    document.title = `${page.title.replace(/\.$/, '')} — Attendity`;
    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    description?.setAttribute('content', page.intro);
    document
      .querySelector<HTMLMetaElement>('meta[property="og:title"]')
      ?.setAttribute('content', `${page.title.replace(/\.$/, '')} — Attendity`);
    document
      .querySelector<HTMLMetaElement>('meta[property="og:description"]')
      ?.setAttribute('content', page.intro);
  }, [page.intro, page.title]);
  return (
    <LandingLayout>
      <main>
        <section className="content-hero">
          <Reveal className="relative z-1 mx-auto max-w-7xl px-5 py-16 sm:py-24">
            <p className="section-kicker">Attendity for higher learning</p>
            <h1 className="mt-5 max-w-4xl text-4xl font-extrabold tracking-[-0.05em] text-[#102A3D] sm:text-6xl">
              {page.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">{page.intro}</p>
          </Reveal>
        </section>
        <section className="mx-auto max-w-7xl px-5 py-16 sm:py-20">
          {isContact ? (
            <div className="contact-experience">
              <ContactForm />
              <div className="contact-support-column">
                <Card className="implementation-desk-card">
                  <p className="section-kicker section-kicker-light">Implementation desk</p>
                  <h2>Start with a conversation about your university.</h2>
                  <p>
                    We will map the academic structure, attendance policy, stakeholders, and
                    evidence requirements that should shape your demonstration.
                  </p>
                  <div className="implementation-contact-list">
                    <a
                      className="flex items-center gap-3 hover:text-primary"
                      href="mailto:hello@attendity.ng"
                    >
                      <Mail className="text-primary" size={19} />
                      hello@attendity.ng
                    </a>
                    <p className="flex items-center gap-3">
                      <MapPin className="text-primary" size={19} />
                      Remote and multi-region implementation planning
                    </p>
                    <p className="flex items-center gap-3">
                      <Globe2 className="text-primary" size={19} />
                      Built for universities using Nigerian academic terminology
                    </p>
                    <p className="flex items-center gap-3">
                      <Clock3 className="text-primary" size={19} />
                      Response target: two working days
                    </p>
                  </div>
                </Card>
                <img
                  className="contact-support-photo"
                  alt="University students crossing a contemporary campus"
                  height="1024"
                  loading="lazy"
                  src="/images/attendity-campus-premium.png"
                  width="1536"
                />
              </div>
            </div>
          ) : (
            <StandardContent pathname={pathname} />
          )}
          {!isContact && pathname !== '/pricing' ? (
            <Link
              className={buttonClassName('primary', 'landing-primary-button mt-12')}
              to="/contact"
            >
              Contact the Team
            </Link>
          ) : null}
        </section>
      </main>
    </LandingLayout>
  );
}
