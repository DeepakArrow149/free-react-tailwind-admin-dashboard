/**
 * ISO-3166 Alpha-2 country code → [latitude, longitude] centroid.
 *
 * Hand-curated table covering the ~170 countries our ERP customers ship to.
 * Each centroid is the country's geographic center (NOT the capital — for
 * smaller countries the capital is close enough). Coordinates are decimal
 * degrees, WGS-84.
 *
 * Used by GeographicMapWidget to plot country bubbles. The 8 KB file is
 * tree-shakeable by JS bundlers — only loaded when the geo viz is rendered.
 */

export type CountryCentroid = readonly [latitude: number, longitude: number];

export const COUNTRY_CENTROIDS: Record<string, CountryCentroid> = {
  // Apparel-buyer markets (most-used in this ERP)
  US: [39.8, -98.6],   // United States
  CA: [60.1, -113.6],  // Canada
  MX: [23.6, -102.5],  // Mexico
  GB: [55.3, -3.4],    // United Kingdom
  IE: [53.4, -8.2],    // Ireland
  DE: [51.2, 10.5],    // Germany
  FR: [46.2, 2.2],     // France
  ES: [40.5, -3.7],    // Spain
  IT: [41.9, 12.6],    // Italy
  PT: [39.4, -8.2],    // Portugal
  NL: [52.1, 5.3],     // Netherlands
  BE: [50.5, 4.5],     // Belgium
  CH: [46.8, 8.2],     // Switzerland
  AT: [47.5, 14.6],    // Austria
  DK: [56.3, 9.5],     // Denmark
  SE: [60.1, 18.6],    // Sweden
  NO: [60.5, 8.5],     // Norway
  FI: [61.9, 25.7],    // Finland
  PL: [51.9, 19.1],    // Poland
  CZ: [49.8, 15.5],    // Czech Republic
  HU: [47.2, 19.5],    // Hungary
  RO: [45.9, 24.9],    // Romania
  BG: [42.7, 25.5],    // Bulgaria
  GR: [39.1, 21.8],    // Greece
  TR: [38.9, 35.2],    // Turkey
  RU: [61.5, 105.3],   // Russia
  UA: [48.4, 31.2],    // Ukraine

  // Asia-Pacific (where most production sits)
  IN: [20.6, 78.9],    // India
  PK: [30.4, 69.3],    // Pakistan
  BD: [23.7, 90.4],    // Bangladesh
  LK: [7.9, 80.8],     // Sri Lanka
  NP: [28.4, 84.1],    // Nepal
  CN: [35.9, 104.2],   // China
  HK: [22.4, 114.1],   // Hong Kong
  TW: [23.7, 121.0],   // Taiwan
  JP: [36.2, 138.3],   // Japan
  KR: [35.9, 127.8],   // South Korea
  KP: [40.3, 127.5],   // North Korea
  MN: [46.9, 103.8],   // Mongolia
  VN: [14.1, 108.3],   // Vietnam
  TH: [15.9, 100.99],  // Thailand
  KH: [12.6, 104.99],  // Cambodia
  LA: [19.9, 102.5],   // Laos
  MM: [21.9, 95.96],   // Myanmar
  MY: [4.2, 101.99],   // Malaysia
  SG: [1.4, 103.8],    // Singapore
  ID: [-0.8, 113.9],   // Indonesia
  PH: [12.9, 121.8],   // Philippines
  AU: [-25.3, 133.8],  // Australia
  NZ: [-40.9, 174.9],  // New Zealand
  AF: [33.9, 67.7],    // Afghanistan
  KZ: [48.0, 66.9],    // Kazakhstan
  UZ: [41.4, 64.6],    // Uzbekistan

  // Middle East
  AE: [24.0, 54.0],    // UAE
  SA: [23.9, 45.1],    // Saudi Arabia
  QA: [25.4, 51.2],    // Qatar
  KW: [29.3, 47.5],    // Kuwait
  BH: [26.0, 50.6],    // Bahrain
  OM: [21.5, 55.9],    // Oman
  YE: [15.6, 48.5],    // Yemen
  IQ: [33.2, 43.7],    // Iraq
  IR: [32.4, 53.7],    // Iran
  JO: [30.6, 36.2],    // Jordan
  LB: [33.9, 35.9],    // Lebanon
  SY: [34.8, 38.99],   // Syria
  IL: [31.0, 34.9],    // Israel
  PS: [31.9, 35.2],    // Palestine

  // Africa
  EG: [26.8, 30.8],    // Egypt
  MA: [31.8, -7.1],    // Morocco
  DZ: [28.0, 1.7],     // Algeria
  TN: [33.9, 9.6],     // Tunisia
  LY: [26.3, 17.2],    // Libya
  SD: [12.9, 30.2],    // Sudan
  ET: [9.1, 40.5],     // Ethiopia
  KE: [-0.0, 37.9],    // Kenya
  TZ: [-6.4, 34.9],    // Tanzania
  UG: [1.4, 32.3],     // Uganda
  RW: [-1.9, 29.9],    // Rwanda
  NG: [9.1, 8.7],      // Nigeria
  GH: [7.9, -1.0],     // Ghana
  CI: [7.5, -5.5],     // Ivory Coast
  SN: [14.5, -14.4],   // Senegal
  ML: [17.6, -4.0],    // Mali
  ZA: [-30.6, 22.9],   // South Africa
  BW: [-22.3, 24.7],   // Botswana
  ZW: [-19.0, 29.2],   // Zimbabwe
  ZM: [-13.1, 27.8],   // Zambia
  MW: [-13.3, 34.3],   // Malawi
  MZ: [-18.7, 35.5],   // Mozambique
  AO: [-11.2, 17.9],   // Angola
  CD: [-4.0, 21.8],    // DR Congo
  CG: [-0.2, 15.8],    // Congo
  CM: [7.4, 12.4],     // Cameroon
  MG: [-18.8, 47.0],   // Madagascar

  // Latin America & Caribbean
  BR: [-14.2, -51.9],  // Brazil
  AR: [-38.4, -63.6],  // Argentina
  CL: [-35.7, -71.5],  // Chile
  PE: [-9.2, -75.0],   // Peru
  CO: [4.6, -74.3],    // Colombia
  VE: [6.4, -66.6],    // Venezuela
  EC: [-1.8, -78.2],   // Ecuador
  BO: [-16.3, -63.6],  // Bolivia
  PY: [-23.4, -58.4],  // Paraguay
  UY: [-32.5, -55.8],  // Uruguay
  CR: [9.7, -83.8],    // Costa Rica
  PA: [8.5, -80.8],    // Panama
  GT: [15.8, -90.2],   // Guatemala
  HN: [15.2, -86.2],   // Honduras
  SV: [13.8, -88.9],   // El Salvador
  NI: [12.9, -85.2],   // Nicaragua
  CU: [21.5, -77.8],   // Cuba
  DO: [18.7, -70.2],   // Dominican Republic
  HT: [18.9, -72.3],   // Haiti
  JM: [18.1, -77.3],   // Jamaica
};

