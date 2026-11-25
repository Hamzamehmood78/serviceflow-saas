import { forwardRef, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../utils/cn';

const PasswordInput = forwardRef(function PasswordInput({ label, error, hint, className, id, ...props }, ref) {
  const autoId = useId();
  const inputId = id || autoId;
  const [show, setShow] = useState(false);

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={show ? 'text' : 'password'}
          aria-invalid={!!error}
          className={cn(
            'h-10 w-full rounded-lg bg-white pl-3 pr-10 text-sm text-slate-900 outline-none ring-1 transition placeholder:text-slate-400 focus:ring-2',
            error ? 'ring-red-400 focus:ring-red-500' : 'ring-slate-300 focus:ring-brand-600'
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-700"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
});

export default PasswordInput;