export type Campus = 'SGW' | 'Loyola';

export interface Building {
    id: string;
    name: string;
    code: string;
    lat: number;
    lng: number;
    campus: Campus;
    address: string;
    x: number; 
    y: number;
}

export const SGW_BUILDINGS: Building[] = [
    { id: 'h', name: 'Henry F. Hall Building', code: 'H', lat: 45.4972, lng: -73.5789, campus: 'SGW', address: '1455 De Maisonneuve Blvd W', x: 50, y: 45 },
    { id: 'mb', name: 'John Molson Building', code: 'MB', lat: 45.4952, lng: -73.5790, campus: 'SGW', address: '1450 Guy St', x: 45, y: 65 },
    { id: 'ev', name: 'Engineering Building', code: 'EV', lat: 45.4953, lng: -73.5779, campus: 'SGW', address: '1515 Ste-Catherine St W', x: 65, y: 60 },
    { id: 'lb', name: 'J.W. McConnell Building', code: 'LB', lat: 45.4967, lng: -73.5778, campus: 'SGW', address: '1400 De Maisonneuve Blvd W', x: 70, y: 48 },
    { id: 'va', name: 'Visual Arts Building', code: 'VA', lat: 45.4948, lng: -73.5777, campus: 'SGW', address: '1395 René-Lévesque Blvd W', x: 55, y: 70 },
    { id: 'gm', name: 'Guy-De Maisonneuve Building', code: 'GM', lat: 45.4967, lng: -73.5778, campus: 'SGW', address: '1550 De Maisonneuve Blvd W', x: 35, y: 50 },
];

export const LOYOLA_BUILDINGS: Building[] = [
    { id: 'cc', name: 'Central Building', code: 'CC', lat: 45.4581, lng: -73.6402, campus: 'Loyola', address: '7141 Sherbrooke St W', x: 50, y: 50 },
    { id: 'sp', name: 'Richard J. Renaud Science Complex', code: 'SP', lat: 45.4576, lng: -73.6408, campus: 'Loyola', address: '7141 Sherbrooke St W', x: 40, y: 60 },
    { id: 'ad', name: 'Administration Building', code: 'AD', lat: 45.4585, lng: -73.6398, campus: 'Loyola', address: '7141 Sherbrooke St W', x: 60, y: 40 },
    { id: 'fc', name: 'F.C. Smith Building', code: 'FC', lat: 45.4578, lng: -73.6415, campus: 'Loyola', address: '7141 Sherbrooke St W', x: 35, y: 65 },
    { id: 'pc', name: 'Perform Centre', code: 'PC', lat: 45.4583, lng: -73.6410, campus: 'Loyola', address: '7200 Sherbrooke St W', x: 55, y: 45 },
];

export  const  All_BUILDINGS: Building[] = [...SGW_BUILDINGS, ...LOYOLA_BUILDINGS];

 export const CAMPUS_REGIONS = {
    SGW: {
      latitude: 45.4963,
      longitude: -73.5783,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    },
    Loyola: {
      latitude: 45.4581,
      longitude: -73.6402,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    },
  };
