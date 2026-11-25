import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import EmptyState from '../components/ui/EmptyState';

// roles dena optional hai: <ProtectedRoute roles={['owner']} />
export default function ProtectedRoute({ roles }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="animate-spin text-brand-600" size={32} />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && !roles.includes(session.role)) {
    return (
           <div className="grid min-h-[60vh] place-items-center p-4">
        <EmptyState
          icon={ShieldAlert}
          title="No access"
          message="You do not have permission to view this page."
        />
      </div>
    );
  }

  return <Outlet />;
}