/**
 * Convert ISO-3166 alpha-2 to country name. For values that AREN'T 2-letter
 * codes, returns the input unchanged (so non-coded data still renders).
 */
const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', CA: 'Canada', MX: 'Mexico',
  GB: 'United Kingdom', IE: 'Ireland', DE: 'Germany', FR: 'France',
  ES: 'Spain', IT: 'Italy', PT: 'Portugal', NL: 'Netherlands',
  BE: 'Belgium', CH: 'Switzerland', AT: 'Austria',
  DK: 'Denmark', SE: 'Sweden', NO: 'Norway', FI: 'Finland',
  PL: 'Poland', CZ: 'Czechia', HU: 'Hungary', RO: 'Romania',
  BG: 'Bulgaria', GR: 'Greece', TR: 'Türkiye', RU: 'Russia', UA: 'Ukraine',
  IN: 'India', PK: 'Pakistan', BD: 'Bangladesh', LK: 'Sri Lanka', NP: 'Nepal',
  CN: 'China', HK: 'Hong Kong', TW: 'Taiwan', JP: 'Japan', KR: 'South Korea',
  KP: 'North Korea', MN: 'Mongolia',
  VN: 'Vietnam', TH: 'Thailand', KH: 'Cambodia', LA: 'Laos', MM: 'Myanmar',
  MY: 'Malaysia', SG: 'Singapore', ID: 'Indonesia', PH: 'Philippines',
  AU: 'Australia', NZ: 'New Zealand',
  AE: 'UAE', SA: 'Saudi Arabia', QA: 'Qatar', KW: 'Kuwait', BH: 'Bahrain',
  OM: 'Oman', YE: 'Yemen', IQ: 'Iraq', IR: 'Iran',
  JO: 'Jordan', LB: 'Lebanon', SY: 'Syria', IL: 'Israel', PS: 'Palestine',
  EG: 'Egypt', MA: 'Morocco', DZ: 'Algeria', TN: 'Tunisia',
  LY: 'Libya', SD: 'Sudan', ET: 'Ethiopia', KE: 'Kenya',
  TZ: 'Tanzania', UG: 'Uganda', RW: 'Rwanda', NG: 'Nigeria',
  GH: 'Ghana', CI: 'Ivory Coast', SN: 'Senegal', ML: 'Mali',
  ZA: 'South Africa', BW: 'Botswana', ZW: 'Zimbabwe', ZM: 'Zambia',
  MW: 'Malawi', MZ: 'Mozambique', AO: 'Angola', CD: 'DR Congo',
  CG: 'Congo', CM: 'Cameroon', MG: 'Madagascar',
  BR: 'Brazil', AR: 'Argentina', CL: 'Chile', PE: 'Peru', CO: 'Colombia',
  VE: 'Venezuela', EC: 'Ecuador', BO: 'Bolivia', PY: 'Paraguay', UY: 'Uruguay',
  CR: 'Costa Rica', PA: 'Panama', GT: 'Guatemala', HN: 'Honduras',
  SV: 'El Salvador', NI: 'Nicaragua', CU: 'Cuba',
  DO: 'Dominican Republic', HT: 'Haiti', JM: 'Jamaica',
};

export function lookupCentroid(code: string): CountryCentroid | undefined {
  // Try exact uppercase match
  return COUNTRY_CENTROIDS[code.toUpperCase()];
}

export function lookupCountryName(code: string): string {
  return COUNTRY_NAMES[code.toUpperCase()] ?? code;
}
