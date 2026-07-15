import {
  DEFAULT_RECOMMENDATION_AMOUNT,
  ExtensionMessage,
  formatInr,
  type OverlayRecommendationResponse,
} from '../lib/messages';
import { resolveCheckoutAmount } from '../lib/checkout-context';
import { getOverlayCollapsed, setOverlayCollapsed } from '../lib/overlay-storage';
import { resolveMerchantSlugFromUrl } from '../lib/merchant-hosts';
import { resolveIssuerPortalFromUrl, type IssuerPortalHostRule } from '../lib/portal-hosts';
import {
  trackExtensionMerchantDetected,
  trackExtensionOpened,
  trackExtensionOverlayInteraction,
  trackExtensionOverlayViewed,
} from '../lib/extension-analytics';

import overlayCss from './overlay.css?inline';

const HOST_ID = 'cardwise-extension-overlay-host';
const WEB_APP_URL = import.meta.env.VITE_WEB_URL || 'http://localhost:5173';
const REFRESH_DEBOUNCE_MS = 800;

type OverlayElements = {
  host: HTMLElement;
  shadow: ShadowRoot;
  root: HTMLElement;
};

let overlayElements: OverlayElements | null = null;
let refreshTimer: number | null = null;
let lastUrl = location.href;
let sessionHidden = false;

function sendMessage<T>(message: unknown): Promise<T> {
  return chrome.runtime.sendMessage(message);
}

function ensureOverlay(): OverlayElements {
  if (overlayElements) return overlayElements;

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.setAttribute('data-cardwise-extension', 'overlay');
  const shadow = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = overlayCss;
  shadow.appendChild(style);

  const root = document.createElement('div');
  root.className = 'cw-overlay-root';
  shadow.appendChild(root);

  document.documentElement.appendChild(host);
  overlayElements = { host, shadow, root };
  return overlayElements;
}

function removeOverlay() {
  overlayElements?.host.remove();
  overlayElements = null;
}

function renderLoading(root: HTMLElement, collapsed: boolean) {
  if (collapsed) {
    root.innerHTML = `
      <button type="button" class="cw-collapsed-pill" data-action="expand">
        <span class="cw-dot" aria-hidden="true"></span>
        CardOrbit
      </button>
    `;
    return;
  }

  root.innerHTML = `
    <section class="cw-panel" aria-live="polite">
      <header class="cw-header">
        <div class="cw-brand"><span class="cw-dot" aria-hidden="true"></span>CardOrbit</div>
        <div class="cw-actions">
          <button type="button" class="cw-btn" data-action="collapse">Minimize</button>
        </div>
      </header>
      <div class="cw-body">
        <p class="cw-meta">Checking this page…</p>
      </div>
    </section>
  `;
}

function renderHidden(root: HTMLElement) {
  root.innerHTML = `
    <button type="button" class="cw-collapsed-pill" data-action="expand-hidden" title="Show CardOrbit">
      <span class="cw-dot" aria-hidden="true"></span>
      CardOrbit
    </button>
  `;
}

