/**
 * Shared constants that are safe to import from the Proxy (Edge runtime):
 * no Node built-ins, no server state.
 */
export const SESSION_COOKIE =
  process.env.NODE_ENV === 'production' ? '__Host-omniretail_session' : 'omniretail_session';
