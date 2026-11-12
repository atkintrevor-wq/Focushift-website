import { json, onRequestHandler } from '../../_lib/http.js';

export const onRequestGet = onRequestHandler(async ({ env }) => {
  return json({
    ok: true,
    service: 'trips-log',
    database: Boolean(env.DB),
    password: Boolean(env.TRIPS_PASSWORD),
  });
});