function renderState(root: HTMLElement, state: OverlayRecommendationResponse, collapsed: boolean) {
  if (state.status === 'disabled' || state.status === 'no-merchant') {
    removeOverlay();
    return;
  }

  if (state.status === 'unauthenticated') {
    if (collapsed) {
      root.innerHTML = `
        <button type="button" class="cw-collapsed-pill" data-action="open-app">
          <span class="cw-dot" aria-hidden="true"></span>
          Sign in to CardOrbit
        </button>
      `;
      return;
    }

    root.innerHTML = `
      <section class="cw-panel">
        <header class="cw-header">
          <div class="cw-brand"><span class="cw-dot" aria-hidden="true"></span>CardOrbit</div>
          <div class="cw-actions">
            <button type="button" class="cw-btn" data-action="collapse">Minimize</button>
            <button type="button" class="cw-btn" data-action="hide">Hide</button>
          </div>
        </header>
        <div class="cw-empty">Sign in via the CardOrbit popup to see live recommendations on this site.</div>
        <div class="cw-footer">
          <span class="cw-meta">Use the CardOrbit toolbar icon to sign in.</span>
        </div>
      </section>
    `;
    return;
  }

  if (state.status === 'error') {
    root.innerHTML = `
      <section class="cw-panel">
        <header class="cw-header">
          <div class="cw-brand"><span class="cw-dot" aria-hidden="true"></span>CardOrbit</div>
          <div class="cw-actions">
            <button type="button" class="cw-btn" data-action="refresh">Retry</button>
            <button type="button" class="cw-btn" data-action="hide">Hide</button>
          </div>
        </header>
        <div class="cw-error">${escapeHtml(state.message)}</div>
      </section>
    `;
    return;
  }

  const bestCard = state.recommendation.recommendedCard;
  const rewardLine = bestCard
    ? `${formatInr(bestCard.expectedReward)} on ${formatInr(state.amount)}`
    : 'Add a portfolio card to earn rewards here';

  if (collapsed) {
    root.innerHTML = `
      <button type="button" class="cw-collapsed-pill" data-action="expand">
        <span class="cw-dot" aria-hidden="true"></span>
        ${bestCard ? escapeHtml(bestCard.cardName) : 'CardOrbit'}
      </button>
    `;
    return;
  }

  const offerBlock = state.topOffer
    ? `
      <div class="cw-offer">
        <div class="cw-offer-title">${escapeHtml(state.topOffer.title)}</div>
        ${
          state.topOffer.bestEstimatedSavingsInr != null
            ? `<div>Est. savings ${formatInr(state.topOffer.bestEstimatedSavingsInr)}${
                state.topOffer.isEligible ? '' : ' · add eligible card'
              }</div>`
            : state.topOffer.cashbackPercent
              ? `<div>Up to ${escapeHtml(state.topOffer.cashbackPercent)}% back</div>`
              : ''
        }
      </div>
    `
    : '';

  root.innerHTML = `
    <section class="cw-panel" aria-live="polite">
      <header class="cw-header">
        <div class="cw-brand"><span class="cw-dot" aria-hidden="true"></span>Live on ${escapeHtml(state.merchantName)}</div>
        <div class="cw-actions">
          <button type="button" class="cw-btn" data-action="refresh">Refresh</button>
          <button type="button" class="cw-btn" data-action="collapse">Minimize</button>
          <button type="button" class="cw-btn" data-action="hide">Hide</button>
        </div>
      </header>
      <div class="cw-body">
        <div>
          <div class="cw-merchant">${bestCard ? 'Best card in your portfolio' : 'No portfolio match yet'}</div>
          <div class="cw-meta">${
            state.amountDetected ? 'Detected spend' : 'Sample spend'
          }: ${formatInr(state.amount)}</div>
        </div>
        <div class="cw-card">
          <div class="cw-card-name">${bestCard ? escapeHtml(bestCard.cardName) : 'Add a card to unlock rewards'}</div>
          <div class="cw-reward">${escapeHtml(rewardLine)}</div>
          ${
            bestCard?.explanation
              ? `<div class="cw-meta" style="margin-top:6px">${escapeHtml(bestCard.explanation)}</div>`
              : ''
          }
        </div>
        ${offerBlock}
        <div class="cw-footer" style="padding-top:0">
          <button type="button" class="cw-link cw-link--ghost" data-action="feedback-useful" data-recommendation-id="${escapeHtml(state.recommendationId)}">Helpful</button>
          <button type="button" class="cw-link cw-link--ghost" data-action="feedback-not-useful" data-recommendation-id="${escapeHtml(state.recommendationId)}">Not helpful</button>
        </div>
      </div>
      <div class="cw-footer">
        <a class="cw-link" href="${WEB_APP_URL}/account/merchants/${encodeURIComponent(state.merchantSlug)}" target="_blank" rel="noreferrer">Full breakdown</a>
        <a class="cw-link cw-link--ghost" href="${WEB_APP_URL}/account/offers" target="_blank" rel="noreferrer">All offers</a>
      </div>
    </section>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function renderPortalAssist(
  root: HTMLElement,
  portal: IssuerPortalHostRule,
  collapsed: boolean,
) {
  if (collapsed) {
    root.innerHTML = `
      <button type="button" class="cw-collapsed-pill" data-action="expand">
        <span class="cw-dot" aria-hidden="true"></span>
        ${escapeHtml(portal.name)}
      </button>
    `;
    return;
  }

  const cardHint =
    portal.cardHints.length > 0
      ? `Prefer an eligible ${escapeHtml(portal.bankName)} card (${escapeHtml(portal.cardHints.slice(0, 3).join(', '))}).`
      : `Prefer an eligible ${escapeHtml(portal.bankName)} card for acceleration.`;

  root.innerHTML = `
    <section class="cw-panel" aria-live="polite">
      <header class="cw-header">
        <div class="cw-brand"><span class="cw-dot" aria-hidden="true"></span>CardOrbit</div>
        <div class="cw-actions">
          <button type="button" class="cw-btn" data-action="collapse">Minimize</button>
          <button type="button" class="cw-btn" data-action="hide">Hide</button>
        </div>
      </header>
      <div class="cw-body">
        <p class="cw-meta">Issuer travel portal</p>
        <div class="cw-card-name">${escapeHtml(portal.name)}</div>
        <p>${escapeHtml(portal.accelerationSummary)}</p>
        <p class="cw-meta">${cardHint}</p>
        <p class="cw-meta">Book on this site to keep accelerated portal rewards — not on a generic OTA.</p>
      </div>
      <div class="cw-footer">
        <a class="cw-link" href="${WEB_APP_URL}/account/travel/booking" target="_blank" rel="noopener noreferrer" data-action="open-booking">
          Compare channels in CardOrbit
        </a>
      </div>
    </section>
  `;
}

async function loadOverlay(collapsedOverride?: boolean) {
  const portal = resolveIssuerPortalFromUrl(location.href);
  const merchantSlug = resolveMerchantSlugFromUrl(location.href);

  if ((!portal && !merchantSlug) || sessionHidden) {
    if (sessionHidden && overlayElements) {
      renderHidden(overlayElements.root);
      return;
    }
    removeOverlay();
    return;
  }

  const { root } = ensureOverlay();
  const collapsed =
    collapsedOverride ?? (await getOverlayCollapsed().catch(() => false));

  if (portal) {
    renderPortalAssist(root, portal, collapsed);
    trackExtensionOverlayViewed({
      merchantSlug: portal.slug,
      merchantName: portal.name,
      amount: DEFAULT_RECOMMENDATION_AMOUNT,
      amountDetected: false,
      recommendedCardId: undefined,
      recommendationId: undefined,
    });
    return;
  }

  renderLoading(root, collapsed);

  const detectedAmount = resolveCheckoutAmount(merchantSlug!, DEFAULT_RECOMMENDATION_AMOUNT);

  try {
    const state = await sendMessage<OverlayRecommendationResponse>({
      type: ExtensionMessage.GET_OVERLAY_STATE,
      url: location.href,
      merchantSlug,
      amount: detectedAmount,
    });
    renderState(root, state, collapsed);

    if (state.status === 'ready') {
      trackExtensionOverlayViewed({
        merchantSlug: state.merchantSlug,
        merchantName: state.merchantName,
        amount: state.amount,
        amountDetected: state.amountDetected,
        recommendedCardId: state.recommendation.recommendedCard?.cardId,
        recommendationId: state.recommendationId,
      });
    }
  } catch (error) {
    renderState(
      root,
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Could not load recommendation',
      },
      collapsed,
    );
  }
}

function scheduleRefresh() {
  if (refreshTimer != null) {
    window.clearTimeout(refreshTimer);
  }
  refreshTimer = window.setTimeout(() => {
    refreshTimer = null;
    void loadOverlay();
  }, REFRESH_DEBOUNCE_MS);
}

async function setCollapsed(collapsed: boolean) {
  await setOverlayCollapsed(collapsed);
  await sendMessage({
    type: ExtensionMessage.SET_OVERLAY_COLLAPSED,
    collapsed,
  });
  await loadOverlay(collapsed);
}

function trackOverlayAction(
  action:
    | 'collapse'
    | 'expand'
    | 'hide'
    | 'refresh'
    | 'feedback_helpful'
    | 'feedback_not_helpful',
  recommendationId?: string,
) {
  const merchantSlug = resolveMerchantSlugFromUrl(location.href);
  if (!merchantSlug) return;
  trackExtensionOverlayInteraction({
    merchantSlug,
    action,
    recommendationId,
  });
}

function bindOverlayEvents(root: HTMLElement) {
  root.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.closest('[data-action]')?.getAttribute('data-action');
    if (!action) return;

    if (action === 'collapse') {
      trackOverlayAction('collapse');
      void setCollapsed(true);
      return;
    }
    if (action === 'expand' || action === 'expand-hidden') {
      trackOverlayAction('expand');
      sessionHidden = false;
      void setCollapsed(false);
      return;
    }
    if (action === 'hide') {
      trackOverlayAction('hide');
      sessionHidden = true;
      renderHidden(root);
      return;
    }
    if (action === 'refresh') {
      trackOverlayAction('refresh');
      void loadOverlay(false);
      return;
    }
    if (action === 'feedback-useful' || action === 'feedback-not-useful') {
      const recommendationId = target.closest('[data-recommendation-id]')?.getAttribute('data-recommendation-id');
      if (!recommendationId) return;
      trackOverlayAction(
        action === 'feedback-useful' ? 'feedback_helpful' : 'feedback_not_helpful',
        recommendationId,
      );
      void sendMessage({
        type: ExtensionMessage.SUBMIT_RECOMMENDATION_FEEDBACK,
        recommendationId,
        feedbackType: action === 'feedback-useful' ? 'USEFUL' : 'NOT_USEFUL',
      });
    }
  });
}

function watchNavigation() {
  window.addEventListener('popstate', () => scheduleRefresh());

  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      sessionHidden = false;
      scheduleRefresh();
      return;
    }
    scheduleRefresh();
  });

  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
  });
}

function init() {
  const merchantSlug = resolveMerchantSlugFromUrl(location.href);
  if (!merchantSlug) return;

  trackExtensionMerchantDetected({
    merchantSlug,
    merchantHostname: location.hostname,
    tabUrl: location.href,
  });
  trackExtensionOpened({ surface: 'overlay', merchantSlug });

  const { root } = ensureOverlay();
  bindOverlayEvents(root);
  watchNavigation();
  void loadOverlay();
}

init();
