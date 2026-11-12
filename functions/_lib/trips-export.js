import { reconcileLoads, summarizeTrips } from './trips-logic.js';
import { buildWorkbook } from './xlsx.js';

function yesNo(value) {
  return value ? 'Yes' : 'No';
}

function paidLabel(status) {
  if (status === 'paid') return 'Paid';
  if (status === 'disputed') return 'Disputed';
  return 'Unpaid';
}

function csvCell(value) {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function exportFilename(filters, ext, now = new Date()) {
  if (filters.month) return `trips-${filters.month}.${ext}`;
  if (filters.from || filters.to) return `trips-${filters.from || 'start'}-to-${filters.to || 'end'}.${ext}`;
  return `trips-log-${now.toISOString().slice(0, 10)}.${ext}`;
}

function tripRows(trips) {
  return [...trips].sort((a, b) => {
    if (a.trip_date !== b.trip_date) return a.trip_date < b.trip_date ? -1 : 1;
    return a.id - b.id;
  });
}

const TRIP_CSV = [
  'ID',
  'Date',
  'Week start',
  'Week end',
  'Load number',
  'Pay month',
  'Run type',
  'Also went to Sunrise',
  'Notes',
  'Pay amount',
  'Expected gross',
  'Expected load/unload',
  'Expected miles',
  'Paid status',
  'Logged at (UTC)',
];

export function tripsCsv(trips) {
  const lines = [TRIP_CSV.join(',')];
  for (const trip of tripRows(trips)) {
    lines.push(
      [
        trip.id,
        trip.trip_date,
        trip.week_start,
        trip.week_end,
        trip.load_number,
        trip.pay_month,
        trip.run_type,
        yesNo(trip.also_sunrise),
        trip.notes || '',
        trip.pay_amount == null ? '' : trip.pay_amount,
        trip.expected_gross ?? '',
        trip.expected_load_unload ?? '',
        trip.expected_miles ?? '',
        paidLabel(trip.paid_status),
        trip.created_at || '',
      ]
        .map(csvCell)
        .join(',')
    );
  }
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export function tripsWorkbook(trips, paystubs = [], settings) {
  const rows = tripRows(trips);
  const summary = summarizeTrips(rows, settings);
  const lines = [];
  for (const stub of paystubs) {
    for (const line of stub.lines || []) {
      lines.push({
        pay_month: stub.pay_month,
        status: paidLabel(stub.status),
        line_date: line.line_date,
        load_number: line.load_number,
        mileage: line.mileage == null ? '' : line.mileage,
        gross: line.gross == null ? '' : line.gross,
        load_unload: line.load_unload || 0,
        vacation_days: stub.vacation_days,
        vacation_pay: stub.vacation_pay,
        net_pay: stub.net_pay == null ? '' : stub.net_pay,
      });
    }
  }
  const reconcile = reconcileLoads(rows, paystubs.flatMap((stub) => stub.lines || []), settings).map((row) => ({
    load_number: row.load_number,
    week_start: row.week_start,
    week_end: row.week_end,
    pay_month: row.pay_month,
    stub_date: row.stub_date,
    flag: row.flag,
    expected_gross: row.expected.gross,
    expected_load_unload: row.expected.load_unload,
    expected_miles: row.expected.miles,
    paid_gross: row.paid ? row.paid.gross : '',
    paid_load_unload: row.paid ? row.paid.load_unload : '',
    paid_miles: row.paid && row.paid.miles != null ? row.paid.miles : '',
  }));

  return buildWorkbook([
    {
      name: 'Trips',
      columns: [
        { header: 'ID', key: 'id', width: 8 },
        { header: 'Date', key: 'trip_date', width: 14 },
        { header: 'Week start', key: 'week_start', width: 14 },
        { header: 'Week end', key: 'week_end', width: 14 },
        { header: 'Load number', key: 'load_number', width: 14 },
        { header: 'Pay month', key: 'pay_month', width: 14 },
        { header: 'Run type', key: 'run_type', width: 14 },
        { header: 'Also went to Sunrise', key: 'also_sunrise', width: 22 },
        { header: 'Notes', key: 'notes', width: 28 },
        { header: 'Pay amount', key: 'pay_amount', width: 14, style: 3 },
        { header: 'Expected gross', key: 'expected_gross', width: 16, style: 3 },
        { header: 'Expected load/unload', key: 'expected_load_unload', width: 20, style: 3 },
        { header: 'Expected miles', key: 'expected_miles', width: 16 },
        { header: 'Paid status', key: 'paid_status', width: 14 },
        { header: 'Logged at (UTC)', key: 'created_at', width: 22 },
      ],
      rows: rows.map((trip) => ({
        ...trip,
        also_sunrise: yesNo(trip.also_sunrise),
        notes: trip.notes || '',
        pay_amount: trip.pay_amount == null ? '' : trip.pay_amount,
        paid_status: paidLabel(trip.paid_status),
      })),
    },
    {
      name: 'By Week',
      columns: [
        { header: 'Week start', key: 'week_start', width: 14 },
        { header: 'Week end', key: 'week_end', width: 14 },
        { header: 'Load number', key: 'load_number', width: 14 },
        { header: 'Pay month', key: 'pay_month', width: 14 },
        { header: 'Stub date', key: 'stub_date', width: 14 },
        { header: 'Sunrise', key: 'sunrise', width: 12 },
        { header: 'MTV/SH', key: 'mtv', width: 12 },
        { header: 'Trips', key: 'trips', width: 10 },
        { header: 'Expected gross', key: 'gross', width: 16, style: 3 },
        { header: 'Load/unload', key: 'load_unload', width: 14, style: 3 },
        { header: 'Expected total', key: 'total', width: 16, style: 3 },
        { header: 'Expected miles', key: 'miles', width: 16 },
      ],
      rows: summary.byWeek,
    },
    {
      name: 'By Pay Month',
      columns: [
        { header: 'Pay month', key: 'pay_month', width: 14 },
        { header: 'Sunrise', key: 'sunrise', width: 12 },
        { header: 'MTV/SH', key: 'mtv', width: 12 },
        { header: 'Trips', key: 'trips', width: 10 },
        { header: 'Expected gross', key: 'gross', width: 16, style: 3 },
        { header: 'Load/unload', key: 'load_unload', width: 14, style: 3 },
        { header: 'Expected total', key: 'total', width: 16, style: 3 },
        { header: 'Expected miles', key: 'miles', width: 16 },
        { header: 'Paid', key: 'paid', width: 10 },
        { header: 'Unpaid', key: 'unpaid', width: 12 },
        { header: 'Disputed', key: 'disputed', width: 12 },
      ],
      rows: summary.byMonth,
    },
    {
      name: 'Paystub',
      columns: [
        { header: 'Pay month', key: 'pay_month', width: 14 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Line date', key: 'line_date', width: 14 },
        { header: 'Load number', key: 'load_number', width: 14 },
        { header: 'Mileage', key: 'mileage', width: 12 },
        { header: 'Gross', key: 'gross', width: 12, style: 3 },
        { header: 'Load/unload', key: 'load_unload', width: 14, style: 3 },
        { header: 'Vacation days', key: 'vacation_days', width: 14 },
        { header: 'Vacation pay', key: 'vacation_pay', width: 14, style: 3 },
        { header: 'Net pay', key: 'net_pay', width: 12, style: 3 },
      ],
      rows: lines,
    },
    {
      name: 'Reconcile',
      columns: [
        { header: 'Load number', key: 'load_number', width: 14 },
        { header: 'Week start', key: 'week_start', width: 14 },
        { header: 'Week end', key: 'week_end', width: 14 },
        { header: 'Pay month', key: 'pay_month', width: 14 },
        { header: 'Stub date', key: 'stub_date', width: 14 },
        { header: 'Flag', key: 'flag', width: 12 },
        { header: 'Expected gross', key: 'expected_gross', width: 16, style: 3 },
        { header: 'Expected load/unload', key: 'expected_load_unload', width: 20, style: 3 },
        { header: 'Expected miles', key: 'expected_miles', width: 16 },
        { header: 'Paid gross', key: 'paid_gross', width: 14, style: 3 },
        { header: 'Paid load/unload', key: 'paid_load_unload', width: 18, style: 3 },
        { header: 'Paid miles', key: 'paid_miles', width: 12 },
      ],
      rows: reconcile,
    },
  ]);
}
