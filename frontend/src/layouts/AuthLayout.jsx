import { Link, Outlet } from 'react-router-dom';
import { CalendarCheck, Check } from 'lucide-react';

const points = [
  'Online bookings and walk-ins in one calendar',
  'Invoices, partial payments and receipts',
  'Each business keeps its own private data',
];

export default function AuthLayout() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left panel (sirf bari screen par) */}
      <div className="hidden bg-linear-to-br from-brand-700 to-brand-900 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/15">
            <CalendarCheck size={20} />
          </span>
          <span className="text-lg font-bold">ServiceFlow</span>
        </Link>
        <div>
          <h2 className="text-3xl font-bold leading-tight">
            Manage your bookings, customers and payments in one place.
          </h2>
          <ul className="mt-8 space-y-4">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-3 text-brand-100">
                <Check size={20} className="mt-0.5 shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-brand-200">&copy; {new Date().getFullYear()} ServiceFlow</p>
      </div>

      {/* Form wala hissa */}
      <div className="flex flex-col justify-center px-4 py-10 sm:px-12">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5 lg:hidden">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white">
            <CalendarCheck size={20} />
          </span>
          <span className="text-lg font-bold text-brand-900">ServiceFlow</span>
        </Link>
        <div className="mx-auto w-full max-w-sm">
          <Outlet />
        </div>
      </div>
    </div>
  );
}