import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Input, Label, Separator } from '@cardwise/ui';
import { LogOut } from 'lucide-react';

import { toast } from '../../lib/app-toast';
import { logout } from '../../lib/auth-api';

import { getProfile, updateProfile, type UserProfile } from './account-api';

export function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [country, setCountry] = useState('IN');
  const [currency, setCurrency] = useState('INR');
  const [locale, setLocale] = useState('en-IN');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void getProfile()
      .then((data) => {
        setProfile(data);
        setFirstName(data.firstName ?? '');
        setLastName(data.lastName ?? '');
        setCountry(data.country);
        setCurrency(data.currency);
        setLocale(data.locale);
        setTimezone(data.timezone);
        setAvatarUrl(data.avatarUrl ?? '');
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : 'Failed to load profile');
      });
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const updated = await updateProfile({
        firstName,
        lastName,
        country,
        currency,
        locale,
        timezone,
        avatarUrl: avatarUrl || null,
      });
      setProfile(updated);
      toast.success('Profile updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  async function onLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const initials = [firstName, lastName]
    .filter(Boolean)
    .map((n) => n[0]?.toUpperCase())
    .join('');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="consumer-page-heading">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Update your CardOrbit profile details.</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-lg font-semibold text-primary ring-2 ring-primary/20">
            {initials || '?'}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{profile?.fullName ?? 'Your profile'}</p>
            <p className="truncate text-sm text-muted-foreground">{profile?.email ?? '…'}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0"
          onClick={() => void onLogout()}
        >
          <LogOut className="size-4" />
          Log out
        </Button>
      </div>

      <Separator />

      <form className="grid max-w-xl gap-4 md:grid-cols-2" onSubmit={onSubmit}>
        <div className="consumer-field">
          <Label htmlFor="profile-first">First name</Label>
          <Input
            id="profile-first"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </div>
        <div className="consumer-field">
          <Label htmlFor="profile-last">Last name</Label>
          <Input id="profile-last" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <div className="consumer-field">
          <Label htmlFor="profile-country">Country</Label>
          <Input
            id="profile-country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          />
        </div>
        <div className="consumer-field">
          <Label htmlFor="profile-currency">Currency</Label>
          <Input
            id="profile-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />
        </div>
        <div className="consumer-field">
          <Label htmlFor="profile-locale">Locale</Label>
          <Input id="profile-locale" value={locale} onChange={(e) => setLocale(e.target.value)} />
        </div>
        <div className="consumer-field">
          <Label htmlFor="profile-timezone">Timezone</Label>
          <Input
            id="profile-timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          />
        </div>
        <div className="consumer-field md:col-span-2">
          <Label htmlFor="profile-avatar">Avatar URL (optional)</Label>
          <Input
            id="profile-avatar"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <Button type="submit" disabled={busy} className="btn-premium">
            {busy ? 'Saving…' : 'Save profile'}
          </Button>
        </div>
      </form>
    </div>
  );
}
