import { Stethoscope, Scissors, Sparkles, Wrench, Camera, GraduationCap } from 'lucide-react';

const industries = [
  { icon: Stethoscope, label: 'Clinics' },
  { icon: Scissors, label: 'Salons and barbers' },
  { icon: Sparkles, label: 'Spas' },
  { icon: Wrench, label: 'Auto workshops' },
  { icon: Camera, label: 'Photo studios' },
  { icon: GraduationCap, label: 'Tutors and trainers' },
];

export default function Industries() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-slate-900">Built for appointment-based businesses</h2>
          <p className="mt-3 text-slate-600">Configure services, prices and staff once. Use it for almost any service business.</p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {industries.map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-3 rounded-xl bg-slate-50 p-5 text-center ring-1 ring-slate-200">
              <Icon size={26} className="text-brand-600" />
              <span className="text-sm font-medium text-slate-700">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}