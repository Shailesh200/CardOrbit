import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Switch,
} from '@cardwise/ui';

import { notify, toast } from '../../lib/app-toast';
import { logout } from '../../lib/auth-api';

import {
  changePassword,
  getNotificationPreferences,
  getPrivacyPreferences,
  getRewardPersonalization,
  putNotificationPreferences,
  putPrivacyPreferences,
  putRewardPersonalization,
  requestAccountDeletion,
  requestDataExport,
  type NotificationPreferences,
  type PrivacyPreferences,
  type RewardPersonalizationProfile,
} from './account-api';
import { AiSettingsSection } from '../ai/components/AiSettingsSection';
import { DashboardCustomizeSection } from '../dashboard/components/DashboardCustomizeSection';
import { GoogleMailSection } from './GoogleMailSection';

const REWARD_TYPE_OPTIONS: Array<{
  value: RewardPersonalizationProfile['preferredRewardType'];
  label: string;
}> = [
  { value: 'any', label: 'No preference — best value' },
  { value: 'cashback', label: 'Cashback' },
  { value: 'reward_points', label: 'Reward points' },
  { value: 'airline_miles', label: 'Airline miles' },
  { value: 'hotel_points', label: 'Hotel points' },
];

const PREFERRED_BANK_OPTIONS: Array<{ slug: string; label: string }> = [
  { slug: 'hdfc', label: 'HDFC Bank' },
  { slug: 'icici', label: 'ICICI Bank' },
  { slug: 'sbi', label: 'State Bank of India' },
  { slug: 'axis', label: 'Axis Bank' },
  { slug: 'kotak', label: 'Kotak Mahindra Bank' },
  { slug: 'yes-bank', label: 'Yes Bank' },
  { slug: 'indusind', label: 'IndusInd Bank' },
  { slug: 'idfc-first', label: 'IDFC FIRST Bank' },
];

