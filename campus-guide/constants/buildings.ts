import buildingsData from './buildings.json';

export type Campus = 'SGW' | 'Loyola';

export interface Building {
  id: string;
  name: string;
  code: string;
  lat: number;
  lng: number;
  campus: Campus;
  address: string;
  department: string;
  overview: string;
  accessibility: string;
  x: number;
  y: number;
}

export const SGW_BUILDINGS: Building[] = buildingsData.sgwBuildings as Building[];
export const LOYOLA_BUILDINGS: Building[] = buildingsData.loyolaBuildings as Building[];
export const All_BUILDINGS: Building[] = [...SGW_BUILDINGS, ...LOYOLA_BUILDINGS];
export const CAMPUS_REGIONS = buildingsData.campusRegions;
