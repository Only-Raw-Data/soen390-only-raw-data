import { IndoorGeoJSON, IndoorFeature } from "@app/types/indoorMap";

export enum NodeType {
  Room = "room",
  Waypoint = "waypoint",
  Elevator = "elevator",
  Staircase = "staircase",
  Entrance = "entrance",
}

export enum EdgeType {
  Corridor = "corridor",
  Elevator = "elevator",
  Staircase = "staircase",
}

export interface GraphNode {
  id: string;
  lat: number;
  lng: number;
  floor: number;
  type: NodeType;
  ref?: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  weight: number; // distance in metres
  type: EdgeType;
}

export interface IndoorGraph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  adjacency: Map<string, Array<{ nodeId: string; weight: number; type: EdgeType }>>;
}

// Metres added per floor for cross-floor traversal
// Stairs are cheaper in normal mode (faster); elevator is cheaper only when
// staircase edges are excluded in accessible mode.
const ELEVATOR_FLOOR_PENALTY = 20;
const STAIRCASE_FLOOR_PENALTY = 5;

// Coordinate key rounded to ~1 cm precision (6 decimal places ≈ 0.11 m)
export function coordKey(lng: number, lat: number): string {
  return `${lng.toFixed(6)},${lat.toFixed(6)}`;
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dphi = ((lat2 - lat1) * Math.PI) / 180;
  const dlambda = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dphi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dlambda / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function polygonCentroid(ring: number[][]): [number, number] {
  // Exclude the closing duplicate vertex
  const pts = ring.length > 1 && ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]
    ? ring.slice(0, -1)
    : ring;
  let lngSum = 0;
  let latSum = 0;
  for (const c of pts) {
    lngSum += c[0];
    latSum += c[1];
  }
  return [lngSum / pts.length, latSum / pts.length];
}

function parseFloors(level: string): number[] {
  return level
    .split(";")
    .map((s) => Number.parseInt(s, 10))
    .filter((n) => !Number.isNaN(n));
}

// Builds a floor-specific waypoint node ID from a coordinate key and floor.
function waypointId(key: string, floor: number): string {
  return `${key}:${floor}`;
}

// Shared helper context for graph-building sub-functions.
interface GraphContext {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
  adjacency: Map<string, Array<{ nodeId: string; weight: number; type: EdgeType }>>;
  waypointsByFloor: Map<number, Set<string>>;
}

function addNode(ctx: GraphContext, node: GraphNode): void {
  if (!ctx.nodes.has(node.id)) {
    ctx.nodes.set(node.id, node);
    ctx.adjacency.set(node.id, []);
  }
}

function addEdge(
  ctx: GraphContext,
  from: string,
  to: string,
  weight: number,
  type: EdgeType,
): void {
  ctx.edges.push({ from, to, weight, type });
  ctx.adjacency.get(from)!.push({ nodeId: to, weight, type });
  ctx.adjacency.get(to)!.push({ nodeId: from, weight, type });
}

// Connects a polygon node to any corridor waypoints whose coordinates appear
// in the polygon's outer ring on the given floor.
function connectToCorridors(
  ctx: GraphContext,
  nodeId: string,
  cLat: number,
  cLng: number,
  floor: number,
  outerRing: number[][],
): void {
  const floorWaypoints = ctx.waypointsByFloor.get(floor);
  if (!floorWaypoints) return;
  for (const coord of outerRing) {
    const key = coordKey(coord[0], coord[1]);
    if (floorWaypoints.has(key)) {
      const wpId = waypointId(key, floor);
      const wp = ctx.nodes.get(wpId)!;
      addEdge(ctx, nodeId, wpId, haversineDistance(cLat, cLng, wp.lat, wp.lng), EdgeType.Corridor);
    }
  }
}

// Builds one node per floor for a vertical-transition polygon (elevator or
// staircase), connects each to the corridor network, and returns the ordered
// list of node ids (parallel to the floors array).
function buildTransitionNodes(
  ctx: GraphContext,
  floors: number[],
  cLat: number,
  cLng: number,
  outerRing: number[][],
  prefix: NodeType.Elevator | NodeType.Staircase,
): string[] {
  return floors.map((floor) => {
    const id = `${prefix}:${coordKey(cLng, cLat)}:${floor}`;
    addNode(ctx, { id, lat: cLat, lng: cLng, floor, type: prefix });
    connectToCorridors(ctx, id, cLat, cLng, floor, outerRing);
    return id;
  });
}

