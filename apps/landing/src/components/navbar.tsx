import { BrandMark, buttonClassName } from '@qr/ui';
import { LogIn, Menu, X } from 'lucide-react';
import { motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { navItems } from '../constants/content.js';
import { portalUrl } from '../config/portal-url.js';
import { AnimatedCta } from './animated-cta.js';

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY, scrollYProgress } = useScroll();
  useMotionValueEvent(scrollY, 'change', (latest) => setScrolled(latest > 36));

  return (
    <motion.header
      className={`landing-navbar ${scrolled ? 'landing-navbar-scrolled' : 'landing-navbar-top'}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5">
        <Link aria-label="Attendity home" to="/" className="relative">
          <motion.div
            animate={{ scale: scrolled ? 0.95 : 1 }}
            transition={{ duration: 0.25 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <BrandMark inverse={scrolled} />
          </motion.div>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">
          {navItems.map((item, index) => (
            <motion.nav
              key={item.to}
              initial={{ y: -10 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.1 + index * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <NavLink
                className={({ isActive }) => `
                  landing-nav-link
                  ${isActive ? 'landing-nav-link-active' : ''}
                `}
                to={item.to}
              >
                {item.label}
              </NavLink>
            </motion.nav>
          ))}
        </nav>

        <div className="hidden items-center gap-2.5 lg:flex">
          <motion.div
            initial={{ x: 20 }}
            animate={{ x: 0 }}
            transition={{ delay: 0.3, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <a className={buttonClassName('ghost', 'landing-signin')} href={portalUrl}>
              Sign in
            </a>
          </motion.div>
          <motion.div
            initial={{ x: 20 }}
            animate={{ x: 0 }}
            transition={{ delay: 0.35, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <motion.div animate={{ scale: scrolled ? 0.98 : 1 }} transition={{ duration: 0.25 }}>
              <AnimatedCta className="landing-header-cta" to="/contact">
                Book a Demo
              </AnimatedCta>
            </motion.div>
          </motion.div>
        </div>

        <motion.button
          aria-expanded={open}
          aria-label={open ? 'Close navigation' : 'Open navigation'}
          className="grid size-11 place-items-center rounded-xl border border-slate-200 text-slate-800 lg:hidden"
          onClick={() => setOpen((value) => !value)}
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </motion.button>
      </div>

      <motion.div
        className="mobile-menu"
        initial={{ height: 0, opacity: 0 }}
        animate={open ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="mx-auto grid max-w-7xl gap-1 px-5 pb-6 pt-2">
          {navItems.map((item, index) => (
            <motion.nav
              key={item.to}
              initial={{ opacity: 0, x: -20 }}
              animate={open ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
              transition={{ delay: index * 0.04, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <NavLink
                className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-emerald-50 hover:text-primary"
                onClick={() => setOpen(false)}
                to={item.to}
              >
                {item.label}
              </NavLink>
            </motion.nav>
          ))}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={open ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{
              delay: navItems.length * 0.04 + 0.1,
              duration: 0.3,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <Link
              className={buttonClassName('primary', 'mt-3 w-full')}
              onClick={() => setOpen(false)}
              to="/contact"
            >
              Book a Demo
            </Link>
          </motion.div>
          <motion.a
            initial={{ opacity: 0, y: 10 }}
            animate={open ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{
              delay: navItems.length * 0.04 + 0.15,
              duration: 0.3,
              ease: [0.22, 1, 0.36, 1],
            }}
            className={buttonClassName('secondary', 'mobile-portal-button')}
            href={portalUrl}
          >
            <LogIn aria-hidden="true" size={18} />
            Institution sign in
          </motion.a>
        </div>
      </motion.div>

      {/* Scroll progress indicator */}
      <motion.div className="nav-scroll-progress" style={{ scaleX: scrollYProgress }} />

      {/* Subtle glow effect on scroll */}
      <motion.div
        className="nav-glow"
        animate={{
          opacity: scrolled ? 1 : 0,
          boxShadow: scrolled ? '0 12px 34px rgba(3, 20, 27, 0.2)' : 'none',
        }}
      />
    </motion.header>
  );
}
