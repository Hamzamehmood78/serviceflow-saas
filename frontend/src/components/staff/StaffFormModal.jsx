import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { isEmail } from '../../utils/validators';
import { COLOR_KEYS, dotClass } from '../../utils/staffColors';
import { cn } from '../../utils/cn';
import { getErrorMessage, getFieldErrors } from '../../utils/apiError';

const emptyForm = {
  name: '',
  title: '',
  email: '',
  phone: '',
  color: 'indigo',
  bookableOnline: true,
  serviceIds: [],
};

const toForm = (s) => ({
  name: s.name,
  title: s.title || '',
  email: s.email || '',
  phone: s.phone || '',
  color: s.color,
  bookableOnline: s.bookableOnline,
  serviceIds: s.services.filter((x) => x.status !== 'archived').map((x) => x.id),
});

// staff dene par edit, nahi dene par naya banta hai
export default function StaffFormModal({ open, onClose, staff, onSaved }) {
  const toast = useToast();
  const editing = !!staff;
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [services, setServices] = useState([]);
  const [svcState, setSvcState] = useState('loading'); // loading | ready | error

  useEffect(() => {
    if (!open) return;
    setForm(staff ? toForm(staff) : emptyForm);
    setErrors({});

    let active = true;
    setSvcState('loading');
    api
      .get('/services', { params: { status: 'current', limit: 100 } })
      .then(({ data }) => {
        if (!active) return;
        setServices(data.data.items);
        setSvcState('ready');
      })
      .catch(() => active && setSvcState('error'));
    return () => {
      active = false;
    };
  }, [open, staff]);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: '' }));
  };

  const toggleService = (id) => {
    setForm((f) => ({
      ...f,
      serviceIds: f.serviceIds.includes(id) ? f.serviceIds.filter((x) => x !== id) : [...f.serviceIds, id],
    }));
    setErrors((er) => ({ ...er, serviceIds: '' }));
  };

  const validate = () => {
    const found = {};
    if (form.name.trim().length < 2) found.name = 'Enter the staff name';
    if (form.email.trim() && !isEmail(form.email)) found.email = 'Enter a valid email address';
    const phone = form.phone.replace(/[\s()]/g, '');
    if (phone && !/^\+?[0-9-]{7,15}$/.test(phone)) found.phone = 'Enter a valid phone number';
    return found;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const payload = {
      name: form.name.trim(),
      title: form.title.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      color: form.color,
      bookableOnline: form.bookableOnline,
      serviceIds: form.serviceIds,
    };

    setSaving(true);
    try {
      const { data } = editing
        ? await api.patch(`/staff/${staff.id}`, payload)
        : await api.post('/staff', payload);
      toast.success(editing ? 'Staff member updated' : 'Staff member added');
      onSaved(data.data);
      onClose();
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        const serviceError = Object.entries(fieldErrors).find(([k]) => k.startsWith('serviceIds'));
        const rest = Object.fromEntries(Object.entries(fieldErrors).filter(([k]) => !k.startsWith('serviceIds')));
        setErrors(serviceError ? { ...rest, serviceIds: serviceError[1] } : rest);
      } else {
        toast.error(getErrorMessage(err));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? () => {} : onClose}
      title={editing ? 'Edit staff member' : 'Add staff member'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="staff-form" loading={saving}>
            {editing ? 'Save changes' : 'Add staff member'}
          </Button>
        </>
      }
    >
      <form id="staff-form" onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Full name"
          placeholder="e.g. Dr Ahmed"
          maxLength={100}
          value={form.name}
          onChange={set('name')}
          error={errors.name}
        />
        <Input
          label="Title (optional)"
          placeholder="e.g. Dentist"
          maxLength={100}
          value={form.title}
          onChange={set('title')}
          error={errors.title}
        />
        <Input
          label="Email (optional)"
          type="email"
          maxLength={100}
          value={form.email}
          onChange={set('email')}
          error={errors.email}
        />
        <Input
          label="Phone (optional)"
          placeholder="0300-1234567"
          maxLength={20}
          value={form.phone}
          onChange={set('phone')}
          error={errors.phone}
        />

        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm font-medium text-slate-700">Calendar colour</p>
          <div className="flex flex-wrap gap-2">
            {COLOR_KEYS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Colour ${c}`}
                aria-pressed={form.color === c}
                onClick={() => setForm((f) => ({ ...f, color: c }))}
                className={cn(
                  'h-8 w-8 rounded-full ring-offset-2 transition',
                  dotClass[c],
                  form.color === c ? 'ring-2 ring-slate-900' : 'hover:scale-110'
                )}
              />
            ))}
          </div>
          {errors.color && <p className="mt-1 text-xs text-red-600">{errors.color}</p>}
        </div>

        <div className="sm:col-span-2">
          <p className="mb-1.5 text-sm font-medium text-slate-700">Services this person provides</p>
          <div className="max-h-44 overflow-y-auto rounded-lg p-3 ring-1 ring-slate-300">
            {svcState === 'loading' && <p className="text-sm text-slate-500">Loading services...</p>}
            {svcState === 'error' && (
              <p className="text-sm text-red-600">Could not load services. Close and try again.</p>
            )}
            {svcState === 'ready' && services.length === 0 && (
              <p className="text-sm text-slate-500">No services yet. Add services first, then come back.</p>
            )}
            {svcState === 'ready' && services.length > 0 && (
              <ul className="space-y-2">
                {services.map((s) => (
                  <li key={s.id}>
                    <label className="flex items-center gap-3 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={form.serviceIds.includes(s.id)}
                        onChange={() => toggleService(s.id)}
                        className="h-4 w-4 rounded border-slate-300 accent-brand-600"
                      />
                      {s.name}
                      {s.status === 'inactive' && <span className="text-xs text-amber-600">(inactive)</span>}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {errors.serviceIds && <p className="mt-1 text-xs text-red-600">{errors.serviceIds}</p>}
        </div>

        <label className="flex items-center gap-3 text-sm text-slate-700 sm:col-span-2">
          <input
            type="checkbox"
            checked={form.bookableOnline}
            onChange={(e) => setForm((f) => ({ ...f, bookableOnline: e.target.checked }))}
            className="h-4 w-4 rounded border-slate-300 accent-brand-600"
          />
          Customers can choose this person when booking online
        </label>
      </form>
    </Modal>
  );
}