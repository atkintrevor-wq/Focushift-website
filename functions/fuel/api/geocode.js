import { json, onRequestHandler, HttpError } from '../../_lib/http.js';
import { stateFromCoordinates } from '../../_lib/geocode.js';

export const onRequestGet = onRequestHandler(async ({ request }) => {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get('lat'));
  const lon = Number(url.searchParams.get('lon'));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw new HttpError(400, 'Latitude and longitude are required.');
  }
  const state = await stateFromCoordinates(lat, lon);
  if (!state) throw new HttpError(404, 'Could not match a US state or Canadian province. Pick one from the list.');
  return json({ state });
});
