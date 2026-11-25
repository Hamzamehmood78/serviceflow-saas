import { useState } from 'react';
import { CalendarCheck, Wallet, AlertCircle, UserPlus, Plus, Users } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { Badge, StatusBadge } from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useToast } from '../context/ToastContext';

export default function ComponentsDemo() {
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const fakeSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success('Saved successfully');
    }, 1200);
  };

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Component demo page (temporary)"
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus size={16} /> New appointment
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CalendarCheck} label="Today's appointments" value="12" hint="3 pending" />
        <StatCard icon={Wallet} label="Collected today" value="Rs. 18,500" />
        <StatCard icon={AlertCircle} label="Outstanding" value="Rs. 4,200" />
        <StatCard icon={UserPlus} label="New customers" value="5" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Buttons</h2>
          <div className="flex flex-wrap gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="ghost">Ghost</Button>
            <Button loading={saving} onClick={fakeSave}>
              Save (loading test)
            </Button>
            <Button disabled>Disabled</Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => toast.success('Success message')}>
              Success toast
            </Button>
            <Button variant="secondary" onClick={() => toast.error('Something went wrong')}>
              Error toast
            </Button>
            <Button variant="secondary" onClick={() => toast.info('Just so you know')}>
              Info toast
            </Button>
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              Confirm dialog
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">Form fields</h2>
          <div className="space-y-4">
            <Input label="Customer name" placeholder="Ali Khan" />
            <Input label="Phone" placeholder="03XX-XXXXXXX" error="Enter a valid phone number" />
            <Select
              label="Payment method"
              placeholder="Choose method"
              options={[
                { value: 'cash', label: 'Cash' },
                { value: 'bank', label: 'Bank transfer' },
                { value: 'pos', label: 'Card / POS' },
              ]}
            />
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">Status badges</h2>
          <div className="flex flex-wrap gap-2">
            {['pending', 'confirmed', 'checked-in', 'in-progress', 'completed', 'cancelled', 'no-show'].map(
              (s) => (
                <StatusBadge key={s} status={s} />
              )
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {['unpaid', 'partially-paid', 'paid', 'partially-refunded', 'refunded'].map((s) => (
              <StatusBadge key={s} status={s} />
            ))}
            <Badge tone="blue">Online</Badge>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">Loading (skeleton)</h2>
          <div className="space-y-3">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <EmptyState
          icon={Users}
          title="No customers yet"
          message="Add your first customer to start booking appointments."
          action={<Button>Add customer</Button>}
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New appointment"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setModalOpen(false)}>Save</Button>
          </>
        }
      >
        <Input label="Customer name" placeholder="Search or add customer" />
      </Modal>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          toast.success('Deleted (demo)');
        }}
        title="Delete this item?"
        message="This action cannot be undone."
        confirmText="Delete"
        danger
      />
    </>
  );
}