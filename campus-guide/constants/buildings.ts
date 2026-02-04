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
  { id: 'b', name: 'B Annex', code: 'B', lat: 45.497846, lng: -73.579498, campus: 'SGW', address: '2160 Bishop Street', x: 0, y: 0 },
  { id: 'ci', name: 'CI Annex', code: 'CI', lat: 45.497467, lng: -73.579925, campus: 'SGW', address: '2149 Mackay Street', x: 0, y: 0 },
  { id: 'cl', name: 'CL Annex', code: 'CL', lat: 45.494259, lng: -73.579007, campus: 'SGW', address: '1665 Ste-Catherine W', x: 0, y: 0 },
  { id: 'd', name: 'D Annex', code: 'D', lat: 45.497797, lng: -73.579309, campus: 'SGW', address: '2140 Bishop Street', x: 0, y: 0 },
  { id: 'en', name: 'EN Annex', code: 'EN', lat: 45.496914, lng: -73.579555, campus: 'SGW', address: '2070 Mackay Street', x: 0, y: 0 },
  { id: 'er', name: 'ER Building', code: 'ER', lat: 45.496428, lng: -73.57999, campus: 'SGW', address: '2155 Guy Street', x: 0, y: 0 },
  { id: 'es', name: 'ES Building', code: 'ES', lat: 45.496172, lng: -73.579922, campus: 'SGW', address: '2135 Guy Street', x: 0, y: 0 },
  { id: 'et', name: 'ET Building', code: 'ET', lat: 45.496163, lng: -73.579904, campus: 'SGW', address: '2125-2127 Guy Street', x: 0, y: 0 },
  { id: 'ev', name: 'Engineering, Computer Science and Visual Arts Integrated Complex', code: 'EV', lat: 45.495376, lng: -73.577997, campus: 'SGW', address: '1515 Ste-Catherine W', x: 0, y: 0 },
  { id: 'fa', name: 'FA Annex', code: 'FA', lat: 45.496854, lng: -73.579468, campus: 'SGW', address: '2060 Mackay Street', x: 0, y: 0 },
  { id: 'fb', name: 'Faubourg Building', code: 'FB', lat: 45.494666, lng: -73.577603, campus: 'SGW', address: '1250 Guy Street', x: 0, y: 0 },
  { id: 'fg', name: 'Faubourg Ste-Catherine Building', code: 'FG', lat: 45.494381, lng: -73.578125, campus: 'SGW', address: '1610 Ste-Catherine', x: 0, y: 0 },
  { id: 'ga', name: 'Grey Nuns Annex', code: 'GA', lat: 45.494123, lng: -73.57787, campus: 'SGW', address: '1211-1215 St-Mathieu', x: 0, y: 0 },
  { id: 'gm', name: 'Guy-De Maisonneuve Building', code: 'GM', lat: 45.495983, lng: -73.578824, campus: 'SGW', address: '1550 DeMaisonneuve W', x: 0, y: 0 },
  { id: 'gna', name: 'Grey Nuns Building – Wing A', code: 'GNA', lat: 45.493622, lng: -73.577003, campus: 'SGW', address: '1190 Guy Street', x: 0, y: 0 },
  { id: 'gnb', name: 'Grey Nuns Building – Wings B–G, P', code: 'GNB', lat: 45.493622, lng: -73.577003, campus: 'SGW', address: '1190 Guy Street', x: 0, y: 0 },
  { id: 'gnh', name: 'Grey Nuns Building – Wings H–K', code: 'GNH', lat: 45.493622, lng: -73.577003, campus: 'SGW', address: '1190 Guy Street', x: 0, y: 0 },
  { id: 'gnl', name: 'Grey Nuns Building – Wings L–N', code: 'GNL', lat: 45.493622, lng: -73.577003, campus: 'SGW', address: '1190 Guy Street', x: 0, y: 0 },
  { id: 'gs', name: 'Guy-Sherbrooke Building', code: 'GS', lat: 45.496673, lng: -73.581409, campus: 'SGW', address: '1538 Sherbrooke W', x: 0, y: 0 },
  { id: 'h', name: 'Henry F. Hall Building', code: 'H', lat: 45.497092, lng: -73.5788, campus: 'SGW', address: '1455 DeMaisonneuve W', x: 0, y: 0 },
  { id: 'k', name: 'K Annex', code: 'K', lat: 45.497817, lng: -73.579409, campus: 'SGW', address: '2150 Bishop Street', x: 0, y: 0 },
  { id: 'lb', name: 'J.W. McConnell Building', code: 'LB', lat: 45.49705, lng: -73.578009, campus: 'SGW', address: '1400 DeMaisonneuve W', x: 0, y: 0 },
  { id: 'mb', name: 'John Molson Building', code: 'MB', lat: 45.495304, lng: -73.579044, campus: 'SGW', address: '1450 Guy Street', x: 0, y: 0 },
  { id: 'va', name: 'Visual Arts Building', code: 'VA', lat: 45.495543, lng: -73.573795, campus: 'SGW', address: '1395 René-Lévesque W', x: 0, y: 0 },
];


