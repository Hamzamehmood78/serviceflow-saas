import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CalendarCheck, Check } from 'lucide-react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import OpeningHoursEditor from '../components/business/OpeningHoursEditor';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { validateHours, mapHourErrors } from '../utils/hours';
import { categories, timezones, currencies } from '../utils/options';
import { getErrorMessage, getFieldErrors } from '../utils/apiError';
import { cn } from '../utils/cn';

const steps = ['Business', 'Region', 'Opening hours'];

export default function Setup() {
  const toast = useToast();
  const navigate = useNavigate();
  const { updateBusiness } = useAuth();

  const [status, setStatus] = useState('loading');
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(null);
  const [hours, setHours] = useState([]);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const { data } = await api.get('/business');
      const b = data.data;
      setForm({
        name: b.name,
        category: b.category,
        phone: b.phone || '',
        address: b.address || '',
        timezone: b.timezone,
        currency: b.currency,
      });
      setHours([...b.openingHours].sort((a, c) => a.day - c.day));
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: '' }));
  };

  // Har step ka kaam chalata hai aur errors sambhalta hai
  const run = async (task) => {
    setSaving(true);
    try {
      await task();
      return true;
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors({ ...fieldErrors, ...mapHourErrors(fieldErrors) });
        toast.error('Please fix the highlighted fields');
      } else {
        toast.error(getErrorMessage(err));
      }
      return false;
    } finally {
      setSaving(false);
    }
  };

  const next = async () => {
    if (step === 0) {
      const found = {};
      if (form.name.trim().length < 2) found.name = 'Enter your business name';
      const phone = form.phone.replace(/[\s()]/g, '');
      if (phone && !/^\+?[0-9-]{7,15}$/.test(phone)) found.phone = 'Enter a valid phone number';
      setErrors(found);
      if (Object.keys(found).length > 0) return;

      const ok = await run(async () => {
        const { data } = await api.patch('/business', {
          name: form.name.trim(),
          category: form.category,
          phone: form.phone.trim(),
          address: form.address.trim(),
        });
        updateBusiness(data.data);
      });
      if (ok) setStep(1);
      return;
    }

    if (step === 1) {
      const ok = await run(async () => {
        const { data } = await api.patch('/business', {
          timezone: form.timezone,
          currency: form.currency,
        });
        updateBusiness(data.data);
      });
      if (ok) setStep(2);
      return;
    }

    const found = validateHours(hours);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.error('Please fix the highlighted times');
      return;
    }
    const ok = await run(async () => {
      await api.put('/business/opening-hours', { openingHours: hours });
      const { data } = await api.post('/business/complete-onboarding');
      updateBusiness(data.data);
    });
    if (ok) {
      toast.success('Your business is ready!');
      navigate('/app', { replace: true });
    }
  };

  const skip = async () => {
    const ok = await run(async () => {
      const { data } = await api.post('/business/complete-onboarding');
      updateBusiness(data.data);
    });
    if (ok) navigate('/app', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white">
            <CalendarCheck size={20} />
          </span>
          <span className="text-lg font-bold text-brand-900">ServiceFlow</span>
        </div>

        <h1 className="text-center text-2xl font-bold text-slate-900">Set up your business</h1>
        <p className="mt-1 text-center text-sm text-slate-500">
          It takes about 2 minutes. You can change everything later in Settings.
        </p>

        <ol className="mt-8 flex items-center justify-center gap-2 sm:gap-4">
          {steps.map((label, i) => (
            <li key={label} className="flex items-center gap-2">
              <span
                className={cn(
                  'grid h-8 w-8 place-items-center rounded-full text-sm font-semibold',
                  i < step && 'bg-green-600 text-white',
                  i === step && 'bg-brand-600 text-white',
                  i > step && 'bg-slate-200 text-slate-500'
                )}
              >
                {i < step ? <Check size={16} /> : i + 1}
              </span>
              <span className={cn('hidden text-sm sm:inline', i === step ? 'font-medium text-slate-900' : 'text-slate-500')}>
                {label}
              </span>
              {i < steps.length - 1 && <span className="mx-1 hidden h-px w-8 bg-slate-300 sm:block" />}
            </li>
          ))}
        </ol>

        <div className="mt-8">
          {status === 'loading' && <Skeleton className="h-80" />}

          {status === 'error' && (
            <EmptyState
              icon={AlertCircle}
              title="Could not load your business"
              message="Please check your connection and try again."
              action={<Button onClick={load}>Retry</Button>}
            />
          )}

          {status === 'ready' && (
            <Card>
              {step === 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="Business name"
                    maxLength={100}
                    value={form.name}
                    onChange={set('name')}
                    error={errors.name}
                    className="sm:col-span-2"
                  />
                  <Select
                    label="Category"
                    options={categories}
                    value={form.category}
                    onChange={set('category')}
                    error={errors.category}
                  />
                  <Input
                    label="Phone"
                    placeholder="0300-1234567"
                    maxLength={20}
                    value={form.phone}
                    onChange={set('phone')}
                    error={errors.phone}
                  />
                  <Input
                    label="Address"
                    maxLength={300}
                    value={form.address}
                    onChange={set('address')}
                    error={errors.address}
                    className="sm:col-span-2"
                  />
                </div>
              )}

              {step === 1 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select
                    label="Timezone"
                    options={timezones}
                    value={form.timezone}
                    onChange={set('timezone')}
                    error={errors.timezone}
                  />
                  <Select
                    label="Currency"
                    options={currencies}
                    value={form.currency}
                    onChange={set('currency')}
                    error={errors.currency}
                  />
                </div>
              )}

              {step === 2 && (
                <OpeningHoursEditor
                  value={hours}
                  onChange={(nextHours) => {
                    setHours(nextHours);
                    setErrors({});
                  }}
                  errors={errors}
                />
              )}

              <div className="mt-6 flex items-center justify-between gap-3">
                <div>
                  {step > 0 ? (
                    <Button variant="secondary" onClick={() => setStep((s) => s - 1)} disabled={saving}>
                      Back
                    </Button>
                  ) : (
                    <button
                      type="button"
                      onClick={skip}
                      disabled={saving}
                      className="text-sm font-medium text-slate-500 hover:text-slate-700"
                    >
                      Skip for now
                    </button>
                  )}
                </div>
                <Button onClick={next} loading={saving}>
                  {step === steps.length - 1 ? 'Finish setup' : 'Continue'}
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}