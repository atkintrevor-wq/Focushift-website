import { HttpError } from './http.js';

const TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/heic': '.heic',
  'image/heif': '.heif',
};

const MAX_BYTES = 8 * 1024 * 1024;

export function imageExtension(type) {
  const base = String(type || '').toLowerCase().split(';')[0].trim();
  const normalized = base === 'image/jpg' ? 'image/jpeg' : base;
  return TYPES[normalized] ? { contentType: normalized, ext: TYPES[normalized] } : null;
}

export async function storeReceipt(env, file) {
  if (!file || !file.size) return { receiptKey: null, warning: null };
  const image = imageExtension(file.type);
  if (!image) throw new HttpError(400, 'Receipt photo must be a JPEG, PNG, WebP, GIF, or HEIC image.');
  if (file.size > MAX_BYTES) throw new HttpError(413, 'Receipt photo must be 8 MB or smaller.');
  if (!env.RECEIPTS || typeof env.RECEIPTS.put !== 'function') {
    return {
      receiptKey: null,
      warning: 'Entry saved, but the receipt photo was not stored. Bind an R2 bucket as RECEIPTS, then redeploy.',
    };
  }
  const receiptKey = `receipts/${crypto.randomUUID()}${image.ext}`;
  try {
    const bytes = await file.arrayBuffer();
    await env.RECEIPTS.put(receiptKey, bytes, { httpMetadata: { contentType: image.contentType } });
    return { receiptKey, warning: null };
  } catch (err) {
    console.error('receipt upload failed', err);
    return {
      receiptKey: null,
      warning: 'Entry saved, but the receipt photo could not be stored.',
    };
  }
}

export async function deleteReceipt(env, receiptKey) {
  if (!receiptKey || !env.RECEIPTS || typeof env.RECEIPTS.delete !== 'function') return;
  try {
    await env.RECEIPTS.delete(receiptKey);
  } catch (err) {
    console.error('receipt delete failed', err);
  }
}
