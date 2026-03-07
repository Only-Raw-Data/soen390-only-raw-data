export type TransportationMode = 'walk' | 'car' | 'transit' | 'shuttle';

export type SegmentMode = 'WALK' | 'BUS' | 'SUBWAY' | 'TRAM' | 'RAIL';

export interface TransitSegment {
  mode: SegmentMode;
  coordinates: { latitude: number; longitude: number }[];
  lineName?: string;
}

export default {};
