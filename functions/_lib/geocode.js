import { stateFromParts } from './states.js';

async function fetchJson(url, headers) {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`geocode ${response.status}`);
  return response.json();
}

async function fromBigDataCloud(lat, lon) {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&localityLanguage=en`;
  const data = await fetchJson(url, { accept: 'application/json' });
  return stateFromParts({
    countryCode: data.countryCode,
    regionCode: data.principalSubdivisionCode,
    regionName: data.principalSubdivision,
  });
}

async function fromNominatim(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;
  const data = await fetchJson(url, {
    accept: 'application/json',
    'user-agent': 'FocusShiftFuelLog/1.0 (https://focusshift.app/fuel)',
  });
  const address = data.address || {};
  return stateFromParts({
    countryCode: address.country_code,
    regionCode: address['ISO3166-2-lvl4'] || address.state_code,
    regionName: address.state,
  });
}

export async function stateFromCoordinates(lat, lon) {
  try {
    const state = await fromBigDataCloud(lat, lon);
    if (state) return state;
  } catch (err) {
    console.error('bigdatacloud lookup failed', err);
  }
  try {
    return await fromNominatim(lat, lon);
  } catch (err) {
    console.error('nominatim lookup failed', err);
    return '';
  }
}
