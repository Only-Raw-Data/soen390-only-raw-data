import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  ReactNode,
} from "react";
import {
  IndoorBuildingConfig,
  IndoorFeature,
  IndoorGeoJSON,
} from "../types/indoorMap";
import { buildIndoorGraph, GraphNode, IndoorGraph } from "../services/indoorGraphService";
import { findIndoorPath } from "../services/indoorPathService";

import hallData from "@/constants/indoorData/hall.json";
import jmsbData from "@/constants/indoorData/jmsb.json";
import vlveData from "@/constants/indoorData/VLandVEfloors.json";
import ccData from "@/constants/indoorData/cc.json";
import cjData from "@/constants/indoorData/cj.json";
import clData from "@/constants/indoorData/cl.json";
import evData from "@/constants/indoorData/ev.json";
import fbData from "@/constants/indoorData/fb.json";
import hbData from "@/constants/indoorData/hb.json";
import hcData from "@/constants/indoorData/hc.json";
import rfData from "@/constants/indoorData/rf.json";
import siData from "@/constants/indoorData/si.json";
import spData from "@/constants/indoorData/sp.json";

export const INDOOR_BUILDINGS: IndoorBuildingConfig[] = [
  {
    code: "H",
    name: "Henry F. Hall Building",
    campus: "SGW",
    floors: [1, 2, 3, 8, 9],
    dataFile: "hall",
    centerLat: 45.497092,
    centerLng: -73.5788,
  },
  {
    code: "MB",
    name: "John Molson Building",
    campus: "SGW",
    floors: [-2, 1],
    dataFile: "jmsb",
    centerLat: 45.495304,
    centerLng: -73.579044,
  },
  {
    code: "EV",
    name: "Engineering & Visual Arts",
    campus: "SGW",
    floors: [1],
    dataFile: "ev",
    centerLat: 45.495376,
    centerLng: -73.577997,
  },
  {
    code: "CL",
    name: "CL Annex",
    campus: "SGW",
    floors: [1],
    dataFile: "cl",
    centerLat: 45.494259,
    centerLng: -73.579007,
  },
  {
    code: "FB",
    name: "Faubourg Building",
    campus: "SGW",
    floors: [1],
    dataFile: "fb",
    centerLat: 45.494666,
    centerLng: -73.577603,
  },
  {
    code: "VL",
    name: "Vanier Library",
    campus: "Loyola",
    floors: [1, 2],
    dataFile: "vlve",
    centerLat: 45.459026,
    centerLng: -73.638606,
  },
  {
    code: "VE",
    name: "Vanier Extension",
    campus: "Loyola",
    floors: [1, 2],
    dataFile: "vlve",
    centerLat: 45.459026,
    centerLng: -73.638606,
  },
  {
    code: "CC",
    name: "Central Building",
    campus: "Loyola",
    floors: [1],
    dataFile: "cc",
    centerLat: 45.458204,
    centerLng: -73.6403,
  },
  {
    code: "CJ",
    name: "Communication Studies & Journalism",
    campus: "Loyola",
    floors: [1],
    dataFile: "cj",
    centerLat: 45.4572,
    centerLng: -73.6403,
  },
  {
    code: "HB",
    name: "Hingston Hall B",
    campus: "Loyola",
    floors: [1],
    dataFile: "hb",
    centerLat: 45.459308,
    centerLng: -73.641849,
  },
  {
    code: "HC",
    name: "Hingston Hall C",
    campus: "Loyola",
    floors: [1],
    dataFile: "hc",
    centerLat: 45.459663,
    centerLng: -73.64208,
  },
  {
    code: "RF",
    name: "Loyola Jesuit Hall & Conference Centre",
    campus: "Loyola",
    floors: [1],
    dataFile: "rf",
    centerLat: 45.458489,
    centerLng: -73.641028,
  },
  {
    code: "SI",
    name: "Saint Ignatius of Loyola",
    campus: "Loyola",
    floors: [1],
    dataFile: "si",
    centerLat: 45.4581,
    centerLng: -73.6421,
  },
  {
    code: "SP",
    name: "Richard J. Renaud Science Complex",
    campus: "Loyola",
    floors: [1],
    dataFile: "sp",
    centerLat: 45.457881,
    centerLng: -73.641565,
  },
];

