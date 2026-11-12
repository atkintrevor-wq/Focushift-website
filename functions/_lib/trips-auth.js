import { safeEqual, readCookie } from './auth.js';
import { HttpError, clientIp } from './http.js';

const COOKIE = 'trips_session';
const MAX_AGE = 90 * 24 * 60 * 60;
const MAX_FAILURES = 8;
const LOCK_MS = 15 * 60 * 1000;

export function tripsSessionSecret(env) {
  return env.TRIPS_SESSION_SECRET || env.TRIPS_PASSWORD || '';
}

function base64url(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function signTripsSession(secret, exp) {
  const payload = `t1.${exp}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return `${payload}.${base64url(sig)}`;
}

export async function verifyTripsSession(secret, token) {
  if (!secret || !token) return false;
  const parts = String(token).split('.');
  if (parts.length !== 3 || parts[0] !== 't1') return false;
  if (!/^\d{1,12}$/.test(parts[1])) return false;
  if (Number(parts[1]) * 1000 < Date.now()) return false;
  const expected = await signTripsSession(secret, parts[1]);
  return safeEqual(token, expected);
}

function secureFlag(request) {
  return new URL(request.url).protocol === 'https:' ? '; Secure' : '';
}

export async function tripsSessionCookie(request, env) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const token = await signTripsSession(tripsSessionSecret(env), String(exp));
  return `${COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/trips; SameSite=Lax; Max-Age=${MAX_AGE}${secureFlag(request)}`;
}

export function clearTripsSessionCookie(request) {
  return `${COOKIE}=; HttpOnly; Path=/trips; SameSite=Lax; Max-Age=0${secureFlag(request)}`;
}

export function bearerPassword(request) {
  const header = request.headers.get('authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : '';
}

export function assertPasswordConfigured(env) {
  if (!env.TRIPS_PASSWORD) {
    throw new HttpError(
      503,
      'Trip log password is not set. Add the TRIPS_PASSWORD secret on the Pages project, then redeploy.'
    );
  }
}

export async function requireTripsAuth(context) {
  const { request, env } = context;
  assertPasswordConfigured(env);
  const bearer = bearerPassword(request);
  if (bearer) {
    if (!safeEqual(bearer, env.TRIPS_PASSWORD)) throw new HttpError(401, 'Sign in required.');
    return;
  }
  const token = readCookie(request, COOKIE);
  const ok = await verifyTripsSession(tripsSessionSecret(env), token);
  if (!ok) throw new HttpError(401, 'Sign in required.');
}

export async function assertLoginAllowed(db, request) {
  const ip = clientIp(request);
  const row = await db.prepare('SELECT failures, locked_until FROM trips_auth_attempts WHERE ip = ?').bind(ip).first();
  if (row?.locked_until && Date.parse(row.locked_until) > Date.now()) {
    throw new HttpError(429, 'Too many sign-in attempts. Try again in a few minutes.');
  }
  return { ip, failures: row?.failures || 0 };
}

export async function recordLoginFailure(db, ip, failures) {
  const next = failures + 1;
  const lockedUntil = next >= MAX_FAILURES ? new Date(Date.now() + LOCK_MS).toISOString() : null;
  await db
    .prepare(
      `INSERT INTO trips_auth_attempts (ip, failures, locked_until) VALUES (?, ?, ?)
       ON CONFLICT(ip) DO UPDATE SET failures = excluded.failures, locked_until = excluded.locked_until`
    )
    .bind(ip, next, lockedUntil)
    .run();
}

export async function clearLoginFailures(db, ip) {
  await db.prepare('DELETE FROM trips_auth_attempts WHERE ip = ?').bind(ip).run();
}
