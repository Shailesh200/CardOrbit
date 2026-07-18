import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Button } from '@cardwise/ui';
import { Bell, CheckCheck, ExternalLink, RefreshCw } from 'lucide-react';

import { EmptyState } from '../../components/feedback/EmptyState';
import { notify, toast } from '../../lib/app-toast';
import {
  trackNotificationClickedClient,
  trackNotificationsViewedClient,
} from '../../lib/product-analytics';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATION_TYPE_LABELS,
  syncContextualNotifications,
  type InAppNotification,
} from './notifications-api';

function formatWhen(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function NotificationRow({
  item,
  onRead,
}: {
  item: InAppNotification;
  onRead: (id: string) => void;
}) {
  const unread = item.readAt == null;
  const typeLabel = NOTIFICATION_TYPE_LABELS[item.type] ?? item.type;

  return (
    <article
      className={`rounded-xl border p-4 transition-colors ${
        unread
          ? 'border-sky-500/30 bg-sky-500/5'
          : 'border-[color:var(--consumer-border)] bg-[color:var(--consumer-surface-muted)]/40'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {typeLabel}
            </span>
            {unread ? <span className="consumer-notification-tag">New</span> : null}
          </div>
          <h2 className="text-base font-semibold text-[color:var(--consumer-text)]">
            {item.title}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-[color:var(--consumer-text-muted)]">
            {item.body}
          </p>
          <p className="mt-2 text-xs text-[color:var(--consumer-text-subtle)]">
            {formatWhen(item.createdAt)}
          </p>
        </div>
        <Bell
          className="mt-0.5 size-4 shrink-0 text-[color:var(--consumer-text-subtle)]"
          aria-hidden
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {item.linkUrl ? (
          <Button asChild size="sm" variant="secondary">
            <Link
              to={item.linkUrl.startsWith('/') ? item.linkUrl : new URL(item.linkUrl).pathname}
              onClick={() => {
                trackNotificationClickedClient({
                  notificationId: item.id,
                  type: item.type,
                  linkUrl: item.linkUrl ?? undefined,
                });
                if (unread) onRead(item.id);
              }}
            >
              Open
              <ExternalLink className="size-3.5" />
            </Link>
          </Button>
        ) : null}
        {unread ? (
          <Button size="sm" variant="ghost" onClick={() => onRead(item.id)}>
            Mark read
          </Button>
        ) : null}
      </div>
    </article>
  );
}

export function NotificationsPage() {
  const [items, setItems] = useState<InAppNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await listNotifications();
      setItems(data.items);
      setTotal(data.total);
      trackNotificationsViewedClient({
        total: data.total,
        unreadCount: data.items.filter((item) => item.readAt == null).length,
        contextualEnabled: true,
      });
    } catch (error) {
      notify.fromError(error, 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    document.title = 'CardOrbit · Notifications';
    void load();
  }, []);

  async function onMarkRead(id: string) {
    try {
      const updated = await markNotificationRead(id);
      setItems((current) => current.map((row) => (row.id === id ? updated : row)));
    } catch (error) {
      notify.fromError(error, 'Could not mark as read');
    }
  }

  async function onMarkAllRead() {
    setBusy(true);
    try {
      await markAllNotificationsRead();
      setItems((current) =>
        current.map((row) => ({
          ...row,
          readAt: row.readAt ?? new Date().toISOString(),
        })),
      );
      toast.success('All notifications marked read');
    } catch (error) {
      notify.fromError(error, 'Could not mark all as read');
    } finally {
      setBusy(false);
    }
  }

  async function onRefreshInsights() {
    setSyncing(true);
    try {
      const result = await syncContextualNotifications();
      await load();
      if (result.delivered > 0) {
        toast.success(`${result.delivered} new insight${result.delivered === 1 ? '' : 's'} added`);
      } else {
        toast.success('Notifications are up to date');
      }
    } catch (error) {
      notify.fromError(error, 'Could not refresh insights');
    } finally {
      setSyncing(false);
    }
  }

  const unreadCount = items.filter((item) => item.readAt == null).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="consumer-page-title">Notifications</h1>
          <p className="consumer-page-subtitle">
            Contextual alerts for milestones, bills, offers, and travel — plus product updates.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={syncing || loading}
            onClick={() => void onRefreshInsights()}
          >
            <RefreshCw className={`size-4 ${syncing ? 'animate-spin' : ''}`} />
            Refresh insights
          </Button>
          {unreadCount > 0 ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => void onMarkAllRead()}
            >
              <CheckCheck className="size-4" />
              Mark all read
            </Button>
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-[color:var(--consumer-text-muted)]">Loading notifications…</p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="When CardOrbit finds a milestone, bill, offer, or travel tip for you, it will show up here."
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <NotificationRow key={item.id} item={item} onRead={(id) => void onMarkRead(id)} />
          ))}
          {total > items.length ? (
            <p className="text-center text-xs text-[color:var(--consumer-text-subtle)]">
              Showing {items.length} of {total}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
