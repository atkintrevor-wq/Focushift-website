import { json, onRequestHandler } from '../../_lib/http.js';

export const onRequestGet = onRequestHandler(async ({ env }) => {
  return json({
    ok: true,
    service: 'ifta-fuel-log',
    database: Boolean(env.DB),
    receipts: Boolean(env.RECEIPTS),
    admin_password: Boolean(env.FUEL_ADMIN_PASSWORD),
    driver_pin: Boolean(env.FUEL_DRIVER_PIN),
  });
});
