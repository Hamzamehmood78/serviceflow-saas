import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { isEmail } from '../../utils/validators';
import { getErrorMessage, getFieldErrors } from '../../utils/apiError';

const roles = [
  { value: 'receptionist', label: 'Receptionist (bookings, customers, billing)' },
  { value: 'staff', label: 'Staff (own schedule and appointments)' },
];

const emptyForm = { name: '', email: '', role: 'receptionist', staffId: '' };

export default function InviteModal({ open, onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [staffOptions, setStaffOptions] = useState([]);

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm);
    setErrors({});

    let active = true;
    api
      .get('/staff', { params: { status: 'current', limit: 100 } })
      .then(({ data }) => {
        if (!active) return;
        // Sirf wo staff jin ka abhi login nahi hai
        setStaffOptions(
          data.data.items
            .filter((s) => !s.hasLogin)
            .map((s) => ({ value: s.id, label: s.title ? `${s.name} (${s.title})` : s.name }))
        );
      })
      .catch(() => active && setStaffOptions([]));
    return () => {
      active = false;
    };
  }, [open]);

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = {};
    if (form.name.trim().length < 2) found.name = 'Enter the person\'s name';
    if (!isEmail(form.email)) found.email = 'Enter a valid email address';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      const payload = { name: form.name.trim(), email: form.email.trim(), role: form.role };
      if (form.role === 'staff' && form.staffId) payload.staffId = form.staffId;
      const { data } = await api.post('/team/invitations', payload);
      onCreated(data.data); // { invitation, inviteLink }
      onClose();
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);
      else toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? () => {} : onClose}
      title="Invite a team member"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="invite-form" loading={saving}>
            Create invitation
          </Button>
        </>
      }
    >
      <form id="invite-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Full name"
          placeholder="e.g. Rida Khan"
          maxLength={100}
          value={form.name}
          onChange={set('name')}
          error={errors.name}
        />
        <Input
          label="Email"
          type="email"
          placeholder="rida@example.com"
          maxLength={100}
          value={form.email}
          onChange={set('email')}
          error={errors.email}
        />
        <Select label="Role" options={roles} value={form.role} onChange={set('role')} error={errors.role} />
        {form.role === 'staff' && (
          <Select
            label="Link to staff profile (optional)"
            placeholder="Do not link"
            options={staffOptions}
            value={form.staffId}
            onChange={set('staffId')}
            error={errors.staffId}
          />
        )}
        <p className="text-xs text-slate-500">
          They will get a link to set their password. The link works once and expires in 48 hours.
        </p>
      </form>
    </Modal>
  );
}