import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { aggregate } from './aggregate.js';
import { safeEqual, signSession, verifySession } from './auth.js';
import { stateFromParts, ALL_REGIONS, driverFormRegions } from './states.js';
import { rankStores } from './stores.js';
import { parseEntry, parseFilters } from './validate.js';
import { buildFuelWorkbook, crc32 } from './xlsx.js';

test('crc32 matches the standard check value', () => {
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
});

test('session token round-trips and rejects tampering', async () => {
  const secret = 'office-secret';
  const exp = String(Math.floor(Date.now() / 1000) + 3600);
  const token = await signSession(secret, exp);
  assert.equal(await verifySession(secret, token), true);
  assert.equal(await verifySession('other-secret', token), false);
  assert.equal(await verifySession(secret, token.slice(0, -2) + 'aa'), false);
  const expired = await signSession(secret, '100');
  assert.equal(await verifySession(secret, expired), false);
  assert.equal(safeEqual('same', 'same'), true);
  assert.equal(safeEqual('same', 'same!'), false);
});

test('entry validation and filters', () => {
  const entry = parseEntry({
    purchase_date: '2026-04-15',
    state: 'tx',
    station_name: '  Pilot #4 ',
    gallons: '100.1256',
    total_price: '399.999',
    truck_number: '101',
    driver_name: 'Sam',
    client_id: 'abcdefgh',
  });
  assert.equal(entry.state, 'TX');
  assert.equal(entry.station_name, 'Pilot #4');
  assert.equal(entry.gallons, 100.126);
  assert.equal(entry.total_price, 400);
  assert.throws(() => parseEntry({ ...entry, purchase_date: '2026-02-31', state: 'TX', gallons: 1, total_price: 1 }), /real purchase date/);
  assert.throws(() => parseEntry({ purchase_date: '2026-01-01', state: 'ZZ', station_name: 'A', gallons: 1, total_price: 1, truck_number: '1', driver_name: 'A' }), /state/);
  assert.throws(() => parseEntry({ purchase_date: '2026-01-01', state: 'TX', station_name: 'A', gallons: 1, total_price: 1, truck_number: '1', driver_name: 'A', company_website: 'https://spam.example' }), /Could not save/);

  const params = new URLSearchParams('state=on&year=2026&quarter=Q2&driver=Sam');
  assert.deepEqual(parseFilters(params), { state: 'ON', year: '2026', quarter: '2', driver: 'Sam' });
});

test('geocode codes map to IFTA jurisdictions', () => {
  assert.equal(stateFromParts({ countryCode: 'US', regionCode: 'US-TX', regionName: 'Texas' }), 'TX');
  assert.equal(stateFromParts({ countryCode: 'CA', regionCode: 'CA-ON', regionName: 'Ontario' }), 'ON');
  assert.equal(stateFromParts({ countryCode: 'MX', regionCode: 'MX-TAM', regionName: 'Tamaulipas' }), '');
  assert.equal(stateFromParts({ countryCode: 'US', regionName: 'District of Columbia' }), 'DC');
});

test('quarter and state totals', () => {
  const summary = aggregate([
    { state: 'TX', purchase_date: '2026-01-15', gallons: 10, total_price: 30 },
    { state: 'TX', purchase_date: '2026-03-31', gallons: 1.5, total_price: 4.5 },
    { state: 'ON', purchase_date: '2026-04-01', gallons: 20, total_price: 80 },
    { state: 'OK', purchase_date: '2026-12-31', gallons: 5, total_price: 15 },
  ]);
  assert.equal(summary.totals.count, 4);
  assert.equal(summary.totals.gallons, 36.5);
  assert.equal(summary.totals.total_price, 129.5);
  assert.deepEqual(summary.byState.map((row) => row.state), ['OK', 'ON', 'TX']);
  assert.equal(summary.byState.find((row) => row.state === 'TX').gallons, 11.5);
  assert.deepEqual(
    summary.byQuarter.map((row) => `${row.year}-${row.quarter}`),
    ['2026-Q4', '2026-Q2', '2026-Q1']
  );
  assert.equal(summary.byQuarter.find((row) => row.quarter === 'Q1').count, 2);
});

