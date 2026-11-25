import { useCallback, useEffect, useState } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import Button from '../components/ui/Button';
import ButtonLink from '../components/ui/ButtonLink';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { isEmail } from '../utils/validators';
import { getErrorMessage, getFieldErrors } from '../utils/apiError';
import { categories, timezones, currencies } from '../utils/options';

const slotOptions = [10, 15, 20, 30, 45, 60].map((n) => ({ value: String(n), label: `${n} minutes` }));

const ranges = {
  minLeadTimeHours: [0, 168],
  bookingHorizonDays: [1, 365],
  freeCancellationHours: [0, 720],
  defaultDurationMinutes: [5, 480],
};

const toForm = (b) => ({
  name: b.name,
  slug: b.slug,
  category: b.category,
  description: b.description || '',
  phone: b.phone || '',
  email: b.email || '',
  address: b.address || '',
  timezone: b.timezone,
  currency: b.currency,
  onlineBookingEnabled: b.settings.onlineBookingEnabled,
  slotIntervalMinutes: String(b.settings.slotIntervalMinutes),
  minLeadTimeHours: String(b.settings.minLeadTimeHours),
  bookingHorizonDays: String(b.settings.bookingHorizonDays),
  freeCancellationHours: String(b.settings.freeCancellationHours),
  defaultDurationMinutes: String(b.settings.defaultDurationMinutes),
});

// Server ke "settings.xyz" errors ko form ke field naam par laao
const mapServerErrors = (fieldErrors) =>
  Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k.replace('settings.', ''), v]));

export default function Settings() {
  const toast = useToast();
  const { updateBusiness } = useAuth();
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const { data } = await api.get('/business');
      setForm(toForm(data.data));
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

  const validate = () => {
    const found = {};
    const slug = form.slug.trim().toLowerCase();
    if (form.name.trim().length < 2) found.name = 'Enter your business name';
    if (slug.length < 3 || slug.length > 40 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      found.slug = 'Use 3 to 40 letters, numbers or single hyphens';
    }
    if (form.email.trim() && !isEmail(form.email)) found.email = 'Enter a valid email address';
    const phone = form.phone.replace(/[\s()]/g, '');
    if (phone && !/^\+?[0-9-]{7,15}$/.test(phone)) found.phone = 'Enter a valid phone number';
    for (const [field, [min, max]] of Object.entries(ranges)) {
      const raw = String(form[field]).trim();
      const n = Number(raw);
      if (raw === '' || !Number.isInteger(n) || n < min || n > max) {
        found[field] = `Enter a whole number from ${min} to ${max}`;
      }
    }
    return found;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) {
      toast.error('Please fix the highlighted fields');
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.patch('/business', {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        category: form.category,
        description: form.description.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        timezone: form.timezone,
        currency: form.currency,
        settings: {
          onlineBookingEnabled: form.onlineBookingEnabled,
          slotIntervalMinutes: Number(form.slotIntervalMinutes),
          minLeadTimeHours: Number(form.minLeadTimeHours),
          bookingHorizonDays: Number(form.bookingHorizonDays),
          freeCancellationHours: Number(form.freeCancellationHours),
          defaultDurationMinutes: Number(form.defaultDurationMinutes),
        },
      });
      setForm(toForm(data.data));
      updateBusiness(data.data);
      toast.success('Settings saved');
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(mapServerErrors(fieldErrors));
        toast.error('Please fix the highlighted fields');
      } else {
        toast.error(getErrorMessage(err));
      }
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading') {
    return (
      <>
        <PageHeader title="Business settings" />
        <div className="max-w-3xl space-y-6">
          <Skeleton className="h-72" />
          <Skeleton className="h-40" />
          <Skeleton className="h-64" />
        </div>
      </>
    );
  }

  if (status === 'error') {
    return (
      <>
        <PageHeader title="Business settings" />
        <EmptyState
          icon={AlertCircle}
          title="Could not load settings"
          message="Please check your connection and try again."
          action={<Button onClick={load}>Retry</Button>}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Business settings"
        subtitle="Your business profile, booking link and booking rules."
        actions={
          <ButtonLink to="/app/settings/hours" variant="secondary">
            Opening hours and holidays
          </ButtonLink>
        }
      />

      <form onSubmit={handleSubmit} noValidate className="max-w-3xl space-y-6">
        <Card>
          <h2 className="font-semibold text-slate-900">Business profile</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
              label="Business email"
              type="email"
              placeholder="info@yourbusiness.com"
              maxLength={100}
              value={form.email}
              onChange={set('email')}
              error={errors.email}
              className="sm:col-span-2"
            />
            <Input
              label="Address"
              maxLength={300}
              value={form.address}
              onChange={set('address')}
              error={errors.address}
              className="sm:col-span-2"
            />
            <Textarea
              label="Description"
              maxLength={1000}
              placeholder="A short description customers will see"
              value={form.description}
              onChange={set('description')}
              error={errors.description}
              className="sm:col-span-2"
            />
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-slate-900">Booking link</h2>
          <div className="mt-4">
            <Input
              label="Link name"
              maxLength={40}
              value={form.slug}
              onChange={set('slug')}
              error={errors.slug}
              hint={`Your booking page will be: ${window.location.origin}/b/${
                form.slug.trim().toLowerCase() || 'your-business'
              } (the page itself comes in a later phase)`}
            />
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-slate-900">Regional settings</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
        </Card>

        <Card>
          <h2 className="font-semibold text-slate-900">Booking rules</h2>
          <label className="mt-4 flex items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.onlineBookingEnabled}
              onChange={(e) => setForm((f) => ({ ...f, onlineBookingEnabled: e.target.checked }))}
              className="h-4 w-4 rounded border-slate-300 accent-brand-600"
            />
            Accept online bookings
          </label>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Select
              label="Time slot interval"
              options={slotOptions}
              value={form.slotIntervalMinutes}
              onChange={set('slotIntervalMinutes')}
              error={errors.slotIntervalMinutes}
            />
            <Input
              label="Default appointment length (minutes)"
              type="number"
              inputMode="numeric"
              value={form.defaultDurationMinutes}
              onChange={set('defaultDurationMinutes')}
              error={errors.defaultDurationMinutes}
            />
            <Input
              label="Minimum notice before booking (hours)"
              type="number"
              inputMode="numeric"
              value={form.minLeadTimeHours}
              onChange={set('minLeadTimeHours')}
              error={errors.minLeadTimeHours}
            />
            <Input
              label="Book up to (days ahead)"
              type="number"
              inputMode="numeric"
              value={form.bookingHorizonDays}
              onChange={set('bookingHorizonDays')}
              error={errors.bookingHorizonDays}
            />
            <Input
              label="Free cancellation until (hours before)"
              type="number"
              inputMode="numeric"
              value={form.freeCancellationHours}
              onChange={set('freeCancellationHours')}
              error={errors.freeCancellationHours}
            />
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" loading={saving} size="lg">
            <Save size={18} /> Save changes
          </Button>
        </div>
      </form>
    </>
  );
}