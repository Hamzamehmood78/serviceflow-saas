import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardList,
  Users,
  Briefcase,
  UserPlus,
  KeyRound,
  FileText,
  Wallet,
  TrendingUp,
  Settings,
  Menu,
  Search,
  Bell,
  X,
  CalendarCheck,
  LogOut,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { useAuth } from '../context/AuthContext';

const nav = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/calendar', label: 'Calendar', icon: CalendarDays },
  { to: '/app/appointments', label: 'Appointments', icon: ClipboardList },
  { to: '/app/customers', label: 'Customers', icon: Users },
  { to: '/app/services', label: 'Services', icon: Briefcase },
  { to: '/app/staff', label: 'Staff', icon: UserPlus },
  { to: '/app/team', label: 'Team', icon: KeyRound, ownerOnly: true },
  { to: '/app/invoices', label: 'Invoices', icon: FileText },
  { to: '/app/payments', label: 'Payments', icon: Wallet },
  { to: '/app/reports', label: 'Reports', icon: TrendingUp },
  { to: '/app/settings', label: 'Settings', icon: Settings, ownerOnly: true },
];

function SidebarContent({ onNavigate }) {
  const { session } = useAuth();
  const items = nav.filter((item) => !item.ownerOnly || session?.role === 'owner');

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 px-5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white">
          <CalendarCheck size={20} />
        </span>
        <span className="text-lg font-bold text-brand-900">ServiceFlow</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export default function DashboardLayout() {
  const [open, setOpen] = useState(false);
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const initials = (session?.user?.name || 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden border-r border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:block lg:w-64">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar (drawer) */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-white shadow-xl">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-4 rounded-lg p-1 text-slate-500 hover:bg-slate-100"
            >
              <X size={20} />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <Menu size={22} />
          </button>

          <div className="relative max-w-md flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Search customers or bookings..."
              className="h-10 w-full rounded-lg bg-slate-100 pl-9 pr-3 text-sm outline-none ring-brand-600 focus:bg-white focus:ring-2"
            />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button aria-label="Notifications" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100">
              <Bell size={20} />
            </button>
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-sm font-semibold text-white">
                {initials}
              </span>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium leading-4 text-slate-900">{session?.user?.name}</p>
                <p className="text-xs text-slate-500">
                  <span className="capitalize">{session?.role}</span> &middot; {session?.business?.name}
                </p>
              </div>
              <button
                onClick={handleLogout}
                aria-label="Log out"
                title="Log out"
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}