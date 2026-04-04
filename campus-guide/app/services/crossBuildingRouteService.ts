import { NavigationStep } from "@app/types/navigation";
import {
  getOrBuildGraph,
  GraphNode,
} from "./indoorGraphService";
import {
  findIndoorPath,
  findPathToNearestEntrance,
  findPathFromEntrance,
} from "./indoorPathService";
import { fetchDirections, RouteData } from "./directionsService";
import {
  findRoomInBuildings,
  getGeoJsonForBuilding,
} from "../context/IndoorMapContext";
import { IndoorBuildingConfig } from "@app/types/indoorMap";

function getBuildingGraph(building: IndoorBuildingConfig) {
  const geoJson = getGeoJsonForBuilding(building);
  if (!geoJson) return null;
  return getOrBuildGraph(building.dataFile, geoJson);
}

function getEntranceCoords(
  path: GraphNode[] | null,
  building: IndoorBuildingConfig,
  useEnd: boolean,
): { lat: number; lng: number } {
  if (path && path.length > 0) {
    const node = useEnd ? path.at(-1)! : path[0];
    return { lat: node.lat, lng: node.lng };
  }
  // Fallback: building centroid
  return { lat: building.centerLat, lng: building.centerLng };
}

/**
 * Plans a cross-building route returning an array of NavigationSteps.
 * - Same building: returns 1 indoor step
 * - Different buildings: returns 3 steps (indoor exit, outdoor walk, indoor enter)
 */
export async function planCrossBuildingRoute(
  startQuery: string,
  destQuery: string,
  accessible = false,
): Promise<NavigationStep[] | null> {
  const normalizedStart = startQuery.replaceAll(/[\s-]/g, "").toUpperCase();
  const normalizedDest = destQuery.replaceAll(/[\s-]/g, "").toUpperCase();

  const startResult = findRoomInBuildings(normalizedStart);
  const destResult = findRoomInBuildings(normalizedDest);

  if (!startResult || !destResult) return null;

  const startBuilding = startResult.building;
  const destBuilding = destResult.building;

  // Same building — single indoor step
  if (startBuilding.dataFile === destBuilding.dataFile) {
    const graph = getBuildingGraph(startBuilding);
    if (!graph) return null;
    const path = findIndoorPath(graph, startResult.ref, destResult.ref, accessible);
    if (!path) return null;
    return [
      {
        kind: "indoor",
        buildingCode: startBuilding.code,
        buildingName: startBuilding.name,
        path,
        startLabel: `Room ${startResult.ref}`,
        endLabel: `Room ${destResult.ref}`,
      },
    ];
  }

  // Different buildings — 3-step route
  const graphA = getBuildingGraph(startBuilding);
  const graphB = getBuildingGraph(destBuilding);
  if (!graphA || !graphB) return null;

  // Step 1: Indoor path from start room to nearest entrance in building A
  const pathToExit = findPathToNearestEntrance(graphA, startResult.ref, accessible);

  // Step 3: Indoor path from entrance to destination room in building B
  const pathFromEntrance = findPathFromEntrance(graphB, destResult.ref, accessible);

  // Get coordinates for outdoor segment
  const exitCoords = getEntranceCoords(pathToExit, startBuilding, true);
  const enterCoords = getEntranceCoords(pathFromEntrance, destBuilding, false);

  // Straight-line fallback when the directions API is unavailable
  const fallbackRoute: RouteData = {
    coordinates: [
      { latitude: exitCoords.lat, longitude: exitCoords.lng },
      { latitude: enterCoords.lat, longitude: enterCoords.lng },
    ],
    duration: "~5 mins",
    distance: "~0.3 km",
  };

  // Step 2: Outdoor walking route between buildings
  let outdoorRoute: RouteData;
  try {
    outdoorRoute = await fetchDirections(exitCoords, enterCoords, "walk") ?? fallbackRoute;
  } catch {
    outdoorRoute = fallbackRoute;
  }

  const steps: NavigationStep[] = [];

  // Step 1: Indoor exit (may be null if no entrance nodes, still add with fallback)
  if (pathToExit && pathToExit.length > 0) {
    steps.push({
      kind: "indoor",
      buildingCode: startBuilding.code,
      buildingName: startBuilding.name,
      path: pathToExit,
      startLabel: `Room ${startResult.ref}`,
      endLabel: `${startBuilding.name} Exit`,
    });
  }

  // Step 2: Outdoor walk
  steps.push({
    kind: "outdoor",
    route: outdoorRoute,
    startLabel: startBuilding.name,
    endLabel: destBuilding.name,
  });

  // Step 3: Indoor entrance to destination
  if (pathFromEntrance && pathFromEntrance.length > 0) {
    steps.push({
      kind: "indoor",
      buildingCode: destBuilding.code,
      buildingName: destBuilding.name,
      path: pathFromEntrance,
      startLabel: `${destBuilding.name} Entrance`,
      endLabel: `Room ${destResult.ref}`,
    });
  }

  return steps.length > 0 ? steps : null;
}

/**
 * Plans a route starting from a GPS coordinate (outdoor) to an indoor room.
 * Returns 2 steps: outdoor walk to the building entrance, then indoor to the room.
 * Used when the user's starting point is their current location outside any building.
 */
export async function planCrossBuildingRouteFromGps(
  gpsCoords: { lat: number; lng: number },
  destQuery: string,
  accessible = false,
): Promise<NavigationStep[] | null> {
  const normalizedDest = destQuery.replaceAll(/[\s-]/g, "").toUpperCase();
  const destResult = findRoomInBuildings(normalizedDest);
  if (!destResult) return null;

  const destBuilding = destResult.building;
  const graphB = getBuildingGraph(destBuilding);
  if (!graphB) return null;

  const pathFromEntrance = findPathFromEntrance(graphB, destResult.ref, accessible);
  const enterCoords = getEntranceCoords(pathFromEntrance, destBuilding, false);

  const fallbackRoute: RouteData = {
    coordinates: [
      { latitude: gpsCoords.lat, longitude: gpsCoords.lng },
      { latitude: enterCoords.lat, longitude: enterCoords.lng },
    ],
    duration: "~5 mins",
    distance: "~0.3 km",
  };

  let outdoorRoute: RouteData;
  try {
    outdoorRoute = await fetchDirections(gpsCoords, enterCoords, "walk") ?? fallbackRoute;
  } catch {
    outdoorRoute = fallbackRoute;
  }

  const steps: NavigationStep[] = [
    {
      kind: "outdoor",
      route: outdoorRoute,
      startLabel: "Your Location",
      endLabel: destBuilding.name,
    },
  ];

  if (pathFromEntrance && pathFromEntrance.length > 0) {
    steps.push({
      kind: "indoor",
      buildingCode: destBuilding.code,
      buildingName: destBuilding.name,
      path: pathFromEntrance,
      startLabel: `${destBuilding.name} Entrance`,
      endLabel: `Room ${destResult.ref}`,
    });
  }

  return steps.length > 0 ? steps : null;
}
