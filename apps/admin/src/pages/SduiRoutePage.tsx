import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router';
import type { AdminPage, AdminPortalConfig } from '@cardwise/admin-config';
import { SduiPageRenderer, type SduiActionContext } from '@cardwise/admin-sdui';

import { AssetManagerPanel } from '../components/AssetManagerPanel';
import { ImportQueuePanel } from '../components/ImportQueuePanel';
import {
  archiveCreditCard,
  cancelAdminJob,
  createCreditCard,
  deleteAdminUser,
  enqueueAdminJob,
  fetchAdminDataSource,
  fetchAdminJob,
  getAdminToken,
  listActiveAdminJobs,
} from '../lib/api';

type OutletContext = { config: AdminPortalConfig | null };

export function SduiRoutePage({ pageId }: { pageId: string }) {
  const { config } = useOutletContext<OutletContext>();
  const page = config?.pages.find((p) => p.id === pageId) ?? null;
  const [activeJobId, setActiveJobId] = useState<string | null>(() =>
    sessionStorage.getItem('cardwise.admin.activeJobId'),
  );

  useEffect(() => {
    if (activeJobId) sessionStorage.setItem('cardwise.admin.activeJobId', activeJobId);
    else sessionStorage.removeItem('cardwise.admin.activeJobId');
  }, [activeJobId]);

  // Drop stale session ids for jobs that already finished.
  useEffect(() => {
    const stored = sessionStorage.getItem('cardwise.admin.activeJobId');
    if (!stored) return;
    void fetchAdminJob(stored)
      .then((job) => {
        if (job.status !== 'QUEUED' && job.status !== 'PROCESSING') {
          setActiveJobId(null);
        }
      })
      .catch(() => setActiveJobId(null));
  }, []);

  const ctx = useMemo<SduiActionContext>(
    () => ({
      optionSources: config?.optionSources ?? {},
      activeJobId,
      setActiveJobId,
      enqueueJob: enqueueAdminJob,
      fetchData: fetchAdminDataSource,
      onJobComplete: () => {
        setActiveJobId(null);
        window.dispatchEvent(new CustomEvent('cardwise:admin-job-complete'));
      },
      submitAction: async (action, body) => {
        if (action === 'admin.credit-cards.create') {
          await createCreditCard(body);
          return;
        }
        if (action === 'admin.row.delete') {
          await deleteAdminUser(String(body.id));
          return;
        }
        if (action === 'admin.row.archive') {
          await archiveCreditCard(String(body.id));
          return;
        }
        throw new Error(`Unknown action: ${action}`);
      },
    }),
    [config, activeJobId],
  );

  if (!page) {
    return <p className="text-sm text-muted-foreground">Loading page config…</p>;
  }

  return (
    <SduiPageRenderer
      blocks={page.blocks}
      ctx={ctx}
      fetchJob={fetchAdminJob}
      listActiveJobs={listActiveAdminJobs}
      cancelJob={cancelAdminJob}
      getToken={getAdminToken}
      customBlocks={{
        'asset-manager': AssetManagerPanel,
        'import-queue': ImportQueuePanel,
      }}
    />
  );
}

export function resolvePage(config: AdminPortalConfig | null, path: string): AdminPage | null {
  return config?.pages.find((p) => p.path === path) ?? null;
}
