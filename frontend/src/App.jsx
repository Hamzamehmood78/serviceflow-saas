import { Routes, Route, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import AcceptInvite from './pages/auth/AcceptInvite';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import HoursSettings from './pages/HoursSettings';
import Services from './pages/Services';
import Staff from './pages/Staff';
import StaffSchedule from './pages/StaffSchedule';
import Team from './pages/Team';
import Setup from './pages/Setup';
import ComponentsDemo from './pages/ComponentsDemo';
import PublicLayout from './layouts/PublicLayout';
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './routes/ProtectedRoute';
import GuestRoute from './routes/GuestRoute';
import OnboardingGate from './routes/OnboardingGate';
import PageHeader from './components/ui/PageHeader';
import EmptyState from './components/ui/EmptyState';

function ComingSoon({ title }) {
  const { pathname } = useLocation();
  const name = pathname.split('/').pop() || 'page';
  const heading = title || name.charAt(0).toUpperCase() + name.slice(1);
  return (
    <>
      <PageHeader title={heading} />
      <EmptyState title="Coming soon" message="This page will be built in a later phase." />
    </>
  );
}

function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-brand-900">404</h1>
        <p className="mt-2 text-slate-500">Page not found</p>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
      </Route>

      <Route element={<GuestRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
      </Route>

      {/* Server connection check (developer ke liye) */}
      <Route path="/status" element={<Home />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<OnboardingGate />}>
          <Route element={<ProtectedRoute roles={['owner']} />}>
            <Route path="/app/setup" element={<Setup />} />
          </Route>

          <Route path="/app" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="components" element={<ComponentsDemo />} />

            {/* Teeno roles dekh sakte hain (badalna sirf owner) */}
            <Route path="services" element={<Services />} />
            <Route path="staff" element={<Staff />} />

            {/* Sirf owner */}
            <Route element={<ProtectedRoute roles={['owner']} />}>
              <Route path="staff/:id/schedule" element={<StaffSchedule />} />
              <Route path="team" element={<Team />} />
              <Route path="settings" element={<Settings />} />
              <Route path="settings/hours" element={<HoursSettings />} />
            </Route>

            <Route path="*" element={<ComingSoon />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}