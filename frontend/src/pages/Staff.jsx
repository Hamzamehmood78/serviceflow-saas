import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Archive,
  ArchiveRestore,
    CalendarClock,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
  Users,
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
import StaffFormModal from '../components/staff/StaffFormModal';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { dotClass } from '../utils/staffColors';
import { getErrorMessage } from '../utils/apiError';

const statusFilters = [
  { value: 'current', label: 'Active and inactive' },
  { value: 'active', label: 'Active only' },
  { value: 'inactive', label: 'Inactive only' },
  { value: 'archived', label: 'Archived' },
];

const statusTone = { active: 'green', inactive: 'amber', archived: 'slate' };

export default function Staff() {
  const toast = useToast();
    const navigate = useNavigate();
  const { session } = useAuth();
  const isOwner = session.role === 'owner';

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
      const { data } = await api.get('/staff', { params: { q, status, page, limit: 20 } });
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

  const openEdit = (member) => {
    setEditing(member);
    setFormOpen(true);
  };

  const changeStatus = async (member, nextStatus, message) => {
    try {
      await api.patch(`/staff/${member.id}`, { status: nextStatus });
      toast.success(message);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const confirmArchive = async () => {
    setArchiving(true);
    await changeStatus(toArchive, 'archived', 'Staff member archived');
    setArchiving(false);
    setToArchive(null);
  };

  const filtered = q !== '' || status !== 'current';

  return (
    <>
      <PageHeader
        title="Staff"
        subtitle="The people who provide your services, and what each one offers."
        actions={
          isOwner && (
            <Button onClick={openCreate}>
              <Plus size={16} /> Add staff
            </Button>
          )
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            aria-label="Search staff"
            placeholder="Search by name or title..."
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
          title="Could not load staff"
          message="Please check your connection and try again."
          action={<Button onClick={load}>Retry</Button>}
        />
      )}

      {state === 'ready' && items.length === 0 && (
        <EmptyState
          icon={Users}
          title={filtered ? 'No matching staff' : 'No staff yet'}
          message={
            filtered
              ? 'Try a different search or filter.'
              : isOwner
                ? 'Add the people who provide your services so customers can book them.'
                : 'The owner has not added any staff yet.'
          }
          action={
            !filtered && isOwner ? (
              <Button onClick={openCreate}>
                <Plus size={16} /> Add staff
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
                  <th className="px-4 py-3 font-medium">Staff</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Services</th>
                  <th className="px-4 py-3 font-medium">Online</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  {isOwner && <th className="px-4 py-3 text-right font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((s) => {
                  const shown = s.services.filter((x) => x.status !== 'archived');
                  return (
                    <tr key={s.id} className={s.status === 'archived' ? 'opacity-60' : ''}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className={`h-3 w-3 shrink-0 rounded-full ${dotClass[s.color]}`} />
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900">{s.name}</p>
                            {s.title && <p className="text-xs text-slate-500">{s.title}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {s.email || s.phone ? (
                          <>
                            {s.email && <p>{s.email}</p>}
                            {s.phone && <p className="text-xs text-slate-500">{s.phone}</p>}
                          </>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {shown.length === 0 ? (
                          <span className="text-xs text-slate-400">None assigned</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {shown.slice(0, 2).map((x) => (
                              <Badge key={x.id}>{x.name}</Badge>
                            ))}
                            {shown.length > 2 && <Badge tone="indigo">+{shown.length - 2}</Badge>}
                          </div>
                        )}
                      </td>
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
                             icon={CalendarClock}
                             label="Schedule"
                             onClick={() => navigate(`/app/staff/${s.id}/schedule`)}
                           />
                         )}
                            {s.status !== 'archived' && (
                              <ActionButton tone="brand" icon={Pencil} label="Edit" onClick={() => openEdit(s)} />
                            )}
                            {s.status === 'active' && (
                              <ActionButton
                                tone="amber"
                                icon={PowerOff}
                                label="Deactivate"
                                onClick={() => changeStatus(s, 'inactive', 'Staff member deactivated')}
                              />
                            )}
                            {s.status === 'inactive' && (
                              <ActionButton
                                tone="green"
                                icon={Power}
                                label="Activate"
                                onClick={() => changeStatus(s, 'active', 'Staff member activated')}
                              />
                            )}
                            {s.status === 'archived' ? (
                              <ActionButton
                                tone="green"
                                icon={ArchiveRestore}
                                label="Restore"
                                onClick={() => changeStatus(s, 'active', 'Staff member restored')}
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
                  );
                })}
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

      <StaffFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        staff={editing}
        onSaved={load}
      />

      <ConfirmDialog
        open={!!toArchive}
        onClose={() => setToArchive(null)}
        onConfirm={confirmArchive}
        loading={archiving}
        danger
        title="Archive this staff member?"
        message={
          toArchive
            ? `"${toArchive.name}" will no longer be offered for new bookings. Past appointments keep their name. You can restore them later.`
            : ''
        }
        confirmText="Archive"
      />
    </>
  );
}