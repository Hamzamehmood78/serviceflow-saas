import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Login/register pages: pehle se login ho to dashboard par bhej do
export default function GuestRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="animate-spin text-brand-600" size={32} />
      </div>
    );
  }

  if (session) {
    const to = location.state?.from?.pathname || '/app';
    return <Navigate to={to} replace />;
  }

  return <Outlet />;
}