import { IndoorGeoJSON } from "../types/indoorMap";

export type NodeType = "room" | "waypoint" | "elevator" | "staircase";
export type EdgeType = "corridor" | "elevator" | "staircase";

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
const ELEVATOR_FLOOR_PENALTY = 5;
const STAIRCASE_FLOOR_PENALTY = 10;

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
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const adjacency = new Map<
    string,
    Array<{ nodeId: string; weight: number; type: EdgeType }>
  >();

  function addNode(node: GraphNode): void {
    if (!nodes.has(node.id)) {
      nodes.set(node.id, node);
      adjacency.set(node.id, []);
    }
  }

  function addEdge(
    from: string,
    to: string,
    weight: number,
    type: EdgeType,
  ): void {
    edges.push({ from, to, weight, type });
    adjacency.get(from)!.push({ nodeId: to, weight, type });
    adjacency.get(to)!.push({ nodeId: from, weight, type });
  }

  // Tracks which coordinate keys belong to corridor waypoints, keyed by floor
  const waypointsByFloor = new Map<number, Set<string>>();

  // ── Pass 1: corridors (LineString + highway=footway) ──────────────────────
  // Each coordinate in a corridor becomes a waypoint node; consecutive
  // coordinates on the same LineString are joined by a corridor edge.
  for (const feature of geoJson.features) {
    if (feature.geometry.type !== "LineString") continue;
    if (feature.properties?.highway !== "footway") continue;
    if (!feature.properties?.level) continue;

    const floors = parseFloors(feature.properties.level);
    const coords = feature.geometry.coordinates as number[][];

    for (const floor of floors) {
      if (!waypointsByFloor.has(floor)) waypointsByFloor.set(floor, new Set());
      const floorWaypoints = waypointsByFloor.get(floor)!;

      let prevId: string | null = null;
      for (const coord of coords) {
        const [lng, lat] = coord;
        const id = coordKey(lng, lat);
        floorWaypoints.add(id);
        addNode({ id, lat, lng, floor, type: "waypoint" });
        if (prevId) {
          const prev = nodes.get(prevId)!;
          addEdge(prevId, id, haversineDistance(prev.lat, prev.lng, lat, lng), "corridor");
        }
        prevId = id;
      }
    }
  }

  // ── Pass 2: rooms and areas (Polygon + indoor property, not elevators) ────
  // Room nodes sit at the polygon centroid; they connect to the corridor
  // network wherever a polygon vertex coincides with a corridor waypoint.
  for (const feature of geoJson.features) {
    if (feature.geometry.type !== "Polygon") continue;
    if (!feature.properties?.indoor) continue;
    if (feature.properties?.highway === "elevator") continue;
    if (!feature.properties?.level) continue;

    const floors = parseFloors(feature.properties.level);
    const outerRing = (feature.geometry.coordinates as number[][][])[0];
    const [cLng, cLat] = polygonCentroid(outerRing);

    for (const floor of floors) {
      const ref = feature.properties.ref ?? undefined;
      const roomId = ref
        ? `room:${ref}:${floor}`
        : `room:${coordKey(cLng, cLat)}:${floor}`;

      addNode({ id: roomId, lat: cLat, lng: cLng, floor, type: "room", ref });

      const floorWaypoints = waypointsByFloor.get(floor);
      if (floorWaypoints) {
        for (const coord of outerRing) {
          const key = coordKey(coord[0], coord[1]);
          if (floorWaypoints.has(key)) {
            const wp = nodes.get(key)!;
            addEdge(roomId, key, haversineDistance(cLat, cLng, wp.lat, wp.lng), "corridor");
          }
        }
      }
    }
  }

  // ── Pass 3: elevators (Polygon + highway=elevator) ─────────────────────────
  // One node per floor served; cross-floor elevator edges join every pair of
  // floors, weighted by floor distance × ELEVATOR_FLOOR_PENALTY.
  for (const feature of geoJson.features) {
    if (feature.geometry.type !== "Polygon") continue;
    if (feature.properties?.highway !== "elevator") continue;
    if (!feature.properties?.level) continue;

    const floors = parseFloors(feature.properties.level);
    const outerRing = (feature.geometry.coordinates as number[][][])[0];
    const [cLng, cLat] = polygonCentroid(outerRing);
    const elevatorIds: string[] = [];

    for (const floor of floors) {
      const id = `elevator:${coordKey(cLng, cLat)}:${floor}`;
      elevatorIds.push(id);
      addNode({ id, lat: cLat, lng: cLng, floor, type: "elevator" });

      const floorWaypoints = waypointsByFloor.get(floor);
      if (floorWaypoints) {
        for (const coord of outerRing) {
          const key = coordKey(coord[0], coord[1]);
          if (floorWaypoints.has(key)) {
            const wp = nodes.get(key)!;
            addEdge(id, key, haversineDistance(cLat, cLng, wp.lat, wp.lng), "corridor");
          }
        }
      }
    }

    // Cross-floor edges between every pair of floors this elevator serves
    for (let i = 0; i < elevatorIds.length; i++) {
      for (let j = i + 1; j < elevatorIds.length; j++) {
        const weight = Math.abs(floors[i] - floors[j]) * ELEVATOR_FLOOR_PENALTY;
        addEdge(elevatorIds[i], elevatorIds[j], weight, "elevator");
      }
    }
  }

  // ── Pass 4: staircases (Polygon + stairs=yes) ─────────────────────────────
  // Same pattern as elevators but weighted by STAIRCASE_FLOOR_PENALTY and
  // cross-floor edges connect only adjacent floors.
  for (const feature of geoJson.features) {
    if (feature.geometry.type !== "Polygon") continue;
    if (!feature.properties?.stairs) continue;
    if (!feature.properties?.level) continue;

    const floors = parseFloors(feature.properties.level);
    const outerRing = (feature.geometry.coordinates as number[][][])[0];
    const [cLng, cLat] = polygonCentroid(outerRing);
    const staircaseIds: string[] = [];

    for (const floor of floors) {
      const id = `staircase:${coordKey(cLng, cLat)}:${floor}`;
      staircaseIds.push(id);
      addNode({ id, lat: cLat, lng: cLng, floor, type: "staircase" });

      const floorWaypoints = waypointsByFloor.get(floor);
      if (floorWaypoints) {
        for (const coord of outerRing) {
          const key = coordKey(coord[0], coord[1]);
          if (floorWaypoints.has(key)) {
            const wp = nodes.get(key)!;
            addEdge(id, key, haversineDistance(cLat, cLng, wp.lat, wp.lng), "corridor");
          }
        }
      }
    }

    // Cross-floor edges between adjacent floors only (stairs are sequential)
    for (let i = 0; i < staircaseIds.length - 1; i++) {
      const weight = Math.abs(floors[i] - floors[i + 1]) * STAIRCASE_FLOOR_PENALTY;
      addEdge(staircaseIds[i], staircaseIds[i + 1], weight, "staircase");
    }
  }

  return { nodes, edges, adjacency };
}
