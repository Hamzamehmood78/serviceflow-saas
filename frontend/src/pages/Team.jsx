import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Copy, Mail, Plus, Power, PowerOff, RefreshCw, Trash2 } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ActionButton from '../components/ui/ActionButton';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Modal from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import InviteModal from '../components/team/InviteModal';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import { getErrorMessage } from '../utils/apiError';

const roleLabel = { owner: 'Owner', receptionist: 'Receptionist', staff: 'Staff' };
const roleTone = { owner: 'purple', receptionist: 'blue', staff: 'indigo' };

const niceDateTime = (iso) =>
  new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function Team() {
  const toast = useToast();
  const [state, setState] = useState('loading'); // loading | ready | error
  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [linkInfo, setLinkInfo] = useState(null); // { name, link }
  const [toRevoke, setToRevoke] = useState(null);
  const [revoking, setRevoking] = useState(false);

  const load = useCallback(async () => {
    setState('loading');
    try {
      const { data } = await api.get('/team');
      setMembers(data.data.members);
      setInvitations(data.data.invitations);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onCreated = ({ invitation, inviteLink }) => {
    setLinkInfo({ name: invitation.name, link: inviteLink });
    load();
  };

  const resend = async (invite) => {
    try {
      const { data } = await api.post(`/team/invitations/${invite.id}/resend`);
      setLinkInfo({ name: invite.name, link: data.data.inviteLink });
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const confirmRevoke = async () => {
    setRevoking(true);
    try {
      await api.post(`/team/invitations/${toRevoke.id}/revoke`);
      toast.success('Invitation revoked');
      setToRevoke(null);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setRevoking(false);
    }
  };

  const setAccess = async (member, status) => {
    try {
      await api.patch(`/team/members/${member.id}`, { status });
      toast.success(status === 'active' ? 'Access enabled' : 'Access disabled');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(linkInfo.link);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy. Select the link and copy it manually.');
    }
  };

  return (
    <>
      <PageHeader
        title="Team"
        subtitle="People who can log in to your business, and what they can do."
        actions={
          <Button onClick={() => setInviteOpen(true)}>
            <Plus size={16} /> Invite team member
          </Button>
        }
      />

      {state === 'loading' && (
        <div className="space-y-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-28" />
        </div>
      )}

      {state === 'error' && (
        <EmptyState
          icon={AlertCircle}
          title="Could not load your team"
          message="Please check your connection and try again."
          action={<Button onClick={load}>Retry</Button>}
        />
      )}

      {state === 'ready' && (
        <div className="space-y-6">
          <Card className="p-0">
            <h2 className="border-b border-slate-200 px-5 py-4 font-semibold text-slate-900">
              Team members
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-180 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Name</th>
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 font-medium">Access</th>
                    <th className="px-5 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((m) => (
                    <tr key={m.id} className={m.status === 'disabled' ? 'opacity-60' : ''}>
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-900">
                          {m.name} {m.isYou && <span className="text-xs text-slate-400">(you)</span>}
                        </p>
                        <p className="text-xs text-slate-500">{m.email}</p>
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={roleTone[m.role]}>{roleLabel[m.role]}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={m.status === 'active' ? 'green' : 'red'} className="capitalize">
                          {m.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end">
                          {m.role !== 'owner' && !m.isYou && m.status === 'active' && (
                            <ActionButton
                              tone="amber"
                              icon={PowerOff}
                              label="Disable access"
                              onClick={() => setAccess(m, 'disabled')}
                            />
                          )}
                          {m.role !== 'owner' && !m.isYou && m.status === 'disabled' && (
                            <ActionButton
                              tone="green"
                              icon={Power}
                              label="Enable access"
                              onClick={() => setAccess(m, 'active')}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-0">
            <h2 className="border-b border-slate-200 px-5 py-4 font-semibold text-slate-900">
              Pending invitations
            </h2>
            {invitations.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={Mail}
                  title="No pending invitations"
                  message="Invite a receptionist or staff member to give them their own login."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-180 text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-medium">Invited</th>
                      <th className="px-5 py-3 font-medium">Role</th>
                      <th className="px-5 py-3 font-medium">Link</th>
                      <th className="px-5 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invitations.map((i) => (
                      <tr key={i.id}>
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-900">{i.name}</p>
                          <p className="text-xs text-slate-500">{i.email}</p>
                        </td>
                        <td className="px-5 py-3">
                          <Badge tone={roleTone[i.role]}>{roleLabel[i.role]}</Badge>
                          {i.staffName && <p className="mt-1 text-xs text-slate-500">as {i.staffName}</p>}
                        </td>
                        <td className="px-5 py-3">
                          {i.expired ? (
                            <Badge tone="red">Expired</Badge>
                          ) : (
                            <>
                              <Badge tone="amber">Pending</Badge>
                              <p className="mt-1 text-xs text-slate-500">until {niceDateTime(i.expiresAt)}</p>
                            </>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-2">
                            <ActionButton
                              tone="brand"
                              icon={RefreshCw}
                              label="Resend"
                              onClick={() => resend(i)}
                            />
                            <ActionButton
                              tone="red"
                              icon={Trash2}
                              label="Revoke"
                              onClick={() => setToRevoke(i)}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} onCreated={onCreated} />

      <Modal
        open={!!linkInfo}
        onClose={() => setLinkInfo(null)}
        title="Invitation link"
        footer={
          <>
            <Button variant="secondary" onClick={() => setLinkInfo(null)}>
              Close
            </Button>
            <Button onClick={copyLink}>
              <Copy size={16} /> Copy link
            </Button>
          </>
        }
      >
        {linkInfo && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Send this link to <span className="font-medium text-slate-900">{linkInfo.name}</span>. It works
              once and expires in 48 hours. You will not be able to see it again (use Resend for a new one).
            </p>
            <input
              readOnly
              value={linkInfo.link}
              onFocus={(e) => e.target.select()}
              aria-label="Invitation link"
              className="h-10 w-full rounded-lg bg-slate-50 px-3 text-xs text-slate-700 outline-none ring-1 ring-slate-300"
            />
            <p className="text-xs text-slate-500">
              Email sending is not set up yet, so the link is not emailed automatically.
            </p>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!toRevoke}
        onClose={() => setToRevoke(null)}
        onConfirm={confirmRevoke}
        loading={revoking}
        danger
        title="Revoke this invitation?"
        message={toRevoke ? `The link sent to ${toRevoke.email} will stop working.` : ''}
        confirmText="Revoke"
      />
    </>
  );
}