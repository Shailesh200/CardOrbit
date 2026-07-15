import { FormEvent, useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@cardwise/ui';

import { deleteAdminUser, lookupAdminUserByEmail, type AdminUserDetail } from '../lib/api';

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="grid gap-1 border-b border-border/60 py-3 sm:grid-cols-[10rem_1fr]">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground break-all">{value ?? '—'}</dd>
    </div>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function UsersPage() {
  const [email, setEmail] = useState('');
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function onSearch(event: FormEvent) {
    event.preventDefault();
    const q = email.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setUser(null);
    try {
      const result = await lookupAdminUserByEmail(q);
      setUser(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setLoading(false);
    }
  }

  async function onDeleteConfirmed() {
    if (!user) return;
    if (deleteConfirm.trim().toUpperCase() !== 'DELETE') return;
    setDeleteBusy(true);
    setError(null);
    try {
      await deleteAdminUser(user.id);
      setDeleteOpen(false);
      setDeleteConfirm('');
      setUser(null);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Consumer users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Look up a user by email for support and account review. Delete is dev-only.
        </p>
      </div>

      <form className="flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end" onSubmit={onSearch}>
        <div className="flex-1 space-y-2">
          <Label htmlFor="admin-user-email">Email address</Label>
          <Input
            id="admin-user-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            required
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? 'Searching…' : 'Look up user'}
        </Button>
      </form>

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {user ? (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-col gap-3 border-b border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">{user.fullName || user.email}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
            >
              Delete user
            </Button>
          </div>
          <dl className="px-5">
            <DetailRow label="User ID" value={user.id} />
            <DetailRow label="Account status" value={user.accountStatus} />
            <DetailRow label="Role" value={user.role} />
            <DetailRow label="Email verified" value={formatDate(user.emailVerifiedAt)} />
            <DetailRow label="Created" value={formatDate(user.createdAt)} />
            <DetailRow label="Last updated" value={formatDate(user.updatedAt)} />
            <DetailRow label="Country / currency" value={`${user.country} · ${user.currency}`} />
            <DetailRow label="Locale / timezone" value={`${user.locale} · ${user.timezone}`} />
            <DetailRow label="Onboarding status" value={user.onboardingStatus} />
            <DetailRow label="Onboarding step" value={user.onboardingStep} />
            <DetailRow
              label="Onboarding completed"
              value={formatDate(user.onboardingCompletedAt)}
            />
            <DetailRow label="Portfolio cards" value={user.portfolioCardCount} />
            <DetailRow label="Active sessions" value={user.activeSessionCount} />
          </dl>
        </div>
      ) : null}

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="border-destructive/30 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete consumer user?</DialogTitle>
            <DialogDescription>
              Permanently removes <strong>{user?.email}</strong> and all related data. Dev
              environments only — this cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="admin-delete-confirm">Type DELETE to confirm</Label>
            <Input
              id="admin-delete-confirm"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={deleteBusy}
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteBusy || deleteConfirm.trim().toUpperCase() !== 'DELETE'}
              onClick={() => void onDeleteConfirmed()}
            >
              {deleteBusy ? 'Deleting…' : 'Delete permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