const geoJsonMap: Record<string, IndoorGeoJSON> = {
  hall: hallData as unknown as IndoorGeoJSON,
  jmsb: jmsbData as unknown as IndoorGeoJSON,
  vlve: vlveData as unknown as IndoorGeoJSON,
  cc: ccData as unknown as IndoorGeoJSON,
  cj: cjData as unknown as IndoorGeoJSON,
  cl: clData as unknown as IndoorGeoJSON,
  ev: evData as unknown as IndoorGeoJSON,
  fb: fbData as unknown as IndoorGeoJSON,
  hb: hbData as unknown as IndoorGeoJSON,
  hc: hcData as unknown as IndoorGeoJSON,
  rf: rfData as unknown as IndoorGeoJSON,
  si: siData as unknown as IndoorGeoJSON,
  sp: spData as unknown as IndoorGeoJSON,
};

export function getGeoJsonForBuilding(
  config: IndoorBuildingConfig,
): IndoorGeoJSON | null {
  return geoJsonMap[config.dataFile] ?? null;
}

export function getFeaturesForFloor(
  geoJson: IndoorGeoJSON,
  floor: number,
): IndoorFeature[] {
  const floorStr = floor.toString();
  return geoJson.features.filter((f) => {
    if (!f.properties?.level) return false;
    const levels = f.properties.level.split(";");
    return levels.includes(floorStr);
  });
}

function matchesBuildingCode(ref: string, buildingCode: string): boolean {
  const refUpper = ref.toUpperCase();
  if (refUpper.startsWith(buildingCode)) return true;
  return buildingCode === "MB" && refUpper.startsWith("MBS");
}

function parseFloor(level: string): number | null {
  const floor = Number.parseInt(level.split(";")[0], 10);
  return Number.isNaN(floor) ? null : floor;
}

function matchesFeature(
  feature: IndoorFeature,
  normalized: string,
  buildingCode: string,
): { floor: number; ref: string } | null {
  if (!feature.properties?.ref) return null;

  const featureRef = feature.properties.ref
    .replaceAll(/[\s-]/g, "")
    .toUpperCase();
  if (featureRef !== normalized) return null;
  if (!matchesBuildingCode(feature.properties.ref, buildingCode)) return null;
  if (!feature.properties.level) return null;

  const floor = parseFloor(feature.properties.level);
  if (floor === null) return null;

  return { floor, ref: feature.properties.ref };
}

function findRoomInBuildings(
  normalized: string,
): { building: IndoorBuildingConfig; floor: number; ref: string } | null {
  for (const building of INDOOR_BUILDINGS) {
    const geoJson = getGeoJsonForBuilding(building);
    if (!geoJson) continue;

    for (const feature of geoJson.features) {
      const match = matchesFeature(feature, normalized, building.code);
      if (match) {
        return { building, ...match };
      }
    }
  }
  return null;
}

interface IndoorMapContextType {
  selectedBuilding: IndoorBuildingConfig | null;
  selectedFloor: number | null;
  searchQuery: string;
  highlightedRoomRef: string | null;
  searchError: string | null;
  startRoomRef: string | null;
  destinationRoomRef: string | null;
  startSearchQuery: string;
  destinationSearchQuery: string;
  startSearchError: string | null;
  destinationSearchError: string | null;
  currentPath: GraphNode[] | null;
  pathError: string | null;
  accessible: boolean;
  setSelectedBuilding: (building: IndoorBuildingConfig | null) => void;
  setSelectedFloor: (floor: number | null) => void;
  setSearchQuery: (query: string) => void;
  searchRoom: (query: string) => void;
  clearHighlight: () => void;
  setStartSearchQuery: (query: string) => void;
  setDestinationSearchQuery: (query: string) => void;
  searchStartRoom: (query: string) => void;
  searchDestinationRoom: (query: string) => void;
  clearStartRoom: () => void;
  clearDestinationRoom: () => void;
  clearPath: () => void;
  toggleAccessible: () => void;
}