export function SettingsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationPreferences | null>(null);
  const [privacy, setPrivacy] = useState<PrivacyPreferences | null>(null);
  const [rewardPrefs, setRewardPrefs] = useState<RewardPersonalizationProfile | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    void Promise.all([
      getNotificationPreferences(),
      getPrivacyPreferences(),
      getRewardPersonalization(),
    ])
      .then(([n, p, r]) => {
        setNotifications(n);
        setPrivacy(p);
        setRewardPrefs(r);
      })
      .catch((error) => {
        notify.fromError(error, 'Failed to load settings');
      });
  }, []);

  async function saveNotifications(event: FormEvent) {
    event.preventDefault();
    if (!notifications) return;
    try {
      const saved = await putNotificationPreferences(notifications);
      setNotifications(saved);
      toast.success('Notification preferences saved');
    } catch (error) {
      notify.fromError(error, 'Save failed');
    }
  }

  async function savePrivacy(event: FormEvent) {
    event.preventDefault();
    if (!privacy) return;
    try {
      const saved = await putPrivacyPreferences(privacy);
      setPrivacy(saved);
      toast.success('Privacy preferences saved');
    } catch (error) {
      notify.fromError(error, 'Save failed');
    }
  }

  async function saveRewardPreferences(event: FormEvent) {
    event.preventDefault();
    if (!rewardPrefs) return;
    try {
      const saved = await putRewardPersonalization({
        preferredRewardType: rewardPrefs.preferredRewardType,
        preferredBankSlugs: rewardPrefs.preferredBankSlugs,
        boostFavoriteCards: rewardPrefs.boostFavoriteCards,
      });
      setRewardPrefs(saved);
      toast.success('Reward preferences saved');
    } catch (error) {
      notify.fromError(error, 'Save failed');
    }
  }

  function togglePreferredBank(slug: string, checked: boolean) {
    if (!rewardPrefs) return;
    const next = checked
      ? [...rewardPrefs.preferredBankSlugs, slug]
      : rewardPrefs.preferredBankSlugs.filter((value) => value !== slug);
    setRewardPrefs({ ...rewardPrefs, preferredBankSlugs: next });
  }

  async function onChangePassword(event: FormEvent) {
    event.preventDefault();
    try {
      await changePassword(currentPassword, newPassword);
      toast.success('Password updated — please sign in again');
      await logout();
      navigate('/login');
    } catch (error) {
      notify.fromError(error, 'Password change failed');
    }
  }

  async function onExport() {
    try {
      const result = await requestDataExport();
      toast.success(`Export requested (${result.exportId})`);
    } catch (error) {
      notify.fromError(error, 'Export failed');
    }
  }

  async function onDeleteConfirmed() {
    if (deleteConfirm.trim().toUpperCase() !== 'DELETE') {
      toast.warning('Type DELETE to confirm account removal');
      return;
    }
    setDeleteBusy(true);
    try {
      await requestAccountDeletion();
      toast.success('Account deleted');
      setDeleteOpen(false);
      setDeleteConfirm('');
      await logout();
      navigate('/login');
    } catch (error) {
      notify.fromError(error, 'Deletion failed');
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="consumer-page-heading">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Notifications, reward preferences, AI capabilities, privacy, and security.
        </p>
      </div>

      <AiSettingsSection />

      <Separator />

      <GoogleMailSection />

      <Separator />

      <DashboardCustomizeSection />

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Reward preferences</h2>
        <p className="text-sm text-muted-foreground">
          These settings influence card recommendations and ranking bonuses.
        </p>
        {rewardPrefs ? (
          <form className="max-w-lg space-y-5" onSubmit={saveRewardPreferences}>
            <div className="space-y-2">
              <Label htmlFor="preferred-reward-type">Preferred reward type</Label>
              <Select
                value={rewardPrefs.preferredRewardType}
                onValueChange={(value) =>
                  setRewardPrefs({
                    ...rewardPrefs,
                    preferredRewardType:
                      value as RewardPersonalizationProfile['preferredRewardType'],
                  })
                }
              >
                <SelectTrigger id="preferred-reward-type" className="w-full">
                  <SelectValue placeholder="Select reward type" />
                </SelectTrigger>
                <SelectContent>
                  {REWARD_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Preferred banks</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {PREFERRED_BANK_OPTIONS.map((bank) => (
                  <label
                    key={bank.slug}
                    className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={rewardPrefs.preferredBankSlugs.includes(bank.slug)}
                      onChange={(event) => togglePreferredBank(bank.slug, event.target.checked)}
                    />
                    {bank.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="boost-favorites">Boost favorite cards in recommendations</Label>
              <Switch
                id="boost-favorites"
                checked={rewardPrefs.boostFavoriteCards}
                onCheckedChange={(checked) =>
                  setRewardPrefs({ ...rewardPrefs, boostFavoriteCards: checked })
                }
              />
            </div>

            <Button type="submit">Save reward preferences</Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Notifications</h2>
        {notifications ? (
          <form className="max-w-md space-y-4" onSubmit={saveNotifications}>
            {(
              [
                ['emailMarketing', 'Marketing emails'],
                ['emailProduct', 'Product updates'],
                ['emailSecurity', 'Security alerts'],
                ['inAppContextual', 'Contextual in-app insights'],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <Label htmlFor={`notif-${key}`}>{label}</Label>
                <Switch
                  id={`notif-${key}`}
                  checked={notifications[key]}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, [key]: checked })
                  }
                />
              </div>
            ))}
            <Button type="submit">Save notifications</Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Privacy</h2>
        {privacy ? (
          <form className="max-w-md space-y-4" onSubmit={savePrivacy}>
            {(
              [
                ['shareAnonymousAnalytics', 'Share anonymous analytics'],
                ['personalizedOffers', 'Personalized offers'],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <Label htmlFor={`privacy-${key}`}>{label}</Label>
                <Switch
                  id={`privacy-${key}`}
                  checked={privacy[key]}
                  onCheckedChange={(checked) => setPrivacy({ ...privacy, [key]: checked })}
                />
              </div>
            ))}
            <Button type="submit">Save privacy</Button>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Change password</h2>
        <form className="max-w-md space-y-4" onSubmit={onChangePassword}>
          <div className="space-y-2">
            <Label htmlFor="current-password">Current password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit">Update password</Button>
        </form>
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Data controls</h2>
        <p className="text-sm text-muted-foreground">Export or schedule account deletion.</p>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={() => void onExport()}>
            Request data export
          </Button>
          <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
            Delete account
          </Button>
        </div>
      </section>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="border-destructive/30 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete your account?</DialogTitle>
            <DialogDescription>
              This permanently deletes your CardOrbit account and portfolio data. This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-confirm">Type DELETE to confirm</Label>
            <Input
              id="delete-confirm"
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
              {deleteBusy ? 'Deleting…' : 'Delete account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
