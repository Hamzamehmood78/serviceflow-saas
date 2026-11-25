import { ArrowRight } from 'lucide-react';
import ButtonLink from '../ui/ButtonLink';
import Card from '../ui/Card';
import { StatusBadge } from '../ui/Badge';

const sample = [
  { name: 'Ayesha Khan', service: 'Consultation', time: '10:30 AM', status: 'confirmed' },
  { name: 'Bilal Ahmed', service: 'Haircut', time: '11:00 AM', status: 'checked-in' },
  { name: 'Sara Malik', service: 'Consultation', time: '11:30 AM', status: 'pending' },
];

export default function Hero() {
  return (
    <section className="bg-linear-to-b from-brand-50 to-slate-50">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
        <div>
          <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-200">
            Booking, CRM and billing in one place
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Run appointments, customers and payments from one simple system
          </h1>
          <p className="mt-5 max-w-xl text-lg text-slate-600">
            ServiceFlow helps clinics, salons and other appointment-based businesses take online
            bookings, manage walk-ins, send invoices and track every payment.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink to="/register" size="lg">
              Start free <ArrowRight size={18} />
            </ButtonLink>
            <ButtonLink to="/login" variant="secondary" size="lg">
              Log in
            </ButtonLink>
          </div>
        </div>

        {/* Dashboard preview (sirf design ke liye) */}
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <p className="font-semibold text-slate-900">Today</p>
            <p className="text-sm text-slate-500">3 appointments</p>
          </div>
          <ul className="divide-y divide-slate-100">
            {sample.map((a) => (
              <li key={a.name} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">{a.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {a.service} &middot; {a.time}
                  </p>
                </div>
                <StatusBadge status={a.status} />
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between rounded-b-xl bg-brand-50 px-5 py-4">
            <p className="text-sm text-slate-600">Collected today</p>
            <p className="font-bold text-brand-700">Rs. 18,500</p>
          </div>
        </Card>
      </div>
    </section>
  );
}