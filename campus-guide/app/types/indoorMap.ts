import { Campus } from "@/constants/buildings";

export interface IndoorFeatureProperties {
  level?: string;
  ref?: string;
  indoor?: string;
  amenity?: string;
  highway?: string;
  name?: string;
  door?: string;
  entrance?: string;
  conveying?: string;
}

export interface IndoorFeature {
  type: "Feature";
  properties: IndoorFeatureProperties | null;
  geometry: {
    type: "Polygon" | "LineString" | "Point";
    coordinates: number[][] | number[][][] | number[];
  };
}

export interface IndoorGeoJSON {
  type: "FeatureCollection";
  features: IndoorFeature[];
}

export interface IndoorBuildingConfig {
  code: string;
  name: string;
  campus: Campus;
  floors: number[];
  dataFile: string;
  centerLat: number;
  centerLng: number;
}
