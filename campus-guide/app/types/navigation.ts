import { GraphNode } from "@app/services/indoorGraphService";
import { RouteData } from "@app/services/directionsService";
import { TransportationMode } from "@app/types/transportation";

export interface IndoorStep {
  kind: "indoor";
  buildingCode: string;
  buildingName: string;
  path: GraphNode[];
  startLabel: string;
  endLabel: string;
}

export interface OutdoorStep {
  kind: "outdoor";
  route: RouteData;
  startLabel: string;
  endLabel: string;
  transportMode?: TransportationMode;
}

export type NavigationStep = IndoorStep | OutdoorStep;
