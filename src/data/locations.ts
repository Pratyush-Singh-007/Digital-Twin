import type { LocationPreset } from '../types';

export const LOCATIONS: LocationPreset[] = [
  { name: 'Kanpur',    lat: 26.45, lon: 80.35, state: 'Uttar Pradesh', crop: 'Wheat/Rice' },
  { name: 'Ludhiana',  lat: 30.90, lon: 75.85, state: 'Punjab',        crop: 'Wheat/Rice' },
  { name: 'Pune',      lat: 18.52, lon: 73.86, state: 'Maharashtra',   crop: 'Sugarcane' },
  { name: 'Nagpur',    lat: 21.15, lon: 79.09, state: 'Maharashtra',   crop: 'Cotton/Soybean' },
  { name: 'Hyderabad', lat: 17.39, lon: 78.49, state: 'Telangana',     crop: 'Rice/Cotton' },
  { name: 'Jorhat',    lat: 26.76, lon: 94.22, state: 'Assam',         crop: 'Tea' },
];
