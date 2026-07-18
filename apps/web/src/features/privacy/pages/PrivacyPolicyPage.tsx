import { useState } from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@cardwise/ui';

import { notify, toast } from '../../../lib/app-toast';

import { requestAccountDeletion, requestDataExport } from '../../../lib/api';

export function PrivacyPolicyPage() {
  const [busy, setBusy] = useState(false);

  async function onExport() {
    setBusy(true);
    try {
      const result = await requestDataExport();
      toast.success(`Export requested: ${result.exportId}`);
    } catch (error) {
      notify.fromError(error, 'Export failed');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    setBusy(true);
    try {
      const result = await requestAccountDeletion();
      toast.success(`Deletion status: ${result.status}`);
    } catch (error) {
      notify.fromError(error, 'Deletion failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="consumer-page consumer-surface consumer-surface-accent consumer-surface--glass mx-auto flex max-w-3xl flex-col gap-6 p-6 py-10 sm:p-8">
      <h1 className="consumer-page-heading">Privacy Policy</h1>
      <p className="text-muted-foreground">
        CardOrbit processes personal data to help you choose the right credit card for each
        purchase. This Phase 0 policy is a development baseline aligned with India&apos;s Digital
        Personal Data Protection (DPDP) Act principles: purpose limitation, consent, access,
        correction, and erasure.
      </p>
      <section className="space-y-2">
        <h2 className="text-xl font-medium">What we collect</h2>
        <p className="text-muted-foreground">
          Account details (email, name), portfolio cards you add, usage events for product
          improvement (when analytics consent is given), and support communications.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-medium">Your rights</h2>
        <p className="text-muted-foreground">
          You may request an export of your data or deletion of your account. Authentication for
          these actions ships in a later milestone; the controls below call Phase 0 API stubs.
        </p>
      </section>
      <Card>
        <CardHeader>
          <CardTitle>Data rights (stubs)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button disabled={busy} onClick={() => void onExport()}>
            Request data export
          </Button>
          <Button disabled={busy} variant="destructive" onClick={() => void onDelete()}>
            Request account deletion
          </Button>
        </CardContent>
      </Card>
    </article>
  );
}
