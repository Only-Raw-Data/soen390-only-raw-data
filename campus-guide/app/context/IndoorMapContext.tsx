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
import { GraphNode, getOrBuildGraph, findNearestGraphNode, haversineDistance } from "@app/services/indoorGraphService";
import { findIndoorPath, findIndoorPathFromNodeId } from "@app/services/indoorPathService";

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

const MAX_SUGGESTIONS = 6;

function collectRoomPrefixMatches(
  geoJson: IndoorGeoJSON,
  buildingName: string,
  normalized: string,
  seen: Set<string>,
  results: { room: string; buildingName: string }[],
  max: number,
): boolean {
  for (const feature of geoJson.features) {
    if (feature.properties?.indoor !== "room" || !feature.properties?.ref)
      continue;
    const ref = feature.properties.ref;

    const refNormalized = ref.replaceAll(/[\s-]/g, "").toUpperCase();
    if (!refNormalized.startsWith(normalized)) continue;
    if (seen.has(refNormalized)) continue;

    seen.add(refNormalized);
    results.push({ room: ref, buildingName });
    if (results.length >= max) return true;
  }
  return false;
}

export function getRoomSuggestions(query: string): { room: string; buildingName: string }[] {
  const normalized = query.replaceAll(/[\s-]/g, "").toUpperCase();
  if (normalized.length < 1) return [];

  const seen = new Set<string>();
  const results: { room: string; buildingName: string }[] = [];

  for (const building of INDOOR_BUILDINGS) {
    const geoJson = getGeoJsonForBuilding(building);
    if (!geoJson) continue;
    if (
      collectRoomPrefixMatches(
        geoJson,
        building.name,
        normalized,
        seen,
        results,
        MAX_SUGGESTIONS,
      )
    ) {
      return results;
    }
  }

  return results;
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
  useCurrentLocation: boolean;
  currentLocationError: string | null;
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
  setStartFromCurrentLocation: (lat: number, lng: number, floor: number | null) => void;
  clearCurrentLocationStart: () => void;
}

const IndoorMapContext = createContext<IndoorMapContextType | undefined>(
  undefined,
);

interface PathComputeParams {
  useCurrentLocation: boolean;
  currentLocationNodeId: string | null;
  startRoomRef: string | null;
  destinationRoomRef: string;
  accessible: boolean;
  building: IndoorBuildingConfig;
}

function computeIndoorPath(params: PathComputeParams): {
  path: GraphNode[] | null;
  error: string | null;
} {
  const geoJson = getGeoJsonForBuilding(params.building);
  if (!geoJson) {
    return { path: null, error: "No map data for this building" };
  }

  const graph = getOrBuildGraph(params.building.dataFile, geoJson);
  let path: GraphNode[] | null = null;

  if (params.useCurrentLocation && params.currentLocationNodeId) {
    path = findIndoorPathFromNodeId(
      graph,
      params.currentLocationNodeId,
      params.destinationRoomRef,
      params.accessible,
    );
  } else if (params.startRoomRef) {
    path = findIndoorPath(
      graph,
      params.startRoomRef,
      params.destinationRoomRef,
      params.accessible,
    );
  }

  if (path) {
    return { path, error: null };
  }

  const error = params.accessible
    ? "No accessible route found (no elevator/ramp between these rooms)"
    : "No path found between these rooms";
  return { path: null, error };
}

