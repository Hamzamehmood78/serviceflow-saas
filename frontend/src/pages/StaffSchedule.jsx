import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CalendarOff, RotateCcw, Save, Trash2 } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Badge } from '../components/ui/Badge';
import OpeningHoursEditor from '../components/business/OpeningHoursEditor';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import { validateHours, mapHourErrors, todayIn } from '../utils/hours';
import { dotClass } from '../utils/staffColors';
import { getErrorMessage, getFieldErrors } from '../utils/apiError';

const leaveTypes = [
  { value: 'leave', label: 'Leave' },
  { value: 'unavailable', label: 'Unavailable' },
];

const niceDate = (d) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

const niceRange = (start, end) => (start === end ? niceDate(start) : `${niceDate(start)} to ${niceDate(end)}`);

const emptyLeave = { startDate: '', endDate: '', type: 'leave', reason: '' };

export default function StaffSchedule() {
  const { id } = useParams();
  const toast = useToast();

  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [staff, setStaff] = useState(null);
  const [hours, setHours] = useState([]);
  const [customHours, setCustomHours] = useState(false);
  const [leaves, setLeaves] = useState([]);
  const [timezone, setTimezone] = useState('Asia/Karachi');

  const [hourErrors, setHourErrors] = useState({});
  const [savingHours, setSavingHours] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [leaveForm, setLeaveForm] = useState(emptyLeave);
  const [leaveErrors, setLeaveErrors] = useState({});
  const [adding, setAdding] = useState(false);
  const [toRemove, setToRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  const apply = (s) => {
    setHours(s.openingHours);
    setCustomHours(s.customHours);
    setLeaves(s.leaves);
    setTimezone(s.timezone);
  };

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [staffRes, scheduleRes] = await Promise.all([
        api.get(`/staff/${id}`),
        api.get(`/staff/${id}/schedule`),
      ]);
      setStaff(staffRes.data.data);
      apply(scheduleRes.data.data);
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, [id]);

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
      const { data } = await api.put(`/staff/${id}/schedule/hours`, { openingHours: hours });
      apply(data.data);
      toast.success('Working hours saved');
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

  const doReset = async () => {
    setResetting(true);
    try {
      const { data } = await api.post(`/staff/${id}/schedule/reset-hours`);
      apply(data.data);
      setHourErrors({});
      toast.success('Now following business hours');
      setConfirmReset(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setResetting(false);
    }
  };

  const setLeave = (field) => (e) => {
    const value = e.target.value;
    setLeaveForm((f) => {
      const next = { ...f, [field]: value };
      // Aasani ke liye: end date khali ya start se pehle ho to start jaisi kar do
      if (field === 'startDate' && (!f.endDate || f.endDate < value)) next.endDate = value;
      return next;
    });
    setLeaveErrors((er) => ({ ...er, [field]: '' }));
  };

  const addLeave = async (e) => {
    e.preventDefault();
    const found = {};
    if (!leaveForm.startDate) found.startDate = 'Choose a start date';
    if (!leaveForm.endDate) found.endDate = 'Choose an end date';
    if (leaveForm.startDate && leaveForm.endDate && leaveForm.endDate < leaveForm.startDate) {
      found.endDate = 'End date must be on or after the start date';
    }
    setLeaveErrors(found);
    if (Object.keys(found).length > 0) return;

    setAdding(true);
    try {
      const { data } = await api.post(`/staff/${id}/schedule/leaves`, {
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        type: leaveForm.type,
        reason: leaveForm.reason.trim(),
      });
      setLeaves((list) => [...list, data.data].sort((a, b) => a.startDate.localeCompare(b.startDate)));
      setLeaveForm(emptyLeave);
      setLeaveErrors({});
      toast.success('Leave added');
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) setLeaveErrors(fieldErrors);
      else toast.error(getErrorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  const confirmRemove = async () => {
    setRemoving(true);
    try {
      await api.delete(`/staff/${id}/schedule/leaves/${toRemove.id}`);
      setLeaves((list) => list.filter((l) => l.id !== toRemove.id));
      toast.success('Leave removed');
      setToRemove(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRemoving(false);
    }
  };

  const back = (
    <Link
      to="/app/staff"
      className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
    >
      <ArrowLeft size={16} /> Staff
    </Link>
  );

  if (status === 'loading') {
    return (
      <>
        {back}
        <PageHeader title="Schedule" />
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
        <PageHeader title="Schedule" />
        <EmptyState
          icon={AlertCircle}
          title="Could not load this schedule"
          message="The staff member may not exist, or the connection failed."
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
        title={
          <span className="inline-flex items-center gap-3">
            <span className={`h-3.5 w-3.5 rounded-full ${dotClass[staff.color]}`} />
            {staff.name}
          </span>
        }
        subtitle={`${staff.title ? `${staff.title} - ` : ''}Working hours and time off (timezone: ${timezone})`}
      />

      <div className="max-w-3xl space-y-6">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">Weekly working hours</h2>
              <p className="mt-1 text-sm text-slate-500">
                Bookings are possible only when both the business and this person are available.
              </p>
            </div>
            <Badge tone={customHours ? 'indigo' : 'slate'}>
              {customHours ? 'Custom hours' : 'Following business hours'}
            </Badge>
          </div>

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

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            {customHours && (
              <Button variant="secondary" onClick={() => setConfirmReset(true)}>
                <RotateCcw size={16} /> Use business hours
              </Button>
            )}
            <Button onClick={saveHours} loading={savingHours}>
              <Save size={16} /> Save hours
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-slate-900">Leave and unavailable periods</h2>
          <p className="mt-1 text-sm text-slate-500">Full days when this person cannot be booked.</p>

          <form onSubmit={addLeave} noValidate className="mt-4 grid gap-3 sm:grid-cols-2">
            <Input
              label="From"
              type="date"
              min={today}
              value={leaveForm.startDate}
              onChange={setLeave('startDate')}
              error={leaveErrors.startDate}
            />
            <Input
              label="To"
              type="date"
              min={leaveForm.startDate || today}
              value={leaveForm.endDate}
              onChange={setLeave('endDate')}
              error={leaveErrors.endDate}
            />
            <Select
              label="Type"
              options={leaveTypes}
              value={leaveForm.type}
              onChange={setLeave('type')}
              error={leaveErrors.type}
            />
            <Input
              label="Reason (optional)"
              placeholder="e.g. Annual leave"
              maxLength={100}
              value={leaveForm.reason}
              onChange={setLeave('reason')}
              error={leaveErrors.reason}
            />
            <div className="sm:col-span-2">
              <Button type="submit" loading={adding}>
                Add period
              </Button>
            </div>
          </form>

          <div className="mt-4">
            {leaves.length === 0 ? (
              <EmptyState
                icon={CalendarOff}
                title="No time off"
                message="You have not added any leave or unavailable periods."
              />
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl ring-1 ring-slate-200">
                {leaves.map((l) => (
                  <li
                    key={l.id}
                    className={`flex items-center justify-between gap-3 px-4 py-3 ${
                      l.endDate < today ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">{niceRange(l.startDate, l.endDate)}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge tone={l.type === 'leave' ? 'blue' : 'amber'} className="capitalize">
                          {l.type}
                        </Badge>
                        {l.reason && <span className="truncate text-xs text-slate-500">{l.reason}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => setToRemove(l)}
                      aria-label="Remove period"
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
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={doReset}
        loading={resetting}
        title="Use business hours?"
        message="This person's custom hours will be removed and they will follow your business opening hours. Their leave periods stay."
        confirmText="Use business hours"
      />

      <ConfirmDialog
        open={!!toRemove}
        onClose={() => setToRemove(null)}
        onConfirm={confirmRemove}
        loading={removing}
        danger
        title="Remove this period?"
        message={toRemove ? `${niceRange(toRemove.startDate, toRemove.endDate)} will be available for bookings again.` : ''}
        confirmText="Remove"
      />
    </>
  );
}