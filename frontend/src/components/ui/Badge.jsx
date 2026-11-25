import { cn } from '../../utils/cn';

const tones = {
  slate: 'bg-slate-100 text-slate-700',
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-blue-100 text-blue-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
};

export function Badge({ tone = 'slate', className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

// Appointments aur payments ke status ke liye aik hi rang-mapping poore project mein
const statusMap = {
  pending: { tone: 'amber', label: 'Pending' },
  confirmed: { tone: 'blue', label: 'Confirmed' },
  'checked-in': { tone: 'indigo', label: 'Checked-in' },
  'in-progress': { tone: 'purple', label: 'In progress' },
  completed: { tone: 'green', label: 'Completed' },
  cancelled: { tone: 'red', label: 'Cancelled' },
  'no-show': { tone: 'slate', label: 'No-show' },
  unpaid: { tone: 'red', label: 'Unpaid' },
  'partially-paid': { tone: 'amber', label: 'Partially paid' },
  paid: { tone: 'green', label: 'Paid' },
  'partially-refunded': { tone: 'orange', label: 'Partially refunded' },
  refunded: { tone: 'slate', label: 'Refunded' },
};

export function StatusBadge({ status }) {
  const item = statusMap[status] || { tone: 'slate', label: status };
  return <Badge tone={item.tone}>{item.label}</Badge>;
}