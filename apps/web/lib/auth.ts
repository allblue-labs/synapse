/**
 * Auth-token helpers — single source of truth for client-side cookie I/O.
 *
 * The token is stored as a JS-readable cookie (not HttpOnly) because the
 * Authorization header is built in-browser before each fetch. The dashboard
 * layout *also* checks for the cookie's presence server-side via next/headers,
 * which gives a free SSR auth gate.
 *
 * For a stricter posture in production, move the cookie to HttpOnly and add
 * a server-side login endpoint (Next route handler) that performs the API
 * call and sets the cookie via Set-Cookie. The current shape keeps the
 * surface small while the platform is in private beta.
 */

const TOKEN_NAME = 'synapse_token';
const ONE_DAY = 60 * 60 * 24;

export function setToken(token: string): void {
  if (typeof document === 'undefined') return;
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie =
    `${TOKEN_NAME}=${encodeURIComponent(token)};path=/;max-age=${ONE_DAY};SameSite=Lax${secure}`;
}

export function clearToken(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${TOKEN_NAME}=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

export function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)synapse_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Best-effort decode of the JWT payload (no signature verification).
 * Useful for client-side display ("Signed in as ...") — never trust this for
 * authorisation decisions.
 */
export function decodeTokenPayload<T = Record<string, unknown>>(token: string): T | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/** Sign out: clear the cookie and force a hard navigation to /login. */
export function signOut(): void {
  clearToken();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}

/** Is the JWT expired (best-effort, client-side hint only). */
export function isTokenExpired(token: string): boolean {
  const payload = decodeTokenPayload<{exp?: number}>(token);
  if (!payload?.exp) return false;
  return payload.exp * 1000 < Date.now();
}