const IndoorMapContext = createContext<IndoorMapContextType | undefined>(
  undefined,
);

export default function IndoorMapProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const [selectedBuilding, setSelectedBuilding] =
    useState<IndoorBuildingConfig | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedRoomRef, setHighlightedRoomRef] = useState<string | null>(
    null,
  );
  const [searchError, setSearchError] = useState<string | null>(null);
  const [startRoomRef, setStartRoomRef] = useState<string | null>(null);
  const [destinationRoomRef, setDestinationRoomRef] = useState<string | null>(null);
  const [startSearchQuery, setStartSearchQuery] = useState("");
  const [destinationSearchQuery, setDestinationSearchQuery] = useState("");
  const [startSearchError, setStartSearchError] = useState<string | null>(null);
  const [destinationSearchError, setDestinationSearchError] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState<GraphNode[] | null>(null);
  const [pathError, setPathError] = useState<string | null>(null);
  const [accessible, setAccessible] = useState(false);

  const toggleAccessible = useCallback(() => {
    setAccessible((prev) => !prev);
  }, []);

  // Cache built graphs per building dataFile to avoid rebuilding on every render
  const graphCache = useRef<Map<string, IndoorGraph>>(new Map());

  const clearHighlight = useCallback(() => {
    setHighlightedRoomRef(null);
    setSearchError(null);
  }, []);

  const searchRoom = useCallback((query: string) => {
    setSearchError(null);
    setHighlightedRoomRef(null);

    const normalized = query.replaceAll(/[\s-]/g, "").toUpperCase();
    if (!normalized) return;

    const result = findRoomInBuildings(normalized);
    if (result) {
      setSelectedBuilding(result.building);
      setSelectedFloor(result.floor);
      setHighlightedRoomRef(result.ref);
    } else {
      setSearchError("Room not found");
    }
  }, []);

  const searchStartRoom = useCallback((query: string) => {
    setStartSearchError(null);
    const normalized = query.replaceAll(/[\s-]/g, "").toUpperCase();
    console.log("[IndoorMapContext] searchStartRoom", { query, normalized });
    if (!normalized) return;
    const result = findRoomInBuildings(normalized);
    console.log("[IndoorMapContext] searchStartRoom result", {
      found: !!result,
      buildingCode: result?.building.code,
      floor: result?.floor,
      ref: result?.ref,
    });
    if (result) {
      setSelectedBuilding(result.building);
      setSelectedFloor(result.floor);
      setStartRoomRef(result.ref);
    } else {
      setStartSearchError("Room not found");
    }
  }, []);

  const searchDestinationRoom = useCallback((query: string) => {
    setDestinationSearchError(null);
    const normalized = query.replaceAll(/[\s-]/g, "").toUpperCase();
    console.log("[IndoorMapContext] searchDestinationRoom", { query, normalized });
    if (!normalized) return;
    const result = findRoomInBuildings(normalized);
    console.log("[IndoorMapContext] searchDestinationRoom result", {
      found: !!result,
      buildingCode: result?.building.code,
      floor: result?.floor,
      ref: result?.ref,
    });
    if (result) {
      setDestinationRoomRef(result.ref);
    } else {
      setDestinationSearchError("Room not found");
    }
  }, []);

  const clearStartRoom = useCallback(() => {
    setStartRoomRef(null);
    setStartSearchError(null);
    setCurrentPath(null);
    setPathError(null);
  }, []);

  const clearDestinationRoom = useCallback(() => {
    setDestinationRoomRef(null);
    setDestinationSearchError(null);
    setCurrentPath(null);
    setPathError(null);
  }, []);

  const clearPath = useCallback(() => {
    setCurrentPath(null);
    setPathError(null);
  }, []);

  // Auto-compute shortest path whenever both rooms are set
  useEffect(() => {
    console.log("[IndoorMapContext] path effect triggered", {
      startRoomRef,
      destinationRoomRef,
      selectedBuildingCode: selectedBuilding?.code ?? null,
      accessible,
    });

    if (!startRoomRef || !destinationRoomRef || !selectedBuilding) {
      console.log("[IndoorMapContext] missing refs, clearing path", {
        startRoomRef,
        destinationRoomRef,
        hasBuilding: !!selectedBuilding,
      });
      clearPath();
      return;
    }

    const geoJson = getGeoJsonForBuilding(selectedBuilding);
    if (!geoJson) {
      console.log("[IndoorMapContext] no geoJson for building:", selectedBuilding.code);
      setPathError("No map data for this building");
      return;
    }

    try {
      // Build (or reuse cached) graph for this building
      const cacheKey = selectedBuilding.dataFile;
      let graph = graphCache.current.get(cacheKey);
      if (graph) {
        console.log("[IndoorMapContext] using cached graph for:", cacheKey);
      } else {
        console.log("[IndoorMapContext] building graph for:", cacheKey);
        graph = buildIndoorGraph(geoJson);
        graphCache.current.set(cacheKey, graph);
        console.log("[IndoorMapContext] graph built", {
          nodeCount: graph.nodes.size,
          edgeCount: graph.edges.length,
        });
      }

      console.log("[IndoorMapContext] finding path from", startRoomRef, "to", destinationRoomRef, "accessible:", accessible);
      const path = findIndoorPath(graph, startRoomRef, destinationRoomRef, accessible);
      console.log("[IndoorMapContext] findIndoorPath result", {
        found: !!path,
        pathLength: path?.length ?? 0,
        pathNodes: path?.map((n) => ({ id: n.id, floor: n.floor, type: n.type, lat: n.lat, lng: n.lng })),
      });

      if (path) {
        setCurrentPath(path);
        setPathError(null);
      } else {
        const msg = accessible
          ? "No accessible route found (no elevator/ramp between these rooms)"
          : "No path found between these rooms";
        setCurrentPath(null);
        setPathError(msg);
      }
    } catch (err) {
      console.error("[IndoorMapContext] ERROR in path computation:", err);
      setCurrentPath(null);
      setPathError("Error computing path");
    }
  }, [startRoomRef, destinationRoomRef, selectedBuilding, accessible, clearPath]);

  const value = useMemo(
    () => ({
      selectedBuilding,
      selectedFloor,
      searchQuery,
      highlightedRoomRef,
      searchError,
      startRoomRef,
      destinationRoomRef,
      startSearchQuery,
      destinationSearchQuery,
      startSearchError,
      destinationSearchError,
      currentPath,
      pathError,
      accessible,
      setSelectedBuilding,
      setSelectedFloor,
      setSearchQuery,
      searchRoom,
      clearHighlight,
      setStartSearchQuery,
      setDestinationSearchQuery,
      searchStartRoom,
      searchDestinationRoom,
      clearStartRoom,
      clearDestinationRoom,
      clearPath,
      toggleAccessible,
    }),
    [
      selectedBuilding,
      selectedFloor,
      searchQuery,
      highlightedRoomRef,
      searchError,
      startRoomRef,
      destinationRoomRef,
      startSearchQuery,
      destinationSearchQuery,
      startSearchError,
      destinationSearchError,
      currentPath,
      pathError,
      accessible,
      searchRoom,
      clearHighlight,
      searchStartRoom,
      searchDestinationRoom,
      clearStartRoom,
      clearDestinationRoom,
      clearPath,
      toggleAccessible,
    ],
  );

  return (
    <IndoorMapContext.Provider value={value}>
      {children}
    </IndoorMapContext.Provider>
  );
}

export function useIndoorMap() {
  const context = useContext(IndoorMapContext);
  if (context === undefined) {
    throw new Error("useIndoorMap must be used within an IndoorMapProvider");
  }
  return context;
}
