import { Link } from 'react-router-dom';
import { cn } from '../../utils/cn';
import { variants, sizes } from './Button';

// Button jaisa dikhne wala link (page badalne ke liye)
export default function ButtonLink({ to, variant = 'primary', size = 'md', className, children, ...props }) {
  return (
    <Link
      to={to}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </Link>
  );
}