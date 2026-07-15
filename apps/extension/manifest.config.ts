import type { ManifestV3Export } from '@crxjs/vite-plugin';

import { getMerchantContentScriptMatches } from './src/lib/merchant-hosts';
import { getIssuerPortalContentScriptMatches } from './src/lib/portal-hosts';

const apiUrl = process.env.VITE_API_URL ?? 'http://localhost:3000';

const contentScriptMatches = [
  ...new Set([...getMerchantContentScriptMatches(), ...getIssuerPortalContentScriptMatches()]),
];

const manifest: ManifestV3Export = {
  manifest_version: 3,
  name: 'CardOrbit',
  version: '0.2.0',
  description: 'Optimize every payment — AI recommendations before you checkout.',
  permissions: ['storage', 'tabs', 'activeTab'],
  host_permissions: [`${apiUrl}/*`],
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_title: 'CardOrbit — Optimize this payment',
  },
  content_scripts: [
    {
      matches: contentScriptMatches,
      js: ['src/content/overlay.ts'],
      run_at: 'document_idle',
    },
  ],
  icons: {
    '16': 'public/icons/icon-16.png',
    '48': 'public/icons/icon-48.png',
    '128': 'public/icons/icon-128.png',
  },
};

export default manifest;
