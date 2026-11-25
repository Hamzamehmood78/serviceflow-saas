import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, CalendarCheck } from 'lucide-react';
import api from '../api/axios';

export default function Home() {
  const [status, setStatus] = useState('loading'); // loading | ok | error
  const [message, setMessage] = useState('');

  const checkServer = async () => {
    setStatus('loading');
    try {
      const { data } = await api.get('/health');
      setMessage(`Database: ${data.data.database}`);
      setStatus('ok');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Cannot reach the server');
      setStatus('error');
    }
  };

  useEffect(() => {
    checkServer();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white">
            <CalendarCheck size={22} />
          </span>
          <h1 className="text-2xl font-bold text-brand-900">ServiceFlow</h1>
        </div>

        <p className="mt-4 text-sm text-slate-500">Frontend and backend connection check</p>

        <div className="mt-6">
          {status === 'loading' && (
            <div className="flex items-center gap-2 text-slate-600">
              <Loader2 className="animate-spin" size={18} /> Checking server...
            </div>
          )}
          {status === 'ok' && (
            <div className="flex items-center gap-2 rounded-xl bg-green-50 p-3 text-green-700">
              <CheckCircle2 size={18} /> Connected. {message}
            </div>
          )}
          {status === 'error' && (
            <div className="rounded-xl bg-red-50 p-3 text-red-700">
              <div className="flex items-center gap-2">
                <XCircle size={18} /> {message}
              </div>
              <button
                onClick={checkServer}
                className="mt-3 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}