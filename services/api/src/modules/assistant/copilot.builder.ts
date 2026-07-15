import type { AssistantProposal, CreateCalendarReminderInput } from '@cardwise/validation';

import { newUuidV7 } from '../../infrastructure/prisma/uuid';

export type WeeklyOptimizationInput = {
  portfolioCount: number;
  favoriteCount: number;
  preferredRewardType: string | null;
  preferredCategorySlugs: string[];
  walletEstimatedValueInr: number;
  expiringSoonCount: number;
  milestoneInProgress: number;
  upcomingAgendaCount: number;
};

export function buildWeeklyOptimizationSummary(input: WeeklyOptimizationInput): {
  headline: string;
  bullets: string[];
  recommendedFocus: string;
} {
  const bullets: string[] = [];

  if (input.portfolioCount === 0) {
    bullets.push('Add at least one card to unlock personalized optimization.');
  } else {
    bullets.push(
      `You have ${input.portfolioCount} card${input.portfolioCount === 1 ? '' : 's'} in portfolio` +
        (input.favoriteCount > 0 ? ` (${input.favoriteCount} favorite).` : '.'),
    );
  }

  if (input.walletEstimatedValueInr > 0) {
    bullets.push(
      `Estimated reward wallet value ≈ ₹${Math.round(input.walletEstimatedValueInr).toLocaleString('en-IN')}.`,
    );
  }

  if (input.expiringSoonCount > 0) {
    bullets.push(
      `${input.expiringSoonCount} reward balance${input.expiringSoonCount === 1 ? '' : 's'} expiring soon — redeem or spend before they lapse.`,
    );
  }

  if (input.milestoneInProgress > 0) {
    bullets.push(
      `${input.milestoneInProgress} spend milestone${input.milestoneInProgress === 1 ? '' : 's'} in progress — check tracker to hit fee-waiver targets.`,
    );
  }

  if (input.upcomingAgendaCount > 0) {
    bullets.push(
      `${input.upcomingAgendaCount} upcoming calendar item${input.upcomingAgendaCount === 1 ? '' : 's'} in the next 14 days.`,
    );
  }

  if (input.preferredCategorySlugs.length > 0) {
    bullets.push(
      `Prefer routing spends toward: ${input.preferredCategorySlugs.slice(0, 3).join(', ')}.`,
    );
  }

  if (bullets.length === 0) {
    bullets.push('Add cards and sync rewards to unlock a weekly optimization plan.');
  }

  const recommendedFocus =
    input.expiringSoonCount > 0
      ? 'Prioritize expiring rewards this week'
      : input.milestoneInProgress > 0
        ? 'Push milestone spend targets before the period ends'
        : input.portfolioCount === 0
          ? 'Start by adding your primary spend card'
          : 'Use recommendations at checkout for preferred categories';

  return {
    headline: 'Weekly reward optimization snapshot',
    bullets: bullets.slice(0, 6),
    recommendedFocus,
  };
}

export function buildReminderProposal(input: {
  title: string;
  eventDateIso: string;
  description?: string | null;
  reminderOffsetDays?: number;
  priority?: 'high' | 'medium' | 'low';
}): AssistantProposal {
  const payload: CreateCalendarReminderInput = {
    title: input.title.slice(0, 120),
    description: input.description ?? null,
    eventDate: input.eventDateIso,
    reminderOffsetDays: input.reminderOffsetDays ?? 1,
    priority: input.priority ?? 'medium',
  };

  return {
    id: newUuidV7(),
    type: 'CREATE_REMINDER',
    label: `Create reminder: ${payload.title}`,
    status: 'pending',
    detail: `Scheduled for ${payload.eventDate.slice(0, 10)} (remind ${payload.reminderOffsetDays}d before). Confirm to save — nothing is written until you confirm.`,
    payload,
  };
}

export function parseReminderHints(message: string): {
  title: string;
  eventDateIso: string;
  daysAhead: number;
} {
  const lower = message.toLowerCase();
  let daysAhead = 7;
  if (/\btomorrow\b/.test(lower)) daysAhead = 1;
  else if (/\bnext week\b/.test(lower)) daysAhead = 7;
  else if (/\bin\s+(\d+)\s+days?\b/.test(lower)) {
    const match = lower.match(/\bin\s+(\d+)\s+days?\b/);
    daysAhead = Math.min(90, Math.max(1, Number(match?.[1] ?? 7)));
  } else if (/\bnext month\b/.test(lower)) daysAhead = 30;

  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysAhead);
  date.setUTCHours(9, 0, 0, 0);

  const titleMatch =
    message.match(
      /\bremind(?:\s+me)?\s+(?:to\s+)?(.+?)(?:\s+(?:on|by|next|tomorrow|in)\b|[?.!]|$)/i,
    ) ??
    message.match(
      /\bcreate(?:\s+a)?\s+reminder\s+(?:for\s+)?(.+?)(?:\s+(?:on|by|next|tomorrow|in)\b|[?.!]|$)/i,
    );

  const title = (titleMatch?.[1]?.trim() || 'CardOrbit reminder')
    .replace(/\s+/g, ' ')
    .slice(0, 120);

  return {
    title,
    eventDateIso: date.toISOString(),
    daysAhead,
  };
}

export function looksLikeConfirmMessage(message: string): boolean {
  const lower = message.trim().toLowerCase();
  return /^(yes|y|ok|okay|confirm|confirmed|do it|go ahead|please confirm|yes please)\b/.test(
    lower,
  );
}

export function looksLikeWeeklyOptimize(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    /\bweekly\b/.test(lower) ||
    /\boptimize\b/.test(lower) ||
    /\boptimisation\b/.test(lower) ||
    /\bthis week\b/.test(lower) ||
    /\bmaximize (?:my )?(?:rewards|points|cashback)\b/.test(lower) ||
    /\bhow can i (?:save|earn) more\b/.test(lower)
  );
}

export function looksLikeCalendarAgenda(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    /\bagenda\b/.test(lower) ||
    /\bupcoming (?:bills?|fees?|payments?|events?)\b/.test(lower) ||
    /\bwhat(?:'s| is) (?:coming|due)\b/.test(lower) ||
    /\bcalendar\b/.test(lower)
  );
}

export function looksLikeReminderRequest(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    /\bremind(?:\s+me)?\b/.test(lower) ||
    /\bcreate(?:\s+a)?\s+reminder\b/.test(lower) ||
    /\bset(?:\s+a)?\s+reminder\b/.test(lower)
  );
}