function isCrossBuildingNavigation(
  destinationRoomRef: string,
  selectedBuilding: IndoorBuildingConfig,
): boolean {
  const destNormalized = destinationRoomRef
    .replaceAll(/[\s-]/g, "")
    .toUpperCase();
  const destResult = findRoomInBuildings(destNormalized);
  return !!(
    destResult && destResult.building.dataFile !== selectedBuilding.dataFile
  );
}

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
  const [destinationRoomRef, setDestinationRoomRef] = useState<string | null>(
    null,
  );
  const [startSearchQuery, setStartSearchQuery] = useState("");
  const [destinationSearchQuery, setDestinationSearchQuery] = useState("");
  const [startSearchError, setStartSearchError] = useState<string | null>(null);
  const [destinationSearchError, setDestinationSearchError] = useState<
    string | null
  >(null);
  const [currentPath, setCurrentPath] = useState<GraphNode[] | null>(null);
  const [pathError, setPathError] = useState<string | null>(null);
  const [accessible, setAccessible] = useState(false);
  const [showPOIs, setShowPOIs] = useState(true);
  const [isCrossBuilding, setIsCrossBuilding] = useState(false);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [currentLocationNodeId, setCurrentLocationNodeId] = useState<string | null>(null);
  const [currentLocationError, setCurrentLocationError] = useState<string | null>(null);

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

  const searchRoomFor = useCallback(
    (
      query: string,
      setError: (msg: string | null) => void,
      onFound: (result: {
        building: IndoorBuildingConfig;
        floor: number;
        ref: string;
      }) => void,
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
    },
    [],
  );

  const searchRoom = useCallback(
    (query: string) => {
      setHighlightedRoomRef(null);
      searchRoomFor(query, setSearchError, (result) => {
        setSelectedBuilding(result.building);
        setSelectedFloor(result.floor);
        setHighlightedRoomRef(result.ref);
      });
    },
    [searchRoomFor],
  );

  const searchStartRoom = useCallback(
    (query: string) => {
      posthog.capture("indoor_room_searched", { query, role: "start" });
      searchRoomFor(query, setStartSearchError, (result) => {
        setSelectedBuilding(result.building);
        setSelectedFloor(result.floor);
        setStartRoomRef(result.ref);
      });
    },
    [searchRoomFor, posthog],
  );

  const searchDestinationRoom = useCallback(
    (query: string) => {
      posthog.capture("indoor_room_searched", { query, role: "destination" });
      searchRoomFor(query, setDestinationSearchError, (result) => {
        setDestinationRoomRef(result.ref);
      });
    },
    [searchRoomFor, posthog],
  );

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

  const setStartFromCurrentLocation = useCallback(
    (lat: number, lng: number, floor: number | null) => {
      setCurrentLocationError(null);

      // If a building and floor are already selected, search only within that context.
      if (selectedBuilding && floor !== null) {
        const geoJson = getGeoJsonForBuilding(selectedBuilding);
        if (!geoJson) {
          setCurrentLocationError("No map data for this building");
          return;
        }
        const graph = getOrBuildGraph(selectedBuilding.dataFile, geoJson);
        const nearest = findNearestGraphNode(graph, lat, lng, floor);
        if (!nearest) {
          setCurrentLocationError("Could not determine your position indoors");
          return;
        }
        setUseCurrentLocation(true);
        setCurrentLocationNodeId(nearest.id);
        setStartRoomRef(null);
        setStartSearchQuery("");
        setStartSearchError(null);
        return;
      }

      // No building/floor pre-selected — auto-detect by finding the nearest graph
      // node across every mapped building and every floor.
      let bestBuilding: IndoorBuildingConfig | null = null;
      let bestNode: GraphNode | null = null;
      let bestDist = Infinity;

      for (const building of INDOOR_BUILDINGS) {
        const geoJson = getGeoJsonForBuilding(building);
        if (!geoJson) continue;
        const graph = getOrBuildGraph(building.dataFile, geoJson);
        for (const node of graph.nodes.values()) {
          const d = haversineDistance(lat, lng, node.lat, node.lng);
          if (d < bestDist) {
            bestDist = d;
            bestBuilding = building;
            bestNode = node;
          }
        }
      }

      if (!bestBuilding || !bestNode) {
        setCurrentLocationError("Could not determine your position indoors");
        return;
      }

      setSelectedBuilding(bestBuilding);
      setSelectedFloor(bestNode.floor);
      setUseCurrentLocation(true);
      setCurrentLocationNodeId(bestNode.id);
      setStartRoomRef(null);
      setStartSearchQuery("");
      setStartSearchError(null);
    },
    [selectedBuilding],
  );

  const clearCurrentLocationStart = useCallback(() => {
    setUseCurrentLocation(false);
    setCurrentLocationNodeId(null);
    setCurrentLocationError(null);
    setCurrentPath(null);
    setPathError(null);
  }, []);

  // Auto-compute shortest path whenever start and destination are set
  useEffect(() => {
    setIsCrossBuilding(false);

    const hasStart = startRoomRef || (useCurrentLocation && currentLocationNodeId);
    if (!hasStart || !destinationRoomRef || !selectedBuilding) {
      clearPath();
      return;
    }

    if (isCrossBuildingNavigation(destinationRoomRef, selectedBuilding)) {
      setIsCrossBuilding(true);
      setCurrentPath(null);
      setPathError(null);
      return;
    }

    try {
      const { path, error } = computeIndoorPath({
        useCurrentLocation,
        currentLocationNodeId,
        startRoomRef,
        destinationRoomRef,
        accessible,
        building: selectedBuilding,
      });
      setCurrentPath(path);
      setPathError(error);
      posthog.capture("indoor_path_calculated", {
        building_code: selectedBuilding.code,
        start_room: useCurrentLocation ? "current_location" : startRoomRef,
        destination_room: destinationRoomRef,
        accessible,
        success: !!path,
        ...(path ? { steps: path.length } : { error }),
      });
    } catch (err) {
      console.error("[IndoorMapContext] ERROR in path computation:", err);
      setCurrentPath(null);
      setPathError("Error computing path");
    }
  }, [
    startRoomRef,
    destinationRoomRef,
    selectedBuilding,
    accessible,
    clearPath,
    posthog,
    useCurrentLocation,
    currentLocationNodeId,
  ]);

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
      useCurrentLocation,
      currentLocationError,
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
      setStartFromCurrentLocation,
      clearCurrentLocationStart,
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
      useCurrentLocation,
      currentLocationError,
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
      setStartFromCurrentLocation,
      clearCurrentLocationStart,
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
