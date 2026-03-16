import { GraphNode } from "../services/indoorGraphService";
import { RouteData } from "../services/directionsService";

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
}

export type NavigationStep = IndoorStep | OutdoorStep;
