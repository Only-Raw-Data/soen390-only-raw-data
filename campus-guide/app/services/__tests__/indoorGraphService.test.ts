import {
  buildIndoorGraph,
  coordKey,
  haversineDistance,
} from "@/app/services/indoorGraphService";
import { IndoorGeoJSON } from "@/app/types/indoorMap";

// Shared corridor waypoint coordinates used across tests
const WP1 = [-73.579, 45.497];
const WP2 = [-73.578, 45.497];
const WP3 = [-73.577, 45.497];

// Room polygon whose first vertex coincides with WP1
const ROOM_COORDS = [
  WP1,
  [-73.5791, 45.4971],
  [-73.5791, 45.4969],
  [-73.579, 45.4969],
  WP1, // closed ring
];

function makeGeoJSON(features: IndoorGeoJSON["features"]): IndoorGeoJSON {
  return { type: "FeatureCollection", features };
}

function corridor(coords: number[][], level = "1"): IndoorGeoJSON["features"][number] {
  return {
    type: "Feature",
    properties: { highway: "footway", level },
    geometry: { type: "LineString", coordinates: coords },
  };
}

function room(
  coords: number[][],
  ref: string | null,
  level = "1",
): IndoorGeoJSON["features"][number] {
  return {
    type: "Feature",
    properties: { indoor: "room", ref: ref ?? undefined, level },
    geometry: { type: "Polygon", coordinates: [coords] },
  };
}

function elevator(
  coords: number[][],
  level: string,
): IndoorGeoJSON["features"][number] {
  return {
    type: "Feature",
    properties: { indoor: "room", highway: "elevator", level },
    geometry: { type: "Polygon", coordinates: [coords] },
  };
}

function staircase(
  coords: number[][],
  level: string,
): IndoorGeoJSON["features"][number] {
  return {
    type: "Feature",
    properties: { indoor: "room", stairs: "yes", level },
    geometry: { type: "Polygon", coordinates: [coords] },
  };
}

// ---------------------------------------------------------------------------

describe("coordKey", () => {
  it("rounds to 6 decimal places", () => {
    expect(coordKey(-73.5786841, 45.4973656)).toBe("-73.578684,45.497366");
  });

  it("produces the same key for identical coordinates", () => {
    expect(coordKey(WP1[0], WP1[1])).toBe(coordKey(WP1[0], WP1[1]));
  });
});

describe("haversineDistance", () => {
  it("returns 0 for identical points", () => {
    expect(haversineDistance(45.0, -73.0, 45.0, -73.0)).toBe(0);
  });

  it("returns a positive distance for distinct points", () => {
    const d = haversineDistance(45.497, -73.579, 45.497, -73.578);
    expect(d).toBeGreaterThan(0);
  });

  it("is roughly symmetric", () => {
    const d1 = haversineDistance(45.497, -73.579, 45.498, -73.578);
    const d2 = haversineDistance(45.498, -73.578, 45.497, -73.579);
    expect(Math.abs(d1 - d2)).toBeLessThan(0.001);
  });
});

// ---------------------------------------------------------------------------

