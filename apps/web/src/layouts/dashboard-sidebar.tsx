import { BrandMark } from '@qr/ui';
import type { AuthenticatedUser } from '@qr/types';
import { Search, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import type { DashboardNavGroup } from './dashboard-nav-config.js';

interface DashboardSidebarProps {
  readonly groups: readonly DashboardNavGroup[];
  readonly institutionName: string;
  readonly onClose: () => void;
  readonly open: boolean;
  readonly user: AuthenticatedUser;
}

export function DashboardSidebar({
  groups,
  institutionName,
  onClose,
  open,
  user,
}: DashboardSidebarProps) {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.label.toLowerCase().includes(normalizedQuery)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside
      aria-label="Workspace navigation"
      className={`app-sidebar fixed inset-y-0 left-0 z-30 flex w-72 flex-col overflow-y-auto border-r p-5 transition-transform duration-250 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <BrandMark inverse />
          <p className="mt-4 truncate text-xs font-semibold text-emerald-100">{institutionName}</p>
          <p className="mt-1 text-[11px] capitalize tracking-wide text-slate-400">
            {user.role.replaceAll('_', ' ')} workspace
          </p>
        </div>
        <button
          aria-label="Close navigation"
          className="grid size-10 shrink-0 place-items-center rounded-xl text-white hover:bg-white/10 lg:hidden"
          onClick={onClose}
          type="button"
        >
          <X size={20} />
        </button>
      </div>

      <label className="relative mt-7 block">
        <span className="sr-only">Search navigation</span>
        <Search className="absolute left-3 top-3 text-slate-400" size={17} />
        <input
          className="h-10 w-full rounded-xl border border-white/10 bg-white/6 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-400 focus:border-[#D4AA48] focus:ring-4 focus:ring-white/10"
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Find a page"
          type="search"
          value={query}
        />
      </label>

      <nav className="mt-5 grid gap-5" aria-label="Primary navigation">
        {filtered.map((group) => (
          <section
            aria-labelledby={`nav-${group.label.replaceAll(' ', '-').toLowerCase()}`}
            key={group.label}
          >
            <p
              className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400"
              id={`nav-${group.label.replaceAll(' ', '-').toLowerCase()}`}
            >
              {group.label}
            </p>
            <div className="grid gap-1">
              {group.items.map(({ label, icon: Icon, to }) => (
                <NavLink
                  className={({ isActive }) =>
                    `group flex min-h-11 items-center gap-3 rounded-xl border px-3 text-left text-sm font-semibold transition ${isActive ? 'border-emerald-400/30 bg-primary text-white shadow-lg shadow-black/15' : 'border-transparent text-slate-300 hover:border-white/10 hover:bg-white/8 hover:text-white'}`
                  }
                  onClick={onClose}
                  key={`${group.label}-${label}`}
                  to={to}
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/6 text-slate-300 transition group-hover:text-white">
                    <Icon aria-hidden="true" size={17} />
                  </span>
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </section>
        ))}
        {filtered.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-4 text-sm text-slate-300">
            No matching pages.
          </p>
        ) : null}
      </nav>

      <div className="mt-auto pt-7">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-slate-300">
          <div className="mb-3 h-1 w-12 rounded-full bg-[#D4AA48]" />
          <p className="text-xs font-bold text-white">Academic trust, built in</p>
          <p className="mt-2 text-[11px] leading-5">
            Secure, role-aware operations for every institution attendance decision.
          </p>
        </div>
      </div>
    </aside>
  );
}
