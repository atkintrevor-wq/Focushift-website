/** US states + DC and Canadian provinces/territories. Keep codes in sync with fuel/app.js. */
export const US_STATES = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'],
  ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'],
  ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'],
  ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'],
  ['ME', 'Maine'], ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'],
  ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'],
  ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'],
  ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'],
  ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'], ['SD', 'South Dakota'],
  ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'],
  ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
];

export const CA_PROVINCES = [
  ['AB', 'Alberta'], ['BC', 'British Columbia'], ['MB', 'Manitoba'], ['NB', 'New Brunswick'],
  ['NL', 'Newfoundland and Labrador'], ['NS', 'Nova Scotia'], ['NT', 'Northwest Territories'],
  ['NU', 'Nunavut'], ['ON', 'Ontario'], ['PE', 'Prince Edward Island'], ['QC', 'Quebec'],
  ['SK', 'Saskatchewan'], ['YT', 'Yukon'],
];

export const ALL_REGIONS = [...US_STATES, ...CA_PROVINCES];

const CODE_SET = new Set(ALL_REGIONS.map(([code]) => code));
const NAME_TO_CODE = Object.fromEntries(ALL_REGIONS.map(([code, name]) => [name.toLowerCase(), code]));

export function isState(code) {
  return CODE_SET.has(String(code || '').toUpperCase());
}

/** Utah and Nevada first, then every other state and province A–Z. Keep fuel/app.js in sync. */
export function driverFormRegions() {
  const preferred = [
    ['UT', 'Utah'],
    ['NV', 'Nevada'],
  ];
  const rest = ALL_REGIONS
    .filter(([code]) => code !== 'UT' && code !== 'NV')
    .sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0]));
  return { preferred, rest };
}

export function stateFromParts({ countryCode, regionCode, regionName }) {
  const country = String(countryCode || '').toUpperCase();
  if (country && country !== 'US' && country !== 'CA') return '';

  let code = String(regionCode || '').toUpperCase().trim();
  if (code.includes('-')) code = code.split('-').pop();
  if (code && CODE_SET.has(code)) return code;

  const byName = NAME_TO_CODE[String(regionName || '').trim().toLowerCase()];
  return byName || '';
}
