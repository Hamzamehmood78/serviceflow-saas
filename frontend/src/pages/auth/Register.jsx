import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Input from '../../components/ui/Input';
import PasswordInput from '../../components/ui/PasswordInput';
import Button from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { isEmail, isStrongPassword } from '../../utils/validators';
import { getErrorMessage, getFieldErrors } from '../../utils/apiError';

export default function Register() {
  const toast = useToast();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: '' }));
  };

  const validate = () => {
    const found = {};
    if (form.name.trim().length < 2) found.name = 'Enter your full name';
    if (!isEmail(form.email)) found.email = 'Enter a valid email address';
    if (!isStrongPassword(form.password)) {
      found.password = 'Use at least 8 characters with a letter and a number';
    }
    if (form.confirm !== form.password) found.confirm = 'Passwords do not match';
    return found;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setLoading(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
            toast.success('Account created. Please log in.');
      navigate('/login', { replace: true, state: { registeredEmail: form.email.trim() } });
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      if (Object.keys(fieldErrors).length > 0) setErrors(fieldErrors);
      else toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
      <p className="mt-1 text-sm text-slate-500">Start managing your business with ServiceFlow.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
        <Input
          label="Full name"
          placeholder="Ali Khan"
          autoComplete="name"
          maxLength={60}
          value={form.name}
          onChange={update('name')}
          error={errors.name}
        />
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          maxLength={100}
          value={form.email}
          onChange={update('email')}
          error={errors.email}
        />
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
        <Button type="submit" loading={loading} className="w-full" size="lg">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Log in
        </Link>
      </p>
    </>
  );
}