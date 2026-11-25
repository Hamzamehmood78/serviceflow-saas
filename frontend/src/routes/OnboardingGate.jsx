import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Naya owner (setup adhura) ho to pehle wizard par bhejo
export default function OnboardingGate() {
  const { session } = useAuth();
  const { pathname } = useLocation();

  const needsSetup = session?.role === 'owner' && !session?.business?.onboardingCompleted;

  if (needsSetup && pathname !== '/app/setup') return <Navigate to="/app/setup" replace />;
  if (!needsSetup && pathname === '/app/setup') return <Navigate to="/app" replace />;
  return <Outlet />;
}