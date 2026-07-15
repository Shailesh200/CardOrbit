/**
 * Re-export curated issuer travel portals from shared validation package
 * so API, web, and extension stay on one catalog.
 */
export {
  ISSUER_TRAVEL_PORTALS,
  listActivePortals,
  findPortalById,
  findPortalBySlug,
  findPortalByHostname,
} from '@cardwise/validation';