test('workbook has entries, by-state, and by-quarter sheets', () => {
  const summary = aggregate([
    { state: 'TX', purchase_date: '2026-11-02', gallons: 120.5, total_price: 451.2 },
  ]);
  const bytes = buildFuelWorkbook({
    entries: [{
      id: 7,
      purchase_date: '2026-11-02',
      state: 'TX',
      station_name: 'Pilot =cmd',
      gallons: 120.5,
      total_price: 451.2,
      truck_number: '101',
      driver_name: 'Alex',
      receipt: 'https://focusshift.app/fuel/api/receipts/7',
      created_at: '2026-11-02 15:04:00',
    }],
    byState: summary.byState,
    byQuarter: summary.byQuarter,
  });
  assert.equal(bytes[0], 0x50);
  assert.equal(bytes[1], 0x4b);

  const python = spawnSync('python3', ['-c', `
import io, sys, zipfile
import xml.etree.ElementTree as ET
z = zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()))
names = set(z.namelist())
needed = {
  "xl/workbook.xml",
  "xl/worksheets/sheet1.xml",
  "xl/worksheets/sheet2.xml",
  "xl/worksheets/sheet3.xml",
  "xl/styles.xml",
}
missing = needed - names
if missing:
    raise SystemExit("missing " + ", ".join(sorted(missing)))
book = z.read("xl/workbook.xml").decode()
for sheet in ("Entries", "By State", "By Quarter"):
    if sheet not in book:
        raise SystemExit("sheet name missing: " + sheet)
ns = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
root = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
texts = [node.text or "" for node in root.findall(".//m:t", ns)]
if "Pilot =cmd" not in texts:
    raise SystemExit("station text missing")
values = [node.text for node in root.findall(".//m:v", ns)]
if "120.5" not in values or "451.2" not in values:
    raise SystemExit("numbers missing: " + ",".join(values))
state = ET.fromstring(z.read("xl/worksheets/sheet2.xml"))
state_text = [node.text or "" for node in state.findall(".//m:t", ns)]
if "TX" not in state_text:
    raise SystemExit("state sheet missing TX")
quarter = ET.fromstring(z.read("xl/worksheets/sheet3.xml"))
quarter_text = [node.text or "" for node in quarter.findall(".//m:t", ns)]
if "Q4" not in quarter_text:
    raise SystemExit("quarter sheet missing Q4")
print("ok")
`], { input: Buffer.from(bytes) });
  assert.equal(python.status, 0, python.stderr.toString() || python.stdout.toString());
});

test('driver dropdown leads with Utah and Nevada', () => {
  const { preferred, rest } = driverFormRegions();
  assert.deepEqual(preferred.map(([code]) => code), ['UT', 'NV']);
  assert.equal(rest.some(([code]) => code === 'UT' || code === 'NV'), false);
  assert.equal(rest.length, ALL_REGIONS.length - 2);
  const names = rest.map(([, name]) => name);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
  assert.equal(names[0], 'Alabama');

  const app = readFileSync(new URL('../../fuel/app.js', import.meta.url), 'utf8');
  const fill = app.slice(app.indexOf('function fillStates'), app.indexOf('function readList'));
  assert.ok(fill.indexOf("'UT', 'Utah'") < fill.indexOf("'NV', 'Nevada'"));
  assert.ok(fill.indexOf("'NV', 'Nevada'") < fill.indexOf('────────'));
  assert.match(fill, /separator\.disabled = true/);
});

test('store suggestions rank by use, then recency, and can filter by state', () => {
  const rows = [
    { id: 1, station_name: 'Pilot #452', state: 'UT', purchase_date: '2026-01-01' },
    { id: 2, station_name: 'pilot #452', state: 'UT', purchase_date: '2026-06-01' },
    { id: 3, station_name: 'Pilot #452', state: 'UT', purchase_date: '2026-03-01' },
    { id: 4, station_name: 'Maverik', state: 'UT', purchase_date: '2026-11-01' },
    { id: 5, station_name: 'Love’s', state: 'NV', purchase_date: '2026-11-02' },
    { id: 6, station_name: 'Love’s', state: 'NV', purchase_date: '2026-10-01' },
  ];
  const utah = rankStores(rows, { state: 'UT' });
  assert.deepEqual(utah.map((store) => store.name), ['pilot #452', 'Maverik']);
  assert.equal(utah[0].uses, 3);
  assert.equal(utah[0].last_used, '2026-06-01');
  const all = rankStores(rows);
  assert.equal(all.find((store) => store.state === 'NV').name, 'Love’s');
  assert.deepEqual(rankStores(rows, { state: 'CA' }), []);
});

test('driver page lists every jurisdiction the server accepts', () => {
  const app = readFileSync(new URL('../../fuel/app.js', import.meta.url), 'utf8');
  const found = new Set([...app.matchAll(/\['([A-Z]{2})',/g)].map((match) => match[1]));
  for (const [code] of ALL_REGIONS) {
    assert.equal(found.has(code), true, code);
  }
  assert.equal(found.size, ALL_REGIONS.length);
});
