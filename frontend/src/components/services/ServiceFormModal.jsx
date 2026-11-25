import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { toMinor, fromMinor } from '../../utils/money';
import { getErrorMessage, getFieldErrors } from '../../utils/apiError';

const emptyForm = {
  name: '',
  category: '',
  description: '',
  durationMinutes: '30',
  price: '',
  bufferBeforeMinutes: '0',
  bufferAfterMinutes: '0',
  bookableOnline: true,
};

const toForm = (s) => ({
  name: s.name,
  category: s.category || '',
  description: s.description || '',
  durationMinutes: String(s.durationMinutes),
  price: fromMinor(s.priceMinor),
  bufferBeforeMinutes: String(s.bufferBeforeMinutes),
  bufferAfterMinutes: String(s.bufferAfterMinutes),
  bookableOnline: s.bookableOnline,
});

const isWhole = (text, min, max) => {
  const raw = String(text).trim();
  const n = Number(raw);
  return raw !== '' && Number.isInteger(n) && n >= min && n <= max;
};

// service dene par edit, nahi dene par naya banta hai
export default function ServiceFormModal({ open, onClose, service, currency, onSaved }) {
  const toast = useToast();
  const editing = !!service;
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(service ? toForm(service) : emptyForm);
      setErrors({});
    }
  }, [open, service]);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: '' }));
  };

  const validate = () => {
    const found = {};
    if (form.name.trim().length < 2) found.name = 'Enter a service name';
    if (!isWhole(form.durationMinutes, 5, 480)) found.durationMinutes = 'Enter 5 to 480 minutes';
    if (toMinor(form.price) === null) found.price = 'Enter a valid price, like 1500 or 1500.50';
    if (!isWhole(form.bufferBeforeMinutes, 0, 120)) found.bufferBeforeMinutes = 'Enter 0 to 120';
    if (!isWhole(form.bufferAfterMinutes, 0, 120)) found.bufferAfterMinutes = 'Enter 0 to 120';
    return found;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const payload = {
      name: form.name.trim(),
      category: form.category.trim(),
      description: form.description.trim(),
      durationMinutes: Number(form.durationMinutes),
      priceMinor: toMinor(form.price),
      bufferBeforeMinutes: Number(form.bufferBeforeMinutes),
      bufferAfterMinutes: Number(form.bufferAfterMinutes),
      bookableOnline: form.bookableOnline,
    };

    setSaving(true);
    try {
      const { data } = editing
        ? await api.patch(`/services/${service.id}`, payload)
        : await api.post('/services', payload);
      toast.success(editing ? 'Service updated' : 'Service created');
      onSaved(data.data);
      onClose();
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) {
        const { priceMinor, ...rest } = fieldErrors;
        setErrors(priceMinor ? { ...rest, price: priceMinor } : rest);
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
      title={editing ? 'Edit service' : 'Add service'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="service-form" loading={saving}>
            {editing ? 'Save changes' : 'Add service'}
          </Button>
        </>
      }
    >
      <form id="service-form" onSubmit={handleSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Service name"
          placeholder="e.g. Consultation"
          maxLength={100}
          value={form.name}
          onChange={set('name')}
          error={errors.name}
          className="sm:col-span-2"
        />
        <Input
          label="Category (optional)"
          placeholder="e.g. General"
          maxLength={50}
          value={form.category}
          onChange={set('category')}
          error={errors.category}
          className="sm:col-span-2"
        />
        <Input
          label="Duration (minutes)"
          type="number"
          inputMode="numeric"
          value={form.durationMinutes}
          onChange={set('durationMinutes')}
          error={errors.durationMinutes}
        />
        <Input
          label={`Price (${currency})`}
          inputMode="decimal"
          placeholder="1500"
          value={form.price}
          onChange={set('price')}
          error={errors.price}
        />
        <Input
          label="Buffer before (minutes)"
          type="number"
          inputMode="numeric"
          value={form.bufferBeforeMinutes}
          onChange={set('bufferBeforeMinutes')}
          error={errors.bufferBeforeMinutes}
        />
        <Input
          label="Buffer after (minutes)"
          type="number"
          inputMode="numeric"
          value={form.bufferAfterMinutes}
          onChange={set('bufferAfterMinutes')}
          error={errors.bufferAfterMinutes}
        />
        <Textarea
          label="Description (optional)"
          maxLength={500}
          value={form.description}
          onChange={set('description')}
          error={errors.description}
          className="sm:col-span-2"
        />
        <label className="flex items-center gap-3 text-sm text-slate-700 sm:col-span-2">
          <input
            type="checkbox"
            checked={form.bookableOnline}
            onChange={(e) => setForm((f) => ({ ...f, bookableOnline: e.target.checked }))}
            className="h-4 w-4 rounded border-slate-300 accent-brand-600"
          />
          Customers can book this service online
        </label>
      </form>
    </Modal>
  );
}