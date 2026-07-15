const COLLAPSED_KEY = 'cardwise.overlay.collapsed';

export async function getOverlayCollapsed(): Promise<boolean> {
  const stored = await chrome.storage.local.get(COLLAPSED_KEY);
  return stored[COLLAPSED_KEY] === true;
}

export async function setOverlayCollapsed(collapsed: boolean): Promise<void> {
  await chrome.storage.local.set({ [COLLAPSED_KEY]: collapsed });
}
