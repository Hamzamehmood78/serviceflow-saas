import { useEffect, useState } from 'react';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Wallet,
  AlertCircle,
  UserPlus,
  CalendarX2,
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Card from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { StatusBadge } from '../components/ui/Badge';

// Sample data: Phase 7 mein asli data se badal jaye ga
const stats = [
  { icon: CalendarCheck, label: "Today's appointments", value: '12' },
  { icon: CheckCircle2, label: 'Completed', value: '7' },
  { icon: XCircle, label: 'Cancelled / no-show', value: '1' },
  { icon: Wallet, label: 'Collected today', value: 'Rs. 18,500' },
  { icon: AlertCircle, label: 'Outstanding', value: 'Rs. 4,200' },
  { icon: UserPlus, label: 'New customers', value: '5' },
];

const revenue = [
  { day: 'Mon', amount: 12000 },
  { day: 'Tue', amount: 15500 },
  { day: 'Wed', amount: 9800 },
  { day: 'Thu', amount: 18500 },
  { day: 'Fri', amount: 21000 },
  { day: 'Sat', amount: 24500 },
  { day: 'Sun', amount: 7000 },
];

const upcoming = [
  { name: 'Ayesha Khan', service: 'Consultation', time: '10:30 AM', status: 'confirmed' },
  { name: 'Bilal Ahmed', service: 'Follow-up', time: '11:00 AM', status: 'checked-in' },
  { name: 'Sara Malik', service: 'Consultation', time: '11:30 AM', status: 'pending' },
  { name: 'Usman Ali', service: 'Consultation', time: '12:15 PM', status: 'confirmed' },
];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Loading state dikhane ke liye chhoti si delay (asli API baad mein)
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  if (loading) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle={today} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-80" />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Dashboard" subtitle={`${today} (sample data)`} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((s) => (
          <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="font-semibold text-slate-900">Collections this week</h2>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} width={48} />
                <Tooltip formatter={(v) => `Rs. ${Number(v).toLocaleString()}`} />
                <Bar dataKey="amount" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-slate-900">Upcoming appointments</h2>
          {upcoming.length === 0 ? (
            <div className="mt-4">
              <EmptyState icon={CalendarX2} title="No appointments" message="Nothing scheduled for today." />
            </div>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {upcoming.map((a) => (
                <li key={a.name} className="flex items-center justify-between gap-3 py-3">
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
          )}
        </Card>
      </div>
    </>
  );
}