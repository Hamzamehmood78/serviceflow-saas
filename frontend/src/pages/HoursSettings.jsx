import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Save, Trash2, CalendarX2 } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import OpeningHoursEditor from '../components/business/OpeningHoursEditor';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import { validateHours, mapHourErrors, todayIn } from '../utils/hours';
import { getErrorMessage, getFieldErrors } from '../utils/apiError';

const niceDate = (d) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export default function HoursSettings() {
  const toast = useToast();
  const [status, setStatus] = useState('loading');
  const [hours, setHours] = useState([]);
  const [closures, setClosures] = useState([]);
  const [timezone, setTimezone] = useState('Asia/Karachi');
  const [hourErrors, setHourErrors] = useState({});
  const [savingHours, setSavingHours] = useState(false);

  const [closureForm, setClosureForm] = useState({ date: '', reason: '' });
  const [closureErrors, setClosureErrors] = useState({});
  const [adding, setAdding] = useState(false);
  const [toRemove, setToRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const { data } = await api.get('/business');
      setHours([...data.data.openingHours].sort((a, b) => a.day - b.day));
      setClosures(data.data.closures);
      setTimezone(data.data.timezone);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveHours = async () => {
    const found = validateHours(hours);
    setHourErrors(found);
    if (Object.keys(found).length > 0) {
      toast.error('Please fix the highlighted times');
      return;
    }
    setSavingHours(true);
    try {
      await api.put('/business/opening-hours', { openingHours: hours });
      toast.success('Opening hours saved');
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setHourErrors(mapHourErrors(fieldErrors));
        toast.error('Please fix the highlighted times');
      } else {
        toast.error(getErrorMessage(err));
      }
    } finally {
      setSavingHours(false);
    }
  };

  const addClosure = async (e) => {
    e.preventDefault();
    if (!closureForm.date) {
      setClosureErrors({ date: 'Choose a date' });
      return;
    }
    setAdding(true);
    try {
      const { data } = await api.post('/business/closures', {
        date: closureForm.date,
        reason: closureForm.reason.trim(),
      });
      setClosures((list) => [...list, data.data].sort((a, b) => a.date.localeCompare(b.date)));
      setClosureForm({ date: '', reason: '' });
      setClosureErrors({});
      toast.success('Closure added');
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) setClosureErrors(fieldErrors);
      else toast.error(getErrorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  const confirmRemove = async () => {
    setRemoving(true);
    try {
      await api.delete(`/business/closures/${toRemove.id}`);
      setClosures((list) => list.filter((c) => c.id !== toRemove.id));
      toast.success('Closure removed');
      setToRemove(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRemoving(false);
    }
  };

  const back = (
    <Link
      to="/app/settings"
      className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
    >
      <ArrowLeft size={16} /> Business settings
    </Link>
  );

  if (status === 'loading') {
    return (
      <>
        {back}
        <PageHeader title="Opening hours and holidays" />
        <div className="max-w-3xl space-y-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-48" />
        </div>
      </>
    );
  }

  if (status === 'error') {
    return (
      <>
        {back}
        <PageHeader title="Opening hours and holidays" />
        <EmptyState
          icon={AlertCircle}
          title="Could not load your hours"
          message="Please check your connection and try again."
          action={<Button onClick={load}>Retry</Button>}
        />
      </>
    );
  }

  const today = todayIn(timezone);

  return (
    <>
      {back}
      <PageHeader
        title="Opening hours and holidays"
        subtitle={`Times are in your business timezone (${timezone}).`}
      />

      <div className="max-w-3xl space-y-6">
        <Card>
          <h2 className="font-semibold text-slate-900">Weekly opening hours</h2>
          <p className="mt-1 text-sm text-slate-500">
            Untick a day to mark it closed. Add breaks like lunch (up to 3 per day).
          </p>
          <div className="mt-2">
            <OpeningHoursEditor
              value={hours}
              onChange={(next) => {
                setHours(next);
                setHourErrors({});
              }}
              errors={hourErrors}
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={saveHours} loading={savingHours}>
              <Save size={16} /> Save hours
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-slate-900">Holidays and closures</h2>
          <p className="mt-1 text-sm text-slate-500">Days your business is closed (full day).</p>

          <form onSubmit={addClosure} noValidate className="mt-4 grid gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-start">
            <Input
              label="Date"
              type="date"
              min={today}
              value={closureForm.date}
              onChange={(e) => {
                setClosureForm((f) => ({ ...f, date: e.target.value }));
                setClosureErrors({});
              }}
              error={closureErrors.date}
            />
            <Input
              label="Reason (optional)"
              placeholder="e.g. Eid holiday"
              maxLength={100}
              value={closureForm.reason}
              onChange={(e) => setClosureForm((f) => ({ ...f, reason: e.target.value }))}
              error={closureErrors.reason}
            />
            <Button type="submit" loading={adding} className="sm:mt-[26px]">
              Add
            </Button>
          </form>

          <div className="mt-4">
            {closures.length === 0 ? (
              <EmptyState
                icon={CalendarX2}
                title="No closures"
                message="You have not added any holidays or special closures."
              />
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
                {closures.map((c) => (
                  <li
                    key={c.id}
                    className={`flex items-center justify-between gap-3 px-4 py-3 ${
                      c.date < today ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">{niceDate(c.date)}</p>
                      {c.reason && <p className="truncate text-xs text-slate-500">{c.reason}</p>}
                    </div>
                    <button
                      onClick={() => setToRemove(c)}
                      aria-label="Remove closure"
                      className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600"
                    >
                      <Trash2 size={18} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={!!toRemove}
        onClose={() => setToRemove(null)}
        onConfirm={confirmRemove}
        loading={removing}
        danger
        title="Remove this closure?"
        message={toRemove ? `${niceDate(toRemove.date)} will be open again for bookings.` : ''}
        confirmText="Remove"
      />
    </>
  );
}