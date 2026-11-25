import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LinkIcon } from 'lucide-react';
import PasswordInput from '../../components/ui/PasswordInput';
import Button from '../../components/ui/Button';
import api from '../../api/axios';
import { useToast } from '../../context/ToastContext';
import { isStrongPassword } from '../../utils/validators';
import { getErrorMessage, getFieldErrors } from '../../utils/apiError';

function InvalidLink({ message }) {
  return (
    <div className="text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-red-100 text-red-600">
        <LinkIcon size={28} />
      </span>
      <h1 className="mt-5 text-2xl font-bold text-slate-900">Link not valid</h1>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
      <Link
        to="/forgot-password"
        className="mt-6 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
      >
        Request a new link
      </Link>
    </div>
  );
}

export default function ResetPassword() {
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [form, setForm] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [linkError, setLinkError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!token) {
    return <InvalidLink message="This reset link is incomplete. Please request a new one." />;
  }
  if (linkError) {
    return <InvalidLink message={linkError} />;
  }

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

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password: form.password });
      toast.success('Password updated. Please log in.');
      navigate('/login', { replace: true });
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);
      else if (err.response?.status === 400) setLinkError(getErrorMessage(err));
      else toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">Set a new password</h1>
      <p className="mt-1 text-sm text-slate-500">Choose a strong password for your account.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
        <PasswordInput
          label="New password"
          placeholder="Create a password"
          autoComplete="new-password"
          maxLength={72}
          hint="At least 8 characters, with a letter and a number"
          value={form.password}
          onChange={update('password')}
          error={errors.password}
        />
        <PasswordInput
          label="Confirm new password"
          placeholder="Repeat your password"
          autoComplete="new-password"
          maxLength={72}
          value={form.confirm}
          onChange={update('confirm')}
          error={errors.confirm}
        />
        <Button type="submit" loading={loading} className="w-full" size="lg">
          Update password
        </Button>
      </form>
    </>
  );
}