// Processes a single corridor LineString on a given floor, creating waypoint
// nodes and corridor edges between consecutive coordinates.
function processCorridorOnFloor(
  ctx: GraphContext,
  coords: number[][],
  floor: number,
): void {
  if (!ctx.waypointsByFloor.has(floor)) ctx.waypointsByFloor.set(floor, new Set());
  const floorWaypoints = ctx.waypointsByFloor.get(floor)!;

  let prevId: string | null = null;
  for (const coord of coords) {
    const [lng, lat] = coord;
    const key = coordKey(lng, lat);
    floorWaypoints.add(key);
    const id = waypointId(key, floor);
    addNode(ctx, { id, lat, lng, floor, type: NodeType.Waypoint });
    if (prevId) {
      const prev = ctx.nodes.get(prevId)!;
      addEdge(ctx, prevId, id, haversineDistance(prev.lat, prev.lng, lat, lng), EdgeType.Corridor);
    }
    prevId = id;
  }
}

// ── Pass 1: corridors (LineString + highway=footway) ──────────────────────
function processCorridors(ctx: GraphContext, features: IndoorFeature[]): void {
  for (const feature of features) {
    if (feature.geometry.type !== "LineString") continue;
    if (feature.properties?.highway !== "footway") continue;
    if (!feature.properties?.level) continue;

    const floors = parseFloors(feature.properties.level);
    const coords = feature.geometry.coordinates as number[][];

    for (const floor of floors) {
      processCorridorOnFloor(ctx, coords, floor);
    }
  }
}

// Links elevator nodes across all floor pairs with full connectivity.
function linkElevatorFloors(ctx: GraphContext, ids: string[], floors: number[]): void {
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      addEdge(ctx, ids[i], ids[j], Math.abs(floors[i] - floors[j]) * ELEVATOR_FLOOR_PENALTY, EdgeType.Elevator);
    }
  }
}

// Links staircase nodes between consecutive floors.
function linkStaircaseFloors(ctx: GraphContext, ids: string[], floors: number[]): void {
  for (let i = 0; i < ids.length - 1; i++) {
    addEdge(ctx, ids[i], ids[i + 1], Math.abs(floors[i] - floors[i + 1]) * STAIRCASE_FLOOR_PENALTY, EdgeType.Staircase);
  }
}

// Creates room nodes for each floor and connects them to corridors.
function processRoomFloors(
  ctx: GraphContext,
  floors: number[],
  cLat: number,
  cLng: number,
  outerRing: number[][],
  ref: string | undefined,
): void {
  for (const floor of floors) {
    const roomId = ref
      ? `room:${ref}:${floor}`
      : `room:${coordKey(cLng, cLat)}:${floor}`;
    addNode(ctx, { id: roomId, lat: cLat, lng: cLng, floor, type: NodeType.Room, ref });
    connectToCorridors(ctx, roomId, cLat, cLng, floor, outerRing);
  }
}

// ── Pass 2: polygons (rooms, elevators, staircases) ─────────────────────
function processPolygons(ctx: GraphContext, features: IndoorFeature[]): void {
  for (const feature of features) {
    if (feature.geometry.type !== "Polygon") continue;
    if (!feature.properties?.level) continue;

    const isElevator = feature.properties?.highway === "elevator";
    const isStaircase = !!feature.properties?.stairs;
    const isRoom = !!feature.properties?.indoor && !isElevator;

    if (!isElevator && !isStaircase && !isRoom) continue;

    const floors = parseFloors(feature.properties.level);
    const outerRing = (feature.geometry.coordinates as number[][][])[0];
    const [cLng, cLat] = polygonCentroid(outerRing);

    if (isElevator) {
      const ids = buildTransitionNodes(ctx, floors, cLat, cLng, outerRing, NodeType.Elevator);
      linkElevatorFloors(ctx, ids, floors);
    } else if (isStaircase) {
      const ids = buildTransitionNodes(ctx, floors, cLat, cLng, outerRing, NodeType.Staircase);
      linkStaircaseFloors(ctx, ids, floors);
    } else {
      processRoomFloors(ctx, floors, cLat, cLng, outerRing, feature.properties.ref ?? undefined);
    }
  }
}

