import { HttpError, clientIp } from './http.js';

const COOKIE = 'fuel_session';
const MAX_AGE = 7 * 24 * 60 * 60;
const MAX_FAILURES = 8;
const LOCK_MS = 15 * 60 * 1000;

export function sessionSecret(env) {
  return env.FUEL_SESSION_SECRET || env.FUEL_ADMIN_PASSWORD || '';
}

export function safeEqual(a, b) {
  const enc = new TextEncoder();
  const aa = enc.encode(String(a));
  const bb = enc.encode(String(b));
  const len = Math.max(aa.length, bb.length, 1);
  let diff = aa.length ^ bb.length;
  for (let i = 0; i < len; i++) diff |= (aa[i] || 0) ^ (bb[i] || 0);
  return diff === 0;
}

function base64url(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function signSession(secret, exp) {
  const payload = `v1.${exp}`;
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

export async function verifySession(secret, token) {
  if (!secret || !token) return false;
  const parts = String(token).split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return false;
  if (!/^\d{1,12}$/.test(parts[1])) return false;
  if (Number(parts[1]) * 1000 < Date.now()) return false;
  const expected = await signSession(secret, parts[1]);
  return safeEqual(token, expected);
}

export function readCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const part of header.split(';')) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    if (key === name) return decodeURIComponent(trimmed.slice(eq + 1));
  }
  return '';
}

function secureFlag(request) {
  return new URL(request.url).protocol === 'https:' ? '; Secure' : '';
}

export async function sessionCookie(request, env) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const token = await signSession(sessionSecret(env), String(exp));
  return `${COOKIE}=${token}; HttpOnly; Path=/fuel; SameSite=Lax; Max-Age=${MAX_AGE}${secureFlag(request)}`;
}

export function clearSessionCookie(request) {
  return `${COOKIE}=; HttpOnly; Path=/fuel; SameSite=Lax; Max-Age=0${secureFlag(request)}`;
}

export async function requireAdmin(context) {
  const { request, env } = context;
  if (!env.FUEL_ADMIN_PASSWORD) {
    throw new HttpError(
      503,
      'Admin password is not set. Add the FUEL_ADMIN_PASSWORD secret on the Pages project, then redeploy.'
    );
  }
  const token = readCookie(request, COOKIE);
  const ok = await verifySession(sessionSecret(env), token);
  if (!ok) throw new HttpError(401, 'Sign in required.');
}

export function assertDriverPin(env, provided) {
  const expected = env.FUEL_DRIVER_PIN;
  if (!expected) return;
  if (!safeEqual(String(provided || ''), String(expected))) {
    throw new HttpError(403, 'Driver PIN was not accepted.');
  }
}

export async function assertLoginAllowed(db, request) {
  const ip = clientIp(request);
  const row = await db.prepare('SELECT failures, locked_until FROM auth_attempts WHERE ip = ?').bind(ip).first();
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
      `INSERT INTO auth_attempts (ip, failures, locked_until) VALUES (?, ?, ?)
       ON CONFLICT(ip) DO UPDATE SET failures = excluded.failures, locked_until = excluded.locked_until`
    )
    .bind(ip, next, lockedUntil)
    .run();
}

export async function clearLoginFailures(db, ip) {
  await db.prepare('DELETE FROM auth_attempts WHERE ip = ?').bind(ip).run();
}
