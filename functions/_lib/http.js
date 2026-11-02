export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...extraHeaders,
    },
  });
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export function onRequestHandler(fn) {
  return async (context) => {
    try {
      return await fn(context);
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, err.status);
      console.error(err);
      return json({ error: 'Request failed.' }, 500);
    }
  };
}

export function roundGal(n) {
  return Math.round(Number(n) * 1000) / 1000;
}

export function roundMoney(n) {
  return Math.round(Number(n) * 100) / 100;
}

export function clientIp(request) {
  const cf = request.headers.get('CF-Connecting-IP');
  if (cf) return cf;
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return 'unknown';
}
