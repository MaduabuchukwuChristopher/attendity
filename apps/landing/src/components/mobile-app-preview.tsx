import {
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  Home,
  QrCode,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

export function MobileAppPreview() {
  const reduceMotion = useReducedMotion();
  return (
    <div className="mobile-showcase" aria-label="Attendity mobile app dashboard preview" role="img">
      <div className="mobile-orbit mobile-orbit-one" aria-hidden="true" />
      <div className="mobile-orbit mobile-orbit-two" aria-hidden="true" />
      <motion.div
        animate={reduceMotion ? false : { y: [0, -8, 0] }}
        className="phone-shell"
        style={{ x: '-50%' }}
        transition={{ duration: 5, ease: 'easeInOut', repeat: Infinity }}
      >
        <div className="phone-speaker" aria-hidden="true" />
        <div className="phone-screen">
          <div className="flex items-center justify-between text-white">
            <div>
              <p className="text-[10px] text-emerald-100">Good morning</p>
              <p className="mt-0.5 text-sm font-bold">Amara Okafor</p>
            </div>
            <span className="grid size-8 place-items-center rounded-full bg-white/12">
              <Bell size={14} />
            </span>
          </div>
          <div className="mt-5 rounded-2xl bg-white p-4 text-slate-900 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Semester attendance
                </p>
                <p className="mt-1 text-2xl font-extrabold tracking-tight">88%</p>
              </div>
              <div className="attendance-ring">
                <span>88</span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-[10px] font-semibold text-primary">
              <TrendingUp size={13} /> 4% above institution target
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs font-bold text-white">Today’s lectures</p>
            <span className="text-[10px] text-emerald-100">3 courses</span>
          </div>
          <div className="mt-2 space-y-2">
            <div className="mobile-course-card">
              <span className="mobile-course-icon bg-[#F3E7C7] text-[#8A6717]">
                <BookOpen size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-bold">CSC 412 · Software Engineering</p>
                <p className="mt-0.5 text-[9px] text-slate-500">10:00 · LT 04</p>
              </div>
              <span className="grid size-5 place-items-center rounded-full bg-emerald-100 text-primary">
                <Check size={11} strokeWidth={3} />
              </span>
            </div>
            <div className="mobile-course-card">
              <span className="mobile-course-icon bg-[#E6EDF4] text-[#173B57]">
                <CalendarDays size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-bold">MTH 402 · Numerical Methods</p>
                <p className="mt-0.5 text-[9px] text-slate-500">13:00 · Science Hall</p>
              </div>
              <span className="rounded-full bg-[#FFF0E8] px-2 py-1 text-[8px] font-bold text-[#A94722]">
                Next
              </span>
            </div>
          </div>
          <motion.div
            animate={reduceMotion ? false : { scale: [1, 1.04, 1] }}
            className="mobile-scan-button"
            style={{ x: '-50%' }}
            transition={{ duration: 2.4, repeat: Infinity }}
          >
            <QrCode size={18} />
          </motion.div>
          <div className="mobile-bottom-nav">
            <span className="text-primary">
              <Home size={14} />
              <small>Home</small>
            </span>
            <span>
              <BookOpen size={14} />
              <small>Courses</small>
            </span>
            <span className="opacity-0">
              <QrCode size={14} />
            </span>
            <span>
              <CalendarDays size={14} />
              <small>History</small>
            </span>
            <span>
              <UserRound size={14} />
              <small>Profile</small>
            </span>
          </div>
        </div>
      </motion.div>
      <motion.div
        animate={reduceMotion ? false : { x: [0, 7, 0] }}
        className="mobile-floating-card mobile-floating-card-top"
        transition={{ duration: 4.5, repeat: Infinity }}
      >
        <span className="grid size-8 place-items-center rounded-xl bg-emerald-100 text-primary">
          <Check size={16} strokeWidth={3} />
        </span>
        <div>
          <strong>Checked in</strong>
          <small>CSC 412 · 10:02</small>
        </div>
      </motion.div>
      <div className="mobile-floating-card mobile-floating-card-bottom">
        <QrCode className="text-[#C99A2E]" size={21} />
        <div>
          <strong>Secure QR</strong>
          <small>Refreshes every 30s</small>
        </div>
      </div>
    </div>
  );
}
