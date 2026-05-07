/**
 * Auth helpers — cookie-based session model.
 *
 * The JWT is stored in an HttpOnly cookie set by the API (`Set-Cookie:
 * synapse_session=…`). JavaScript on the page cannot read it, set it,
 * or clear it; signing out therefore goes through the API so the
 * server can issue an expired-cookie response.
 *
 * Everything that used to live here (`setToken`, `getToken`,
 * `clearToken`, `decodeTokenPayload`, `isTokenExpired`) is gone — none
 * of it is meaningful now that the cookie is opaque to the browser.
 */

import {api} from './api';

/**
 * Hard sign-out. Hits the API to clear the HttpOnly cookie, then
 * forces a full navigation so any in-memory state (React tree,
 * caches) is reset.
 *
 * Best-effort: if the network call fails we still navigate, because
 * the cookie may already be invalid and stranding the user on a
 * "Signed in" UI would be worse than a confusing fetch error.
 */
export async function signOut(): Promise<void> {
  try {
    await api.auth.logout();
  } catch {
    // Swallowed by design — see comment above.
  }

  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}
