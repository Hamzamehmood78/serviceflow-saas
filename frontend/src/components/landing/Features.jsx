import { Globe, ClipboardList, Clock, Users, Receipt, TrendingUp } from 'lucide-react';
import Card from '../ui/Card';

const features = [
  { icon: Globe, title: 'Online booking page', text: 'Give customers a public page where they pick a service, a time and book in a few taps.' },
  { icon: ClipboardList, title: 'Walk-in and phone bookings', text: 'Reception can add walk-in and phone appointments in seconds, with daily token numbers.' },
  { icon: Clock, title: 'Staff and schedules', text: 'Set working hours, breaks and leave. Double bookings are blocked automatically.' },
  { icon: Users, title: 'Customer records', text: 'Search customers fast and see their visits, invoices and outstanding balance in one profile.' },
  { icon: Receipt, title: 'Invoices and payments', text: 'Create invoices, record cash, bank or card payments, accept partial payments and print receipts.' },
  { icon: TrendingUp, title: 'Reports you can trust', text: 'Daily collections, outstanding invoices and appointment reports, with CSV export.' },
];

export default function Features() {
  return (
    <section id="features" className="scroll-mt-20 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-slate-900">Everything your front desk needs</h2>
          <p className="mt-3 text-slate-600">One tool instead of notebooks, spreadsheets and chat messages.</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <Icon size={22} />
              </span>
              <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm text-slate-600">{text}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}