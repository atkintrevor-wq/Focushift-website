import { HttpError, roundGal, roundMoney } from './http.js';
import { isState } from './states.js';

function cleanText(value, max) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);
}

export function isRealDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 2000 || year > 2100) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function parseEntry(fields) {
  const honeypot = cleanText(fields.company_website, 200);
  if (honeypot) throw new HttpError(400, 'Could not save that entry.');

  const purchaseDate = cleanText(fields.purchase_date, 10);
  if (!isRealDate(purchaseDate)) throw new HttpError(400, 'Enter a real purchase date.');

  const state = cleanText(fields.state, 8).toUpperCase();
  if (!isState(state)) throw new HttpError(400, 'Choose a US state or Canadian province.');

  const stationName = cleanText(fields.station_name, 120);
  if (!stationName) throw new HttpError(400, 'Enter the store or station name.');

  const gallons = roundGal(fields.gallons);
  if (!(gallons > 0) || gallons > 5000) throw new HttpError(400, 'Gallons must be greater than 0 and at most 5,000.');

  const totalPrice = roundMoney(fields.total_price);
  if (!(totalPrice >= 0) || Number.isNaN(totalPrice) || totalPrice > 20000) {
    throw new HttpError(400, 'Total price must be 0 or more, and at most 20,000.');
  }

  const truckNumber = cleanText(fields.truck_number, 40);
  if (!truckNumber) throw new HttpError(400, 'Enter the truck number.');

  const driverName = cleanText(fields.driver_name, 80);
  if (!driverName) throw new HttpError(400, 'Enter the driver name.');

  let clientId = cleanText(fields.client_id, 80);
  if (clientId && !/^[A-Za-z0-9_-]{8,80}$/.test(clientId)) {
    throw new HttpError(400, 'That entry id is not valid.');
  }
  if (!clientId) clientId = null;

  return {
    client_id: clientId,
    purchase_date: purchaseDate,
    state,
    station_name: stationName,
    gallons,
    total_price: totalPrice,
    truck_number: truckNumber,
    driver_name: driverName,
    driver_pin: String(fields.driver_pin ?? ''),
  };
}

export function parseFilters(searchParams) {
  const filters = {};
  const state = String(searchParams.get('state') || '').trim().toUpperCase();
  if (state) {
    if (!isState(state)) throw new HttpError(400, 'That state filter is not valid.');
    filters.state = state;
  }

  const year = String(searchParams.get('year') || '').trim();
  if (year) {
    if (!/^\d{4}$/.test(year)) throw new HttpError(400, 'That year filter is not valid.');
    filters.year = year;
  }

  const quarterRaw = String(searchParams.get('quarter') || '').trim().replace(/^Q/i, '');
  if (quarterRaw) {
    if (!['1', '2', '3', '4'].includes(quarterRaw)) throw new HttpError(400, 'Quarter must be 1, 2, 3, or 4.');
    filters.quarter = quarterRaw;
  }

  const driver = String(searchParams.get('driver') || '')
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, 80);
  if (driver) filters.driver = driver;

  return filters;
}
