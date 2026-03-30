import React, {
  createContext,
  useContext,
  useState,
  useEffect,

  useMemo,
  useCallback,
  ReactNode,
} from "react";
import { usePostHog } from "posthog-react-native";
import {
  IndoorBuildingConfig,
  IndoorFeature,
  IndoorGeoJSON,
} from "@app/types/indoorMap";
import { GraphNode, getOrBuildGraph } from "@app/services/indoorGraphService";
import { findIndoorPath } from "@app/services/indoorPathService";

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

export function findRoomInBuildings(
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
  showPOIs: boolean;
  isCrossBuilding: boolean;
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
  togglePOIs: () => void;
}

const IndoorMapContext = createContext<IndoorMapContextType | undefined>(
  undefined,
);

export default function IndoorMapProvider({
  children,
}: {
  readonly children: ReactNode;
}) {
  const posthog = usePostHog();
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
  const [showPOIs, setShowPOIs] = useState(true);
  const [isCrossBuilding, setIsCrossBuilding] = useState(false);

  const toggleAccessible = useCallback(() => {
    setAccessible((prev) => !prev);
  }, []);

  const togglePOIs = useCallback(() => {
    setShowPOIs((prev) => !prev);
  }, []);

  const clearHighlight = useCallback(() => {
    setHighlightedRoomRef(null);
    setSearchError(null);
  }, []);

  const searchRoomFor = useCallback((
    query: string,
    setError: (msg: string | null) => void,
    onFound: (result: { building: IndoorBuildingConfig; floor: number; ref: string }) => void,
  ) => {
    setError(null);
    const normalized = query.replaceAll(/[\s-]/g, "").toUpperCase();
    if (!normalized) return;
    const result = findRoomInBuildings(normalized);
    if (result) {
      onFound(result);
    } else {
      setError("Room not found");
    }
  }, []);

  const searchRoom = useCallback((query: string) => {
    setHighlightedRoomRef(null);
    searchRoomFor(query, setSearchError, (result) => {
      setSelectedBuilding(result.building);
      setSelectedFloor(result.floor);
      setHighlightedRoomRef(result.ref);
    });
  }, [searchRoomFor]);

  const searchStartRoom = useCallback((query: string) => {
    posthog.capture('indoor_room_searched', { query, role: 'start' });
    searchRoomFor(query, setStartSearchError, (result) => {
      setSelectedBuilding(result.building);
      setSelectedFloor(result.floor);
      setStartRoomRef(result.ref);
    });
  }, [searchRoomFor, posthog]);

  const searchDestinationRoom = useCallback((query: string) => {
    posthog.capture('indoor_room_searched', { query, role: 'destination' });
    searchRoomFor(query, setDestinationSearchError, (result) => {
      setDestinationRoomRef(result.ref);
    });
  }, [searchRoomFor, posthog]);

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
    setIsCrossBuilding(false);

    if (!startRoomRef || !destinationRoomRef || !selectedBuilding) {
      clearPath();
      return;
    }

    // Detect cross-building: check if destination room belongs to a different building
    const destNormalized = destinationRoomRef.replaceAll(/[\s-]/g, "").toUpperCase();
    const destResult = findRoomInBuildings(destNormalized);
    if (destResult && destResult.building.dataFile !== selectedBuilding.dataFile) {
      setIsCrossBuilding(true);
      setCurrentPath(null);
      setPathError(null);
      return;
    }

    const geoJson = getGeoJsonForBuilding(selectedBuilding);
    if (!geoJson) {
      setPathError("No map data for this building");
      return;
    }

    try {
      const graph = getOrBuildGraph(selectedBuilding.dataFile, geoJson);

      const path = findIndoorPath(graph, startRoomRef, destinationRoomRef, accessible);

      if (path) {
        setCurrentPath(path);
        setPathError(null);
        posthog.capture('indoor_path_calculated', {
          building_code: selectedBuilding.code,
          start_room: startRoomRef,
          destination_room: destinationRoomRef,
          accessible,
          success: true,
          steps: path.length,
        });
      } else {
        const msg = accessible
          ? "No accessible route found (no elevator/ramp between these rooms)"
          : "No path found between these rooms";
        setCurrentPath(null);
        setPathError(msg);
        posthog.capture('indoor_path_calculated', {
          building_code: selectedBuilding.code,
          start_room: startRoomRef,
          destination_room: destinationRoomRef,
          accessible,
          success: false,
          error: msg,
        });
      }
    } catch (err) {
      console.error("[IndoorMapContext] ERROR in path computation:", err);
      setCurrentPath(null);
      setPathError("Error computing path");
    }
  }, [startRoomRef, destinationRoomRef, selectedBuilding, accessible, clearPath, posthog]);

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
      isCrossBuilding,
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
      showPOIs,
      togglePOIs,
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
      isCrossBuilding,
      showPOIs,
      searchRoom,
      clearHighlight,
      searchStartRoom,
      searchDestinationRoom,
      clearStartRoom,
      clearDestinationRoom,
      clearPath,
      toggleAccessible,
      togglePOIs,
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
