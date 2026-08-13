import { Badge, LineChart } from '@qr/ui';
import { BookOpen, CircleAlert, MoreHorizontal, Users } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

const summary = [
  { icon: Users, label: 'Present', value: '1,842', detail: '+6.4%', tone: 'green' },
  { icon: BookOpen, label: 'Live sessions', value: '24', detail: 'Preview data', tone: 'navy' },
  { icon: CircleAlert, label: 'Needs support', value: '36', detail: '2.1%', tone: 'gold' },
] as const;

export function DashboardPreview() {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className="dashboard-window"
      initial={reduceMotion ? false : { opacity: 0, rotateX: 5, y: 24 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      viewport={{ once: true }}
      whileInView={reduceMotion ? {} : { opacity: 1, rotateX: 0, y: 0 }}
    >
      <div className="dashboard-window-bar">
        <span className="bg-[#D66C4A]" />
        <span className="bg-[#D6A63B]" />
        <span className="bg-[#3E8A68]" />
        <p>Attendity · Illustrative institution preview</p>
      </div>
      <div className="dashboard-canvas">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Current semester
            </p>
            <h3 className="mt-1 text-base font-extrabold tracking-tight text-slate-900">
              Academic attendance
            </h3>
          </div>
          <Badge tone="success">Live</Badge>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2.5">
          {summary.map(({ detail, icon: Icon, label, tone, value }) => (
            <div className={`dashboard-stat dashboard-stat-${tone}`} key={label}>
              <Icon aria-hidden="true" size={15} />
              <p>{label}</p>
              <strong>{value}</strong>
              <small>{detail}</small>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-2xl border border-slate-100 bg-white p-3.5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-slate-800">Attendance momentum</p>
                <p className="mt-0.5 text-[9px] text-slate-400">Last seven teaching days</p>
              </div>
              <MoreHorizontal className="text-slate-400" size={16} />
            </div>
            <div className="mt-3">
              <LineChart label="Attendance trend" values={[48, 62, 57, 71, 68, 83, 89]} />
            </div>
          </div>
          <div className="rounded-2xl bg-[#102F46] p-3.5 text-white">
            <p className="text-[10px] font-semibold text-slate-300">Academic unit health</p>
            <div className="dashboard-donut">
              <span>89%</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-[9px] text-slate-300">
              <span>Target</span>
              <strong className="text-white">75%</strong>
            </div>
          </div>
        </div>
        <div className="mt-3 rounded-2xl border border-slate-100 bg-white p-3.5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-slate-800">Live lecture activity</p>
              <p className="mt-0.5 text-[9px] text-slate-400">Computing academic unit</p>
            </div>
            <span className="live-pulse" aria-hidden="true" />
          </div>
          <div className="mt-3 grid grid-cols-8 items-end gap-1.5" aria-hidden="true">
            {[44, 58, 50, 72, 64, 81, 76, 91].map((height, index) => (
              <motion.span
                animate={
                  reduceMotion ? false : { height: [`${Math.max(22, height - 12)}%`, `${height}%`] }
                }
                className="dashboard-bar"
                key={`${height}-${index}`}
                transition={{
                  duration: 1.2,
                  delay: index * 0.08,
                  repeat: Infinity,
                  repeatType: 'reverse',
                }}
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
