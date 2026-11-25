import { forwardRef, useId } from 'react';
import { cn } from '../../utils/cn';

const Textarea = forwardRef(function Textarea({ label, error, hint, className, id, ...props }, ref) {
  const autoId = useId();
  const areaId = id || autoId;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={areaId} className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={areaId}
        rows={3}
        aria-invalid={!!error}
        className={cn(
          'w-full rounded-lg bg-white px-3 py-2 text-sm text-slate-900 outline-none ring-1 transition placeholder:text-slate-400 focus:ring-2',
          error ? 'ring-red-400 focus:ring-red-500' : 'ring-slate-300 focus:ring-brand-600'
        )}
        {...props}
      />
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
});

export default Textarea;