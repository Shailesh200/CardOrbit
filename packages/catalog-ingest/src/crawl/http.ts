const DEFAULT_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-IN,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
};

export type FetchHtmlResult = {
  html: string;
  finalUrl: string;
};

export async function fetchHtml(url: string, timeoutMs = 30_000, referer?: string): Promise<FetchHtmlResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = { ...DEFAULT_HEADERS };
    if (referer) {
      headers.Referer = referer;
      headers['Sec-Fetch-Site'] = 'same-origin';
    }
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
      redirect: 'follow',
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${url}`);
    }
    return { html: await response.text(), finalUrl: response.url };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchText(url: string, timeoutMs = 30_000, referer?: string): Promise<string> {
  const { html } = await fetchHtml(url, timeoutMs, referer);
  return html;
}
