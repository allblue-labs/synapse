/**
 * Shared cookie configuration used by:
 *   - the JWT extractor in `jwt.strategy.ts`
 *   - the auth controller (set on login/register, clear on logout)
 *
 * The HttpOnly attribute makes the cookie invisible to JavaScript so
 * it cannot be exfiltrated by XSS. SameSite=Lax prevents CSRF on
 * cross-site POSTs while still allowing the SPA on a sibling origin
 * (same eTLD+1) to send the cookie on first-party fetches.
 */

import type { CookieOptions } from 'express';

export const SESSION_COOKIE_NAME = 'synapse_session';

/**
 * Build the cookie options from runtime config.
 *
 * `maxAgeSeconds` should match the JWT TTL (`JWT_EXPIRES_IN`) so the
 * cookie and the token expire together — never refresh one without the
 * other.
 */
export function buildSessionCookieOptions(opts: {
  isProduction: boolean;
  maxAgeSeconds: number;
}): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure:   opts.isProduction,
    path:     '/',
    maxAge:   opts.maxAgeSeconds * 1000,
    domain: process.env.NODE_ENV === 'development' ? '.allblue.lab' : undefined,
  };
}

/**
 * Cookie options for clearing the session on logout. Mirrors
 * `buildSessionCookieOptions` but with maxAge=0 so the browser drops it
 * immediately.
 */
export function buildLogoutCookieOptions(opts: {isProduction: boolean}): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure:   opts.isProduction,
    path:     '/',
    maxAge:   0,
  };
}