describe("buildIndoorGraph – empty input", () => {
  it("returns an empty graph for an empty FeatureCollection", () => {
    const g = buildIndoorGraph(makeGeoJSON([]));
    expect(g.nodes.size).toBe(0);
    expect(g.edges).toHaveLength(0);
    expect(g.adjacency.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------

describe("buildIndoorGraph – corridor (hallway) features", () => {
  const geoJson = makeGeoJSON([corridor([WP1, WP2, WP3])]);

  it("creates a waypoint node for every corridor coordinate", () => {
    const g = buildIndoorGraph(geoJson);
    expect(g.nodes.has(coordKey(WP1[0], WP1[1]))).toBe(true);
    expect(g.nodes.has(coordKey(WP2[0], WP2[1]))).toBe(true);
    expect(g.nodes.has(coordKey(WP3[0], WP3[1]))).toBe(true);
  });

  it("assigns type 'waypoint' to all corridor nodes", () => {
    const g = buildIndoorGraph(geoJson);
    for (const node of g.nodes.values()) {
      expect(node.type).toBe("waypoint");
    }
  });

  it("creates corridor edges between consecutive waypoints", () => {
    const g = buildIndoorGraph(geoJson);
    // 3-point corridor → 2 edges, each stored bidirectionally (2 × 2 = 4 entries)
    expect(g.edges).toHaveLength(2);
  });

  it("records the correct floor on waypoint nodes", () => {
    const g = buildIndoorGraph(makeGeoJSON([corridor([WP1, WP2], "8")]));
    for (const node of g.nodes.values()) {
      expect(node.floor).toBe(8);
    }
  });

  it("sets positive edge weights", () => {
    const g = buildIndoorGraph(geoJson);
    for (const edge of g.edges) {
      expect(edge.weight).toBeGreaterThan(0);
    }
  });

  it("labels corridor edges with type 'corridor'", () => {
    const g = buildIndoorGraph(geoJson);
    for (const edge of g.edges) {
      expect(edge.type).toBe("corridor");
    }
  });

  it("builds a bidirectional adjacency list", () => {
    const g = buildIndoorGraph(geoJson);
    const wp1Id = coordKey(WP1[0], WP1[1]);
    const wp2Id = coordKey(WP2[0], WP2[1]);
    const neighborsOfWp1 = g.adjacency.get(wp1Id)!.map((e) => e.nodeId);
    const neighborsOfWp2 = g.adjacency.get(wp2Id)!.map((e) => e.nodeId);
    expect(neighborsOfWp1).toContain(wp2Id);
    expect(neighborsOfWp2).toContain(wp1Id);
  });

  it("does not duplicate nodes for shared corridor coordinates", () => {
    // Two corridors sharing WP2 as an endpoint
    const gj = makeGeoJSON([
      corridor([WP1, WP2]),
      corridor([WP2, WP3]),
    ]);
    const g = buildIndoorGraph(gj);
    expect(g.nodes.has(coordKey(WP2[0], WP2[1]))).toBe(true);
    // WP2 should be stored exactly once
    const wp2Count = [...g.nodes.keys()].filter(
      (k) => k === coordKey(WP2[0], WP2[1]),
    ).length;
    expect(wp2Count).toBe(1);
  });
});

// ---------------------------------------------------------------------------

describe("buildIndoorGraph – room features", () => {
  const geoJson = makeGeoJSON([
    corridor([WP1, WP2]),
    room(ROOM_COORDS, "H851.02"),
  ]);

  it("creates a room node with type 'room'", () => {
    const g = buildIndoorGraph(geoJson);
    const roomNode = [...g.nodes.values()].find((n) => n.type === "room");
    expect(roomNode).toBeDefined();
  });

  it("stores the room ref on the node", () => {
    const g = buildIndoorGraph(geoJson);
    const roomNode = [...g.nodes.values()].find((n) => n.type === "room");
    expect(roomNode?.ref).toBe("H851.02");
  });

  it("connects the room node to the corridor network via shared vertex", () => {
    const g = buildIndoorGraph(geoJson);
    const roomNode = [...g.nodes.values()].find((n) => n.type === "room")!;
    const neighbors = g.adjacency.get(roomNode.id)!;
    expect(neighbors.length).toBeGreaterThan(0);
    // The neighbor should be a waypoint
    const neighbor = g.nodes.get(neighbors[0].nodeId)!;
    expect(neighbor.type).toBe("waypoint");
  });

  it("assigns the correct floor to room nodes", () => {
    const g = buildIndoorGraph(makeGeoJSON([
      corridor([WP1, WP2], "8"),
      room(ROOM_COORDS, "H851.02", "8"),
    ]));
    const roomNode = [...g.nodes.values()].find((n) => n.type === "room")!;
    expect(roomNode.floor).toBe(8);
  });

  it("creates a room node even without a ref", () => {
    const g = buildIndoorGraph(makeGeoJSON([
      corridor([WP1, WP2]),
      room(ROOM_COORDS, null),
    ]));
    const roomNodes = [...g.nodes.values()].filter((n) => n.type === "room");
    expect(roomNodes).toHaveLength(1);
    expect(roomNodes[0].ref).toBeUndefined();
  });

  it("creates separate room nodes for a multi-floor room", () => {
    const g = buildIndoorGraph(makeGeoJSON([
      corridor([WP1, WP2], "1"),
      corridor([WP1, WP2], "2"),
      room(ROOM_COORDS, "H851.02", "1;2"),
    ]));
    const roomNodes = [...g.nodes.values()].filter((n) => n.type === "room");
    expect(roomNodes).toHaveLength(2);
    const floors = roomNodes.map((n) => n.floor).sort((a, b) => a - b);
    expect(floors).toEqual([1, 2]);
  });
});

// ---------------------------------------------------------------------------

describe("buildIndoorGraph – elevator features", () => {
  // Elevator polygon whose first vertex is WP1 (shared with corridor)
  const ELEV_COORDS = [WP1, [-73.5792, 45.4971], [-73.5792, 45.4969], WP1];
  const geoJson = makeGeoJSON([
    corridor([WP1, WP2], "1"),
    corridor([WP1, WP2], "9"),
    elevator(ELEV_COORDS, "1;9"),
  ]);

  it("creates one elevator node per floor served", () => {
    const g = buildIndoorGraph(geoJson);
    const elevNodes = [...g.nodes.values()].filter((n) => n.type === "elevator");
    expect(elevNodes).toHaveLength(2);
    const floors = elevNodes.map((n) => n.floor).sort((a, b) => a - b);
    expect(floors).toEqual([1, 9]);
  });

  it("creates an 'elevator' edge connecting the two floors", () => {
    const g = buildIndoorGraph(geoJson);
    const elevEdges = g.edges.filter((e) => e.type === "elevator");
    expect(elevEdges).toHaveLength(1);
  });

  it("weights the elevator edge by floor difference × penalty", () => {
    const g = buildIndoorGraph(geoJson);
    const elevEdge = g.edges.find((e) => e.type === "elevator")!;
    // 8 floors apart × 5 m/floor = 40 m
    expect(elevEdge.weight).toBe(40);
  });

  it("connects elevator nodes to the corridor network", () => {
    const g = buildIndoorGraph(geoJson);
    const elevNode = [...g.nodes.values()].find(
      (n) => n.type === "elevator" && n.floor === 1,
    )!;
    const corridorNeighbors = g.adjacency
      .get(elevNode.id)!
      .filter((e) => e.type === "corridor");
    expect(corridorNeighbors.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------

describe("buildIndoorGraph – staircase features", () => {
  const STAIR_COORDS = [WP1, [-73.5792, 45.4971], [-73.5792, 45.4969], WP1];
  const geoJson = makeGeoJSON([
    corridor([WP1, WP2], "1"),
    corridor([WP1, WP2], "2"),
    corridor([WP1, WP2], "3"),
    staircase(STAIR_COORDS, "1;2;3"),
  ]);

  it("creates one staircase node per floor served", () => {
    const g = buildIndoorGraph(geoJson);
    const stairNodes = [...g.nodes.values()].filter((n) => n.type === "staircase");
    expect(stairNodes).toHaveLength(3);
  });

  it("creates staircase edges only between adjacent floors", () => {
    const g = buildIndoorGraph(geoJson);
    const stairEdges = g.edges.filter((e) => e.type === "staircase");
    // floors [1,2,3] → adjacent pairs: (1,2) and (2,3) → 2 edges
    expect(stairEdges).toHaveLength(2);
  });

  it("labels staircase edges with type 'staircase'", () => {
    const g = buildIndoorGraph(geoJson);
    for (const edge of g.edges.filter((e) => e.type === "staircase")) {
      expect(edge.type).toBe("staircase");
    }
  });

  it("weights staircase edges by floor difference × penalty", () => {
    const g = buildIndoorGraph(geoJson);
    const stairEdges = g.edges.filter((e) => e.type === "staircase");
    // Each adjacent pair is 1 floor apart × 10 m/floor = 10 m
    for (const edge of stairEdges) {
      expect(edge.weight).toBe(10);
    }
  });

  it("connects staircase nodes to the corridor network", () => {
    const g = buildIndoorGraph(geoJson);
    const stairNode = [...g.nodes.values()].find(
      (n) => n.type === "staircase" && n.floor === 1,
    )!;
    const corridorNeighbors = g.adjacency
      .get(stairNode.id)!
      .filter((e) => e.type === "corridor");
    expect(corridorNeighbors.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------

describe("buildIndoorGraph – multi-floor connectivity", () => {
  it("a room on floor 1 can reach a room on floor 9 via elevator", () => {
    const ELEV_COORDS = [WP2, [-73.5785, 45.4971], [-73.5785, 45.4969], WP2];
    const ROOM_A = [WP1, [-73.5791, 45.4971], [-73.5791, 45.4969], WP1];
    // Room B on floor 9 shares WP3 with floor-9 corridor
    const ROOM_B = [WP3, [-73.5769, 45.4971], [-73.5769, 45.4969], WP3];

    const geoJson = makeGeoJSON([
      corridor([WP1, WP2], "1"),
      corridor([WP2, WP3], "9"),
      elevator(ELEV_COORDS, "1;9"),
      room(ROOM_A, "H101", "1"),
      room(ROOM_B, "H901", "9"),
    ]);

    const g = buildIndoorGraph(geoJson);

    // Both rooms should exist
    const roomNodes = [...g.nodes.values()].filter((n) => n.type === "room");
    expect(roomNodes.some((n) => n.ref === "H101")).toBe(true);
    expect(roomNodes.some((n) => n.ref === "H901")).toBe(true);

    // Elevator should have nodes on both floors
    const elevNodes = [...g.nodes.values()].filter((n) => n.type === "elevator");
    expect(elevNodes.map((n) => n.floor).sort((a, b) => a - b)).toEqual([1, 9]);

    // There should be an elevator edge
    expect(g.edges.some((e) => e.type === "elevator")).toBe(true);
  });
});

// ---------------------------------------------------------------------------

describe("buildIndoorGraph – integration with real hall.json", () => {
  // Dynamically import to avoid pulling in all JSON in every test
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const hallData = require("@/constants/indoorData/hall.json") as IndoorGeoJSON;

  it("produces a non-empty graph from hall.json", () => {
    const g = buildIndoorGraph(hallData);
    expect(g.nodes.size).toBeGreaterThan(0);
    expect(g.edges.length).toBeGreaterThan(0);
  });

  it("contains room nodes for known hall rooms", () => {
    const g = buildIndoorGraph(hallData);
    const roomRefs = [...g.nodes.values()]
      .filter((n) => n.type === "room")
      .map((n) => n.ref);
    expect(roomRefs).toContain("H851.02");
  });

  it("contains waypoint nodes (corridors)", () => {
    const g = buildIndoorGraph(hallData);
    const waypoints = [...g.nodes.values()].filter((n) => n.type === "waypoint");
    expect(waypoints.length).toBeGreaterThan(0);
  });

  it("contains elevator nodes", () => {
    const g = buildIndoorGraph(hallData);
    const elevators = [...g.nodes.values()].filter((n) => n.type === "elevator");
    expect(elevators.length).toBeGreaterThan(0);
  });

  it("all edges reference existing nodes", () => {
    const g = buildIndoorGraph(hallData);
    for (const edge of g.edges) {
      expect(g.nodes.has(edge.from)).toBe(true);
      expect(g.nodes.has(edge.to)).toBe(true);
    }
  });

  it("all edge weights are positive", () => {
    const g = buildIndoorGraph(hallData);
    for (const edge of g.edges) {
      expect(edge.weight).toBeGreaterThan(0);
    }
  });

  it("adjacency list is consistent with edge list", () => {
    const g = buildIndoorGraph(hallData);
    for (const edge of g.edges) {
      const fromAdj = g.adjacency.get(edge.from)!;
      const toAdj = g.adjacency.get(edge.to)!;
      expect(fromAdj.some((e) => e.nodeId === edge.to)).toBe(true);
      expect(toAdj.some((e) => e.nodeId === edge.from)).toBe(true);
    }
  });
});
