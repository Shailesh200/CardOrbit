import { isAuthenticated } from '../lib/auth-storage';
import { resolveCheckoutAmount } from '../lib/checkout-context';
import { extensionLogin, extensionLogout } from '../lib/extension-api';
import { fetchTopMatchedOffer } from '../lib/offers-api';
import { resolveMerchantSlugFromUrl } from '../lib/merchant-hosts';
import {
  DEFAULT_RECOMMENDATION_AMOUNT,
  ExtensionMessage,
  type ExtensionGetOverlayStateRequest,
  type ExtensionGetPopupStateRequest,
  type ExtensionLoginRequest,
  type ExtensionLoginResponse,
  type ExtensionSetOverlayCollapsedRequest,
  type ExtensionSubmitRecommendationFeedbackRequest,
  type OverlayRecommendationResponse,
  type PopupRecommendationResponse,
  type TabContext,
} from '../lib/messages';
import { setOverlayCollapsed } from '../lib/overlay-storage';
import { submitRecommendationFeedback } from '../lib/recommendation-feedback-api';
import { fetchBestCardRecommendation, isExtensionEnabled } from '../lib/recommendations-api';

async function readActiveTabContext(): Promise<TabContext> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url ?? null;
  let merchantSlug: string | null = null;
  let merchantHostname: string | null = null;

  if (url) {
    try {
      merchantHostname = new URL(url).hostname;
      merchantSlug = resolveMerchantSlugFromUrl(url);
    } catch {
      // ignore invalid URLs (chrome://, etc.)
    }
  }

  return {
    tabId: tab?.id ?? null,
    url,
    merchantSlug,
    merchantHostname,
  };
}

async function buildPopupState(
  amount = DEFAULT_RECOMMENDATION_AMOUNT,
): Promise<PopupRecommendationResponse> {
  if (!isExtensionEnabled()) {
    return {
      status: 'disabled',
      message: 'The CardOrbit browser extension is not enabled for your account yet.',
    };
  }

  const tab = await readActiveTabContext();

  if (!(await isAuthenticated())) {
    return { status: 'unauthenticated' };
  }

  if (!tab.merchantSlug) {
    return { status: 'no-merchant', tab };
  }

  try {
    const recommendation = await fetchBestCardRecommendation({
      merchantSlug: tab.merchantSlug,
      amount,
    });
    return { status: 'ready', tab, recommendation };
  } catch (error) {
    return {
      status: 'error',
      tab,
      message: error instanceof Error ? error.message : 'Recommendation failed',
    };
  }
}

async function buildOverlayState(
  request: ExtensionGetOverlayStateRequest,
): Promise<OverlayRecommendationResponse> {
  if (!isExtensionEnabled()) {
    return {
      status: 'disabled',
      message: 'The CardOrbit browser extension is not enabled for your account yet.',
    };
  }

  if (!(await isAuthenticated())) {
    return { status: 'unauthenticated' };
  }

  const merchantSlug = request.merchantSlug || resolveMerchantSlugFromUrl(request.url);
  if (!merchantSlug) {
    return { status: 'no-merchant' };
  }

  const amount = request.amount ?? resolveCheckoutAmount(merchantSlug, DEFAULT_RECOMMENDATION_AMOUNT);
  const amountDetected = amount !== DEFAULT_RECOMMENDATION_AMOUNT;

  try {
    const [recommendation, topOffer] = await Promise.all([
      fetchBestCardRecommendation({ merchantSlug, amount }),
      fetchTopMatchedOffer({ merchantSlug, amount }).catch(() => null),
    ]);

    const merchantName = recommendation.merchant?.name ?? 'This merchant';

    return {
      status: 'ready',
      recommendationId: recommendation.recommendationId,
      merchantSlug,
      merchantName,
      amount,
      amountDetected,
      recommendation,
      topOffer: topOffer
        ? {
            title: topOffer.title,
            cashbackPercent: topOffer.cashbackPercent,
            bestEstimatedSavingsInr: topOffer.bestEstimatedSavingsInr,
            isEligible: topOffer.isEligible,
          }
        : null,
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Recommendation failed',
    };
  }
}

async function updateTabBadge(tabId: number, url?: string | null) {
  if (!url) {
    await chrome.action.setBadgeText({ tabId, text: '' });
    return;
  }

  const merchantSlug = resolveMerchantSlugFromUrl(url);
  if (merchantSlug && isExtensionEnabled()) {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: '#0d9488' });
    await chrome.action.setBadgeText({ tabId, text: 'CW' });
    return;
  }

  await chrome.action.setBadgeText({ tabId, text: '' });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' || changeInfo.url) {
    void updateTabBadge(tabId, changeInfo.url ?? tab.url);
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  await updateTabBadge(activeInfo.tabId, tab.url);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === ExtensionMessage.GET_POPUP_STATE) {
    const request = message as ExtensionGetPopupStateRequest;
    void buildPopupState(request.amount).then(sendResponse);
    return true;
  }

  if (message?.type === ExtensionMessage.GET_OVERLAY_STATE) {
    const request = message as ExtensionGetOverlayStateRequest;
    void buildOverlayState(request).then(sendResponse);
    return true;
  }

  if (message?.type === ExtensionMessage.SET_OVERLAY_COLLAPSED) {
    const request = message as ExtensionSetOverlayCollapsedRequest;
    void setOverlayCollapsed(request.collapsed).then(() => sendResponse({ ok: true }));
    return true;
  }

  if (message?.type === ExtensionMessage.SUBMIT_RECOMMENDATION_FEEDBACK) {
    const request = message as ExtensionSubmitRecommendationFeedbackRequest;
    void submitRecommendationFeedback(request.recommendationId, request.feedbackType)
      .then(() => sendResponse({ ok: true }))
      .catch((error: unknown) =>
        sendResponse({
          ok: false,
          message: error instanceof Error ? error.message : 'Feedback failed',
        }),
      );
    return true;
  }

  if (message?.type === ExtensionMessage.LOGIN) {
    const request = message as ExtensionLoginRequest;
    void extensionLogin(request.email, request.password)
      .then((result): ExtensionLoginResponse => ({ ok: true, email: result.user.email }))
      .catch((error: unknown): ExtensionLoginResponse => ({
        ok: false,
        message: error instanceof Error ? error.message : 'Login failed',
      }))
      .then(sendResponse);
    return true;
  }

  if (message?.type === ExtensionMessage.LOGOUT) {
    void extensionLogout().then(() => sendResponse({ ok: true }));
    return true;
  }

  return false;
});

export {};
