import { ChevronDown } from 'lucide-react';

const faqs = [
  { q: 'Can customers book online?', a: 'Yes. Every business gets a public booking page where customers choose a service, a time slot and enter their contact details. No account is needed.' },
  { q: 'Can my receptionist add walk-in and phone bookings?', a: 'Yes. Reception can create appointments for walk-in and phone customers from the dashboard. Each booking is labelled with its source.' },
  { q: 'How are payments handled?', a: 'You can record cash, bank transfer, card/POS and custom payments against an invoice, including partial payments and refunds. Online gateway payments are planned for a later version.' },
  { q: 'Does it work for more than one business?', a: 'Yes. ServiceFlow is multi-tenant, so each business has its own separate data that other businesses cannot see.' },
  { q: 'Does it work on mobile?', a: 'Yes. ServiceFlow works in the browser on desktop, tablet and mobile phones.' },
];

export default function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="text-center text-3xl font-bold text-slate-900">Frequently asked questions</h2>
        <div className="mt-10 space-y-3">
          {faqs.map((f) => (
            <details key={f.q} className="group rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-slate-900 [&::-webkit-details-marker]:hidden">
                {f.q}
                <ChevronDown size={18} className="shrink-0 transition group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm text-slate-600">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}