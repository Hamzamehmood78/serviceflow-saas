const tones = {
  brand: 'bg-brand-50 text-brand-700 hover:bg-brand-100 focus-visible:outline-brand-600',
  amber: 'bg-amber-50 text-amber-700 hover:bg-amber-100 focus-visible:outline-amber-600',
  green: 'bg-green-50 text-green-700 hover:bg-green-100 focus-visible:outline-green-600',
  red: 'bg-red-50 text-red-700 hover:bg-red-100 focus-visible:outline-red-600',
};

export default function ActionButton({ icon: Icon, label, tone = 'brand', onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 sm:h-8 sm:px-2.5 ${tones[tone]}`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}