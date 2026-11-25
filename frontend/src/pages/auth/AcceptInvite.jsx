import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, LinkIcon } from 'lucide-react';
import Input from '../../components/ui/Input';
import PasswordInput from '../../components/ui/PasswordInput';
import Button from '../../components/ui/Button';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { isStrongPassword } from '../../utils/validators';
import { getErrorMessage, getFieldErrors } from '../../utils/apiError';

const roleLabel = { receptionist: 'receptionist', staff: 'staff member' };

function InvalidInvite({ message }) {
  return (
    <div className="text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-100 text-red-600">
        <LinkIcon size={28} />
      </span>
      <h1 className="mt-5 text-2xl font-bold text-slate-900">Invitation not valid</h1>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
      <p className="mt-2 text-sm text-slate-500">Ask the business owner to send you a new invitation.</p>
      <Link to="/login" className="mt-6 inline-block text-sm font-medium text-brand-600 hover:text-brand-700">
        Go to log in
      </Link>
    </div>
  );
}

export default function AcceptInvite() {
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [state, setState] = useState(token ? 'loading' : 'invalid'); // loading | ready | invalid
  const [invite, setInvite] = useState(null);
  const [message, setMessage] = useState('This invitation link is incomplete.');
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    api
      .get(`/invitations/${encodeURIComponent(token)}`)
      .then(({ data }) => {
        if (!active) return;
        setInvite(data.data);
        setState('ready');
      })
      .catch((err) => {
        if (!active) return;
        setMessage(getErrorMessage(err));
        setState('invalid');
      });
    return () => {
      active = false;
    };
  }, [token]);

  if (state === 'loading') {
    return (
      <div className="grid place-items-center py-16">
        <Loader2 className="animate-spin text-brand-600" size={32} />
      </div>
    );
  }
  if (state === 'invalid') return <InvalidInvite message={message} />;

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = {};
    if (!isStrongPassword(form.password)) {
      found.password = 'Use at least 8 characters with a letter and a number';
    }
    if (form.confirm !== form.password) found.confirm = 'Passwords do not match';
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      await api.post('/invitations/accept', { token, password: form.password });
      toast.success('Account created. Please log in.');
      navigate('/login', { replace: true, state: { registeredEmail: invite.email } });
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);
      else if (err.response?.status === 400 || err.response?.status === 409) {
        setMessage(getErrorMessage(err));
        setState('invalid');
      } else toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">Join {invite.businessName}</h1>
      <p className="mt-1 text-sm text-slate-500">
        You have been invited as a {roleLabel[invite.role]}. Set a password to create your account.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
        <Input label="Name" value={invite.name} readOnly disabled />
        <Input label="Email" value={invite.email} readOnly disabled />
        <PasswordInput
          label="Password"
          placeholder="Create a password"
          autoComplete="new-password"
          maxLength={72}
          hint="At least 8 characters, with a letter and a number"
          value={form.password}
          onChange={update('password')}
          error={errors.password}
        />
        <PasswordInput
          label="Confirm password"
          placeholder="Repeat your password"
          autoComplete="new-password"
          maxLength={72}
          value={form.confirm}
          onChange={update('confirm')}
          error={errors.confirm}
        />
        <Button type="submit" loading={saving} className="w-full" size="lg">
          Create my account
        </Button>
      </form>
    </>
  );
}