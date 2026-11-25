import { cn } from '../../utils/cn';

export default function Card({ className, children }) {
  return (
    <div className={cn('rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200', className)}>
      {children}
    </div>
  );
}