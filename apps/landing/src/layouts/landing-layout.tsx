import { BrandMark } from '@qr/ui';
import { BookOpen, Globe2, Mail, ShieldCheck } from 'lucide-react';
import { motion, useScroll, useSpring } from 'framer-motion';
import type { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/navbar.js';
import { BackToTopButton } from '../components/back-to-top-button.js';

export function LandingLayout({ children }: PropsWithChildren) {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { damping: 30, stiffness: 220 });
  const configuredPortalUrl: unknown = import.meta.env.VITE_PORTAL_URL;
  const portalUrl =
    typeof configuredPortalUrl === 'string' && configuredPortalUrl.length > 0
      ? configuredPortalUrl
      : 'http://localhost:5173/login';

  return (
    <div className="min-h-screen overflow-x-clip bg-white text-slate-950">
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <motion.div className="scroll-progress" style={{ scaleX: progress }} />
      <Navbar />
      <div id="main-content" tabIndex={-1}>
        {children}
      </div>
      <BackToTopButton />
      <footer className="landing-footer">
        <div className="footer-accent" aria-hidden="true" />
        <div className="mx-auto max-w-7xl px-5 pb-10 pt-16">
          <div className="grid gap-12 border-b border-white/10 pb-12 lg:grid-cols-[1.25fr_0.75fr_0.75fr_0.75fr]">
            <div>
              <BrandMark inverse />
              <p className="mt-5 max-w-sm text-sm leading-7 text-slate-300">
                Trusted attendance infrastructure for institutions of higher learning—connecting
                presence, progress, participation, and academic possibility.
              </p>
              <a
                className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-[#E5B846] hover:text-[#F3CF75]"
                href="mailto:hello@attendity.ng"
              >
                <Mail size={16} /> hello@attendity.ng
              </a>
            </div>
            <FooterColumn
              heading="Platform"
              links={[
                ['Features', '/features'],
                ['Solutions', '/solutions'],
                ['Planning', '/pricing'],
                ['Institution sign in', portalUrl],
              ]}
            />
            <FooterColumn
              heading="Attendity"
              links={[
                ['About us', '/about'],
                ['Contact', '/contact'],
                ['FAQ', '/faq'],
              ]}
            />
            <FooterColumn
              heading="Trust"
              links={[
                ['Privacy', '/privacy'],
                ['Terms', '/terms'],
              ]}
            />
          </div>
          <div className="grid gap-5 pt-8 text-xs text-slate-400 sm:grid-cols-[1fr_auto] sm:items-center">
            <p>© 2026 Attendity. Built for the future of higher learning.</p>
            <div className="flex flex-wrap gap-5">
              <span className="flex items-center gap-2">
                <ShieldCheck size={14} /> Privacy-aware by design
              </span>
              <span className="flex items-center gap-2">
                <BookOpen size={14} /> Institution-aware terminology
              </span>
              <span className="flex items-center gap-2">
                <Globe2 size={14} /> Approximate country may personalise public copy
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface FooterColumnProps {
  readonly heading: string;
  readonly links: readonly (readonly [string, string])[];
}

function FooterColumn({ heading, links }: FooterColumnProps) {
  return (
    <div>
      <p className="text-sm font-bold text-white">{heading}</p>
      <div className="mt-5 grid gap-3 text-sm text-slate-300">
        {links.map(([label, to]) =>
          to.startsWith('http') ? (
            <a className="footer-link" href={to} key={label}>
              {label}
            </a>
          ) : (
            <Link className="footer-link" key={label} to={to}>
              {label}
            </Link>
          ),
        )}
      </div>
    </div>
  );
}
