import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cardwise/ui';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Plus } from 'lucide-react';

import { PageBackLink } from '@layout/PageBackLink';
import { notify, toast } from '@lib/app-toast';
import {
  firstWeekdayLocal,
  localDateKey,
  localMonthParts,
  shiftLocalMonth,
} from '../../lib/local-date';
import {
  createCalendarReminder,
  deleteCalendarReminder,
  EVENT_TYPE_LABELS,
  formatCalendarInr,
  getFinancialCalendarAgenda,
  getFinancialCalendarMonth,
  getFinancialTimeline,
  listCalendarReminders,
  type CalendarReminder,
  type FinancialCalendarEvent,
  type FinancialCalendarEventType,
  type TimelineEvent,
} from './financial-calendar-api';

type Tab = 'month' | 'agenda' | 'timeline' | 'reminders';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function eventTone(type: FinancialCalendarEventType): string {
  switch (type) {
    case 'bill_due':
      return 'bg-amber-500/15 text-amber-800 dark:text-amber-200';
    case 'reward_expiry':
      return 'bg-rose-500/15 text-rose-800 dark:text-rose-200';
    case 'milestone_end':
    case 'fee_waiver_end':
      return 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200';
    case 'offer_expiry':
      return 'bg-sky-500/15 text-sky-800 dark:text-sky-200';
    case 'custom_reminder':
      return 'bg-violet-500/15 text-violet-800 dark:text-violet-200';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function EventCard({ event }: { event: FinancialCalendarEvent }) {
  return (
    <li className="rounded-xl border border-border/60 bg-background/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${eventTone(event.type)}`}
        >
          {EVENT_TYPE_LABELS[event.type]}
        </span>
        <span className="text-xs text-muted-foreground">{event.date}</span>
      </div>
      <p className="mt-2 font-semibold">{event.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{event.body}</p>
      <Link
        to={event.linkUrl}
        className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
      >
        Open →
      </Link>
    </li>
  );
}

export function FinancialCalendarPage() {
  const todayKey = useMemo(() => localDateKey(), []);
  const initialMonth = useMemo(() => localMonthParts(), []);
  const [tab, setTab] = useState<Tab>('month');
  const [month, setMonth] = useState(initialMonth);
  const [days, setDays] = useState<Array<{ date: string; events: FinancialCalendarEvent[] }>>([]);
  const [upcoming, setUpcoming] = useState<FinancialCalendarEvent[]>([]);
  const [agenda, setAgenda] = useState<FinancialCalendarEvent[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [reminders, setReminders] = useState<CalendarReminder[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(todayKey);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    title: '',
    description: '',
    eventDate: todayKey,
    priority: 'medium' as 'high' | 'medium' | 'low',
  });

  const loadMonth = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getFinancialCalendarMonth(month.year, month.month);
      setDays(response.days);
      setUpcoming(response.upcoming);
      const firstWithEvents = response.days.find((day) => day.events.length > 0);
      setSelectedDate(
        (current) => current ?? firstWithEvents?.date ?? response.days[0]?.date ?? null,
      );
    } catch (error) {
      notify.fromError(error, 'Calendar unavailable');
    } finally {
      setLoading(false);
    }
  }, [month.month, month.year]);

  const loadAgenda = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getFinancialCalendarAgenda(30);
      setAgenda(response.items);
    } catch (error) {
      notify.fromError(error, 'Agenda unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTimeline = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getFinancialTimeline(1, 30);
      setTimeline(response.items);
    } catch (error) {
      notify.fromError(error, 'Timeline unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReminders = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listCalendarReminders();
      setReminders(rows);
    } catch (error) {
      notify.fromError(error, 'Reminders unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'CardOrbit · Calendar';
  }, []);

  useEffect(() => {
    if (tab === 'month') void loadMonth();
    if (tab === 'agenda') void loadAgenda();
    if (tab === 'timeline') void loadTimeline();
    if (tab === 'reminders') void loadReminders();
  }, [tab, loadMonth, loadAgenda, loadTimeline, loadReminders]);

  const selectedEvents = days.find((day) => day.date === selectedDate)?.events ?? [];
  const firstWeekday = useMemo(
    () => firstWeekdayLocal(month.year, month.month),
    [month.month, month.year],
  );

  function shiftMonth(delta: number) {
    setMonth((current) => shiftLocalMonth(current.year, current.month, delta));
    setSelectedDate(null);
  }

  async function onCreateReminder(event: FormEvent) {
    event.preventDefault();
    if (!draft.title.trim()) {
      toast.error('Add a reminder title');
      return;
    }
    setSaving(true);
    try {
      await createCalendarReminder({
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        eventDate: new Date(`${draft.eventDate}T12:00:00.000Z`).toISOString(),
        priority: draft.priority,
      });
      toast.success('Reminder added');
      setDraft({
        title: '',
        description: '',
        eventDate: todayKey,
        priority: 'medium',
      });
      await loadReminders();
      if (tab !== 'reminders') setTab('reminders');
    } catch (error) {
      notify.fromError(error, 'Could not create reminder');
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteReminder(id: string) {
    try {
      await deleteCalendarReminder(id);
      setReminders((current) => current.filter((row) => row.id !== id));
      toast.success('Reminder deleted');
    } catch (error) {
      notify.fromError(error, 'Could not delete reminder');
    }
  }

  const monthLabel = new Date(month.year, month.month - 1, 1).toLocaleString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      <PageBackLink to="/account" label="Home" />
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Calendar</p>
        <h1 className="consumer-page-heading font-display text-[1.75rem] font-semibold tracking-tight">
          Financial calendar & timeline
        </h1>
        <p className="text-sm text-muted-foreground">
          Due dates, milestones, reward expiry, offers, and custom reminders in one place. Today is{' '}
          <span className="font-medium text-foreground">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
          .
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-background/60 p-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">Sync external calendars</p>
          <p className="text-xs text-muted-foreground">
            Connect Google Calendar after Google sign-in to mirror due dates and reminders.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link to="/account/settings">Open settings</Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['month', 'Month'],
            ['agenda', 'Agenda'],
            ['timeline', 'Timeline'],
            ['reminders', 'Reminders'],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            size="sm"
            variant={tab === id ? 'default' : 'outline'}
            onClick={() => setTab(id)}
          >
            {id === 'month' ? <CalendarDays className="size-4" /> : null}
            {id === 'timeline' ? <Clock3 className="size-4" /> : null}
            {label}
          </Button>
        ))}
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}

      {tab === 'month' && !loading ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">{monthLabel}</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => shiftMonth(-1)}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => shiftMonth(1)}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {WEEKDAYS.map((day) => (
              <div key={day} className="py-2 font-semibold">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstWeekday }).map((_, index) => (
              <div key={`pad-${index}`} className="min-h-20 rounded-lg bg-transparent" />
            ))}
            {days.map((day) => {
              const dayNumber = Number(day.date.slice(-2));
              const active = selectedDate === day.date;
              const isToday = day.date === todayKey;
              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDate(day.date)}
                  className={`min-h-20 rounded-lg border p-2 text-left transition ${
                    active
                      ? 'border-primary bg-primary/10'
                      : isToday
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border/50 bg-background/50 hover:border-border'
                  }`}
                >
                  <p className={`text-xs font-semibold ${isToday ? 'text-primary' : ''}`}>
                    {dayNumber}
                    {isToday ? ' · Today' : ''}
                  </p>
                  <div className="mt-1 space-y-1">
                    {day.events.slice(0, 2).map((event) => (
                      <p
                        key={event.id}
                        className={`truncate rounded px-1 py-0.5 text-[10px] ${eventTone(event.type)}`}
                      >
                        {EVENT_TYPE_LABELS[event.type]}
                      </p>
                    ))}
                    {day.events.length > 2 ? (
                      <p className="text-[10px] text-muted-foreground">+{day.events.length - 2}</p>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>

          <section className="space-y-3">
            <h3 className="font-display text-lg font-semibold">
              {selectedDate ? `Events on ${selectedDate}` : 'Select a day'}
            </h3>
            {selectedEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events on this day.</p>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {selectedEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </ul>
            )}
          </section>

          {upcoming.length > 0 ? (
            <section className="space-y-3">
              <h3 className="font-display text-lg font-semibold">Coming up</h3>
              <ul className="grid gap-3 md:grid-cols-2">
                {upcoming.slice(0, 6).map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : null}

      {tab === 'agenda' && !loading ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {agenda.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No upcoming financial events in the next 30 days.
            </p>
          ) : (
            agenda.map((event) => <EventCard key={event.id} event={event} />)
          )}
        </ul>
      ) : null}

      {tab === 'timeline' && !loading ? (
        <ul className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-background/60">
          {timeline.length === 0 ? (
            <li className="p-4 text-sm text-muted-foreground">No timeline activity yet.</li>
          ) : (
            timeline.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {item.category}
                  </p>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.body}</p>
                  {item.linkUrl ? (
                    <Link
                      to={item.linkUrl}
                      className="mt-1 inline-block text-sm font-medium text-primary hover:underline"
                    >
                      Open →
                    </Link>
                  ) : null}
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>{new Date(item.occurredAt).toLocaleString('en-IN')}</p>
                  {item.amountInr != null ? (
                    <p className="mt-1 font-semibold text-foreground">
                      {formatCalendarInr(item.amountInr)}
                    </p>
                  ) : null}
                </div>
              </li>
            ))
          )}
        </ul>
      ) : null}

      {tab === 'reminders' ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <form
            className="space-y-4 rounded-2xl border border-border/60 bg-background/60 p-4"
            onSubmit={onCreateReminder}
          >
            <div className="flex items-center gap-2">
              <Plus className="size-4 text-primary" />
              <h2 className="font-display text-lg font-semibold">Add reminder</h2>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminder-title">Title</Label>
              <Input
                id="reminder-title"
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, title: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminder-date">Date</Label>
              <Input
                id="reminder-date"
                type="date"
                value={draft.eventDate}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, eventDate: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminder-desc">Notes</Label>
              <Input
                id="reminder-desc"
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, description: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reminder-priority">Priority</Label>
              <Select
                value={draft.priority}
                onValueChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    priority: value as 'high' | 'medium' | 'low',
                  }))
                }
              >
                <SelectTrigger id="reminder-priority" className="w-full">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="btn-premium" disabled={saving}>
              {saving ? 'Saving…' : 'Save reminder'}
            </Button>
          </form>

          <ul className="space-y-3">
            {reminders.length === 0 && !loading ? (
              <p className="text-sm text-muted-foreground">No custom reminders yet.</p>
            ) : (
              reminders.map((reminder) => (
                <li
                  key={reminder.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/60 bg-background/60 p-4"
                >
                  <div>
                    <p className="font-semibold">{reminder.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(reminder.eventDate).toLocaleDateString('en-IN')} ·{' '}
                      {reminder.priority}
                    </p>
                    {reminder.description ? (
                      <p className="mt-1 text-sm text-muted-foreground">{reminder.description}</p>
                    ) : null}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void onDeleteReminder(reminder.id)}
                  >
                    Delete
                  </Button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