// Finds the nearest corridor waypoint to a given coordinate on a floor.
function findNearestWaypoint(
  ctx: GraphContext,
  lat: number,
  lng: number,
  floorWaypoints: Set<string>,
  floor: number,
): { id: string; dist: number } | null {
  let bestId: string | null = null;
  let bestDist = Infinity;
  for (const key of floorWaypoints) {
    const wpNodeId = waypointId(key, floor);
    const wp = ctx.nodes.get(wpNodeId);
    // Guard against stale keys whose node was never created (data mismatch)
    if (!wp) continue;
    const d = haversineDistance(lat, lng, wp.lat, wp.lng);
    if (d < bestDist) {
      bestDist = d;
      bestId = wpNodeId;
    }
  }
  return bestId ? { id: bestId, dist: bestDist } : null;
}

// Links an entrance node to the nearest corridor waypoint on its floor.
function linkEntranceToCorridors(
  ctx: GraphContext,
  entranceId: string,
  lat: number,
  lng: number,
  floor: number,
): void {
  const floorWaypoints = ctx.waypointsByFloor.get(floor);
  // Skip floors with no corridor data – the entrance cannot be linked
  if (!floorWaypoints) return;

  const nearest = findNearestWaypoint(ctx, lat, lng, floorWaypoints, floor);
  if (nearest) {
    // Use at least a tiny weight so all edges remain positive
    addEdge(ctx, entranceId, nearest.id, Math.max(nearest.dist, 0.1), EdgeType.Corridor);
  }
}

// ── Pass 3: entrance points (Point + entrance="yes") ───────────────────
function processEntrances(ctx: GraphContext, features: IndoorFeature[]): void {
  for (const feature of features) {
    if (feature.geometry.type !== "Point") continue;
    if (feature.properties?.entrance !== "yes") continue;
    if (!feature.properties?.level) continue;

    const floors = parseFloors(feature.properties.level);
    const coords = feature.geometry.coordinates as number[];
    const [lng, lat] = coords;

    for (const floor of floors) {
      const id = `entrance:${coordKey(lng, lat)}:${floor}`;
      addNode(ctx, { id, lat, lng, floor, type: NodeType.Entrance });
      linkEntranceToCorridors(ctx, id, lat, lng, floor);
    }
  }
}

/**
 * Builds a navigation graph from an indoor GeoJSON FeatureCollection.
 *
 * Node types:
 *   - "room"       – centroid of a room or area polygon
 *   - "waypoint"   – point along a corridor LineString (intersection or turn)
 *   - "elevator"   – centroid of an elevator polygon, one node per floor served
 *   - "staircase"  – centroid of a staircase polygon, one node per floor served
 *
 * Edge types:
 *   - "corridor"   – connects consecutive corridor waypoints, or a room /
 *                    elevator / staircase node to the corridor network
 *   - "elevator"   – connects elevator nodes on different floors
 *   - "staircase"  – connects staircase nodes on different floors
 */
export function buildIndoorGraph(geoJson: IndoorGeoJSON): IndoorGraph {
  const ctx: GraphContext = {
    nodes: new Map<string, GraphNode>(),
    edges: [],
    adjacency: new Map<string, Array<{ nodeId: string; weight: number; type: EdgeType }>>(),
    waypointsByFloor: new Map<number, Set<string>>(),
  };

  processCorridors(ctx, geoJson.features);
  processPolygons(ctx, geoJson.features);
  processEntrances(ctx, geoJson.features);

  return { nodes: ctx.nodes, edges: ctx.edges, adjacency: ctx.adjacency };
}

/**
 * Returns all entrance nodes in the given graph.
 */
export function findEntranceNodes(graph: IndoorGraph): GraphNode[] {
  return [...graph.nodes.values()].filter(
    (n) => n.type === NodeType.Entrance,
  );
}

// Module-level cache so both IndoorMapContext and crossBuildingRouteService
// share one graph per building data file.
const graphCacheMap = new Map<string, IndoorGraph>();

/**
 * Returns a cached IndoorGraph for the given data file key, building it from
 * geoJson if not already cached.
 */
export function getOrBuildGraph(
  dataFile: string,
  geoJson: IndoorGeoJSON,
): IndoorGraph {
  let graph = graphCacheMap.get(dataFile);
  if (!graph) {
    graph = buildIndoorGraph(geoJson);
    graphCacheMap.set(dataFile, graph);
  }
  return graph;
}