export const LOYOLA_BUILDINGS: Building[] = [
  { id: 'ad', name: 'Administration Building', code: 'AD', lat: 45.457984, lng: -73.639834, campus: 'Loyola', address: '7141, Sherbrooke West', x: 0, y: 0 },
  { id: 'bb', name: 'BB-BH Annex', code: 'BB', lat: 45.459793, lng: -73.639174, campus: 'Loyola', address: '3502 Bermore Avenue', x: 0, y: 0 },
  { id: 'bh', name: 'BB-BH Annex', code: 'BH', lat: 45.459819, lng: -73.639152, campus: 'Loyola', address: '3500 Bermore Avenue', x: 0, y: 0 },
  { id: 'cc', name: 'Central Building', code: 'CC', lat: 45.458204, lng: -73.6403, campus: 'Loyola', address: '7141 Sherbrooke West', x: 0, y: 0 },
  { id: 'cja', name: 'Communication Studies and Journalism Building', code: 'CJA', lat: 45.457478, lng: -73.640354, campus: 'Loyola', address: '7141, Sherbrooke Wes', x: 0, y: 0 },
  { id: 'cjn', name: 'Communication Studies and Journalism Building', code: 'CJN', lat: 45.457478, lng: -73.640354, campus: 'Loyola', address: '7141, Sherbrooke Wes', x: 0, y: 0 },
  { id: 'cjs', name: 'Communication Studies and Journalism Building', code: 'CJS', lat: 45.457478, lng: -73.640354, campus: 'Loyola', address: '7141, Sherbrooke Wes', x: 0, y: 0 },
  { id: 'fc', name: 'F.C. Smith Building', code: 'FC', lat: 45.458493, lng: -73.639287, campus: 'Loyola', address: '7141 Sherbrooke West', x: 0, y: 0 },
  { id: 'ge', name: 'Centre for Structural and Functional Genomics', code: 'GE', lat: 45.457017, lng: -73.640432, campus: 'Loyola', address: '7141 Sherbrooke W', x: 0, y: 0 },
  { id: 'ha', name: 'Hingston Hall, wing HA', code: 'HA', lat: 45.459356, lng: -73.64127, campus: 'Loyola', address: '7141 Sherbrooke West', x: 0, y: 0 },
  { id: 'hb', name: 'Hingston Hall, wing HB', code: 'HB', lat: 45.459308, lng: -73.641849, campus: 'Loyola', address: '7141 Sherbrooke West', x: 0, y: 0 },
  { id: 'hc', name: 'Hingston Hall, wing HC', code: 'HC', lat: 45.459663, lng: -73.64208, campus: 'Loyola', address: '7141 Sherbrooke West', x: 0, y: 0 },
  { id: 'hu', name: 'Applied Science Hub', code: 'HU', lat: 45.458513, lng: -73.641921, campus: 'Loyola', address: '7141, Sherbrooke W', x: 0, y: 0 },
  { id: 'jr', name: 'Jesuit Residence', code: 'JR', lat: 45.458432, lng: -73.643235, campus: 'Loyola', address: '7141 Sherbrooke West', x: 0, y: 0 },
  { id: 'pb', name: 'PB Building', code: 'PB', lat: 45.456534, lng: -73.638106, campus: 'Loyola', address: '7200 Sherbrooke W', x: 0, y: 0 },
  { id: 'pc', name: 'PERFORM centre', code: 'PC', lat: 45.457088, lng: -73.637683, campus: 'Loyola', address: '7200 Sherbrooke W', x: 0, y: 0 },
  { id: 'ps', name: 'Physical Services Building', code: 'PS', lat: 45.459636, lng: -73.639758, campus: 'Loyola', address: '7141 Sherbrooke W', x: 0, y: 0 },
  { id: 'pt', name: 'Oscar Peterson Concert Hall', code: 'PT', lat: 45.459308, lng: -73.638941, campus: 'Loyola', address: '7141 Sherbrooke W', x: 0, y: 0 },
  { id: 'py', name: 'Psychology Building', code: 'PY', lat: 45.458938, lng: -73.640467, campus: 'Loyola', address: '7141 Sherbrooke W', x: 0, y: 0 },
  { id: 'ra', name: 'Recreation and Athletics Complex', code: 'RA', lat: 45.456774, lng: -73.63761, campus: 'Loyola', address: '7200 Sherbrooke W', x: 0, y: 0 },
  { id: 'rf', name: 'Loyola Jesuit Hall and Conference Centre', code: 'RF', lat: 45.458489, lng: -73.641028, campus: 'Loyola', address: '7141 Sherbrooke W', x: 0, y: 0 },
  { id: 'sc', name: 'Student Centre', code: 'SC', lat: 45.459131, lng: -73.639251, campus: 'Loyola', address: '7141 Sherbrooke W', x: 0, y: 0 },
  { id: 'sh', name: 'Solar House', code: 'SH', lat: 45.459298, lng: -73.642478, campus: 'Loyola', address: '7141 Sherbrooke W', x: 0, y: 0 },
  { id: 'sp', name: 'Richard J. Renaud Science Complex', code: 'SP', lat: 45.457881, lng: -73.641565, campus: 'Loyola', address: '7141 Sherbrooke W', x: 0, y: 0 },
  { id: 'ta', name: 'Terrebonne Building', code: 'TA', lat: 45.459992, lng: -73.640897, campus: 'Loyola', address: '7079 Terrebonne', x: 0, y: 0 },
  { id: 'tb', name: 'TB Annex', code: 'TB', lat: 45.460051, lng: -73.640842, campus: 'Loyola', address: '7075 Terrebonne', x: 0, y: 0 },
  { id: 've', name: 'Vanier Extension', code: 'VE', lat: 45.459026, lng: -73.638606, campus: 'Loyola', address: '7141 Sherbrooke W', x: 0, y: 0 },
  { id: 'vl', name: 'Vanier Library Building', code: 'VL', lat: 45.459026, lng: -73.638606, campus: 'Loyola', address: '7141 Sherbrooke W', x: 0, y: 0 },
];


export const All_BUILDINGS: Building[] = [...SGW_BUILDINGS, ...LOYOLA_BUILDINGS];

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
