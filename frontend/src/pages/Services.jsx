import { useCallback, useEffect, useState } from 'react';
import {
  AlertCircle,
  Archive,
  ArchiveRestore,
  Briefcase,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import ActionButton from '../components/ui/ActionButton';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Pagination from '../components/ui/Pagination';
import { Badge } from '../components/ui/Badge';
import ServiceFormModal from '../components/services/ServiceFormModal';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatMoney } from '../utils/money';
import { getErrorMessage } from '../utils/apiError';

const statusFilters = [
  { value: 'current', label: 'Active and inactive' },
  { value: 'active', label: 'Active only' },
  { value: 'inactive', label: 'Inactive only' },
  { value: 'archived', label: 'Archived' },
];

const statusTone = { active: 'green', inactive: 'amber', archived: 'slate' };

export default function Services() {
  const toast = useToast();
  const { session } = useAuth();
  const isOwner = session.role === 'owner';
  const currency = session.business.currency;

  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('current');
  const [page, setPage] = useState(1);

  const [state, setState] = useState('loading'); // loading | ready | error
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toArchive, setToArchive] = useState(null);
  const [archiving, setArchiving] = useState(false);

  // Search box: type karna band hone ke 300ms baad hi search
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(qInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [qInput]);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const { data } = await api.get('/services', { params: { q, status, page, limit: 20 } });
      setItems(data.data.items);
      setPagination(data.data.pagination);
      setState('ready');
    } catch {
      setState('error');
    }
  }, [q, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (service) => {
    setEditing(service);
    setFormOpen(true);
  };

  const changeStatus = async (service, nextStatus, message) => {
    try {
      await api.patch(`/services/${service.id}`, { status: nextStatus });
      toast.success(message);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const confirmArchive = async () => {
    setArchiving(true);
    await changeStatus(toArchive, 'archived', 'Service archived');
    setArchiving(false);
    setToArchive(null);
  };

  const filtered = q !== '' || status !== 'current';

  return (
    <>
      <PageHeader
        title="Services"
        subtitle="What your business offers, with duration and price."
        actions={
          isOwner && (
            <Button onClick={openCreate}>
              <Plus size={16} /> Add service
            </Button>
          )
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            aria-label="Search services"
            placeholder="Search services..."
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            maxLength={100}
            className="[&_input]:pl-9"
          />
        </div>
        <Select
          aria-label="Filter by status"
          options={statusFilters}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        />
      </div>

      {state === 'loading' && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      )}

      {state === 'error' && (
        <EmptyState
          icon={AlertCircle}
          title="Could not load services"
          message="Please check your connection and try again."
          action={<Button onClick={load}>Retry</Button>}
        />
      )}

      {state === 'ready' && items.length === 0 && (
        <EmptyState
          icon={Briefcase}
          title={filtered ? 'No matching services' : 'No services yet'}
          message={
            filtered
              ? 'Try a different search or filter.'
              : isOwner
                ? 'Add your first service so customers can book it.'
                : 'The owner has not added any services yet.'
          }
          action={
            !filtered && isOwner ? (
              <Button onClick={openCreate}>
                <Plus size={16} /> Add service
              </Button>
            ) : null
          }
        />
      )}

      {state === 'ready' && items.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-xl bg-white ring-1 ring-slate-200">
            <table className="w-full min-w-220 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Online</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  {isOwner && <th className="px-4 py-3 text-right font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((s) => (
                  <tr key={s.id} className={s.status === 'archived' ? 'opacity-60' : ''}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{s.name}</p>
                      {s.category && <p className="text-xs text-slate-500">{s.category}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {s.durationMinutes} min
                      {(s.bufferBeforeMinutes > 0 || s.bufferAfterMinutes > 0) && (
                        <p className="text-xs text-slate-500">
                          buffer {s.bufferBeforeMinutes}/{s.bufferAfterMinutes}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatMoney(s.priceMinor, currency)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={s.bookableOnline ? 'blue' : 'slate'}>
                        {s.bookableOnline ? 'Yes' : 'No'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone[s.status]} className="capitalize">
                        {s.status}
                      </Badge>
                    </td>
                    {isOwner && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {s.status !== 'archived' && (
                            <ActionButton
                              tone="brand"
                              icon={Pencil}
                              label="Edit"
                              onClick={() => openEdit(s)}
                            />
                          )}
                          {s.status === 'active' && (
                            <ActionButton
                              tone="amber"
                              icon={PowerOff}
                              label="Deactivate"
                              onClick={() => changeStatus(s, 'inactive', 'Service deactivated')}
                            />
                          )}
                          {s.status === 'inactive' && (
                            <ActionButton
                              tone="green"
                              icon={Power}
                              label="Activate"
                              onClick={() => changeStatus(s, 'active', 'Service activated')}
                            />
                          )}
                          {s.status === 'archived' ? (
                            <ActionButton
                              tone="green"
                              icon={ArchiveRestore}
                              label="Restore"
                              onClick={() => changeStatus(s, 'active', 'Service restored')}
                            />
                          ) : (
                            <ActionButton
                              tone="red"
                              icon={Archive}
                              label="Archive"
                              onClick={() => setToArchive(s)}
                            />
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={pagination.page}
            pages={pagination.pages}
            total={pagination.total}
            onPage={setPage}
          />
        </>
      )}

      <ServiceFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        service={editing}
        currency={currency}
        onSaved={load}
      />

      <ConfirmDialog
        open={!!toArchive}
        onClose={() => setToArchive(null)}
        onConfirm={confirmArchive}
        loading={archiving}
        danger
        title="Archive this service?"
        message={
          toArchive
            ? `"${toArchive.name}" will be hidden from new bookings. Past appointments and invoices keep its name. You can restore it later.`
            : ''
        }
        confirmText="Archive"
      />
    </>
  );
}