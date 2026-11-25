import { Check } from 'lucide-react';
import ButtonLink from '../ui/ButtonLink';
import { cn } from '../../utils/cn';

// NOTE: Ye sirf sample (demo) plans hain. Asli prices baad mein tay hon gi.
const plans = [
  {
    name: 'Starter',
    price: 'Free',
    note: 'For trying it out',
    features: ['1 location', 'Up to 2 staff', 'Online booking page', 'Manual payment records'],
  },
  {
    name: 'Business',
    price: 'Rs. 2,999',
    note: 'per month',
    popular: true,
    features: ['Up to 10 staff', 'Invoices and receipts', 'Reports and CSV export', 'Email notifications'],
  },
  {
    name: 'Pro',
    price: 'Rs. 5,999',
    note: 'per month',
    features: ['Unlimited staff', 'Everything in Business', 'Priority support', 'Online payments (coming soon)'],
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 bg-slate-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-slate-900">Simple pricing</h2>
          <p className="mt-3 text-slate-600">Sample plans for the demo. Final pricing will be announced later.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={cn(
                'flex flex-col rounded-xl bg-white p-6 shadow-sm ring-1',
                p.popular ? 'ring-2 ring-brand-600' : 'ring-slate-200'
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">{p.name}</h3>
                {p.popular && (
                  <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-medium text-brand-700">
                    Popular
                  </span>
                )}
              </div>
              <p className="mt-4 text-3xl font-bold text-slate-900">{p.price}</p>
              <p className="text-sm text-slate-500">{p.note}</p>
              <ul className="mt-6 flex-1 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                    <Check size={16} className="mt-0.5 shrink-0 text-green-600" />
                    {f}
                  </li>
                ))}
              </ul>
              <ButtonLink to="/register" variant={p.popular ? 'primary' : 'secondary'} className="mt-8 w-full">
                Get started
              </ButtonLink>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}