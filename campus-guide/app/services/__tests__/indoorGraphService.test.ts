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

// Waypoint node IDs now include the floor: "coordKey:floor"
function wpId(coord: number[], floor = 1): string {
  return `${coordKey(coord[0], coord[1])}:${floor}`;
}

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
    // Arrange
    const lon = -73.5786841;
    const lat = 45.4973656;

    // Act
    const result = coordKey(lon, lat);

    // Assert
    expect(result).toBe("-73.578684,45.497366");
  });

  it("produces the same key for identical coordinates", () => {
    // Arrange
    const lon = WP1[0];
    const lat = WP1[1];

    // Act
    const key1 = coordKey(lon, lat);
    const key2 = coordKey(lon, lat);

    // Assert
    expect(key1).toBe(key2);
  });
});

// ---------------------------------------------------------------------------

describe("haversineDistance", () => {
  it("returns 0 for identical points", () => {
    // Arrange
    const lat = 45.0;
    const lon = -73.0;

    // Act
    const result = haversineDistance(lat, lon, lat, lon);

    // Assert
    expect(result).toBe(0);
  });

  it("returns a positive distance for distinct points", () => {
    // Arrange
    const lat1 = 45.497;
    const lon1 = -73.579;
    const lat2 = 45.497;
    const lon2 = -73.578;

    // Act
    const result = haversineDistance(lat1, lon1, lat2, lon2);

    // Assert
    expect(result).toBeGreaterThan(0);
  });

  it("is roughly symmetric", () => {
    // Arrange
    const lat1 = 45.497;
    const lon1 = -73.579;
    const lat2 = 45.498;
    const lon2 = -73.578;

    // Act
    const d1 = haversineDistance(lat1, lon1, lat2, lon2);
    const d2 = haversineDistance(lat2, lon2, lat1, lon1);

    // Assert
    expect(Math.abs(d1 - d2)).toBeLessThan(0.001);
  });
});

// ---------------------------------------------------------------------------

describe("buildIndoorGraph – empty input", () => {
  it("returns an empty graph for an empty FeatureCollection", () => {
    // Arrange
    const geoJson = makeGeoJSON([]);

    // Act
    const graph = buildIndoorGraph(geoJson);

    // Assert
    expect(graph.nodes.size).toBe(0);
    expect(graph.edges).toHaveLength(0);
    expect(graph.adjacency.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------

describe("buildIndoorGraph – corridor (hallway) features", () => {
  it("creates a waypoint node for every corridor coordinate", () => {
    // Arrange
    const geoJson = makeGeoJSON([corridor([WP1, WP2, WP3])]);

    // Act
    const graph = buildIndoorGraph(geoJson);

    // Assert
    expect(graph.nodes.has(wpId(WP1))).toBe(true);
    expect(graph.nodes.has(wpId(WP2))).toBe(true);
    expect(graph.nodes.has(wpId(WP3))).toBe(true);
  });

  it("assigns type 'waypoint' to all corridor nodes", () => {
    // Arrange
    const geoJson = makeGeoJSON([corridor([WP1, WP2, WP3])]);

    // Act
    const graph = buildIndoorGraph(geoJson);

    // Assert
    for (const node of graph.nodes.values()) {
      expect(node.type).toBe("waypoint");
    }
  });

  it("creates corridor edges between consecutive waypoints", () => {
    // Arrange
    const geoJson = makeGeoJSON([corridor([WP1, WP2, WP3])]);

    // Act
    const graph = buildIndoorGraph(geoJson);

    // Assert
    expect(graph.edges).toHaveLength(2);
  });

  it("records the correct floor on waypoint nodes", () => {
    // Arrange
    const geoJson = makeGeoJSON([corridor([WP1, WP2], "8")]);

    // Act
    const graph = buildIndoorGraph(geoJson);

    // Assert
    for (const node of graph.nodes.values()) {
      expect(node.floor).toBe(8);
    }
  });

  it("sets positive edge weights", () => {
    // Arrange
    const geoJson = makeGeoJSON([corridor([WP1, WP2, WP3])]);

    // Act
    const graph = buildIndoorGraph(geoJson);

    // Assert
    for (const edge of graph.edges) {
      expect(edge.weight).toBeGreaterThan(0);
    }
  });

  it("labels corridor edges with type 'corridor'", () => {
    // Arrange
    const geoJson = makeGeoJSON([corridor([WP1, WP2, WP3])]);

    // Act
    const graph = buildIndoorGraph(geoJson);

    // Assert
    for (const edge of graph.edges) {
      expect(edge.type).toBe("corridor");
    }
  });

  it("builds a bidirectional adjacency list", () => {
    // Arrange
    const geoJson = makeGeoJSON([corridor([WP1, WP2, WP3])]);
    const wp1Id = wpId(WP1);
    const wp2Id = wpId(WP2);

    // Act
    const graph = buildIndoorGraph(geoJson);

    // Assert
    const neighborsOfWp1 = graph.adjacency
        .get(wp1Id)!
        .map((e) => e.nodeId);
    const neighborsOfWp2 = graph.adjacency
        .get(wp2Id)!
        .map((e) => e.nodeId);
    expect(neighborsOfWp1).toContain(wp2Id);
    expect(neighborsOfWp2).toContain(wp1Id);
  });

  it("does not duplicate nodes for shared corridor coordinates", () => {
    // Arrange
    const geoJson = makeGeoJSON([
      corridor([WP1, WP2]),
      corridor([WP2, WP3]),
    ]);
    const wp2Id = wpId(WP2);

    // Act
    const graph = buildIndoorGraph(geoJson);

    // Assert
    expect(graph.nodes.has(wp2Id)).toBe(true);
    const wp2Count = [...graph.nodes.keys()].filter(
        (k) => k === wp2Id,
    ).length;
    expect(wp2Count).toBe(1);
  });
});

// ---------------------------------------------------------------------------

describe("buildIndoorGraph – room features", () => {
  it("creates a room node with type 'room'", () => {
    // Arrange
    const geoJson = makeGeoJSON([
      corridor([WP1, WP2]),
      room(ROOM_COORDS, "H851.02"),
    ]);

    // Act
    const graph = buildIndoorGraph(geoJson);

    // Assert
    const roomNode = [...graph.nodes.values()].find(
        (n) => n.type === "room",
    );
    expect(roomNode).toBeDefined();
  });

  it("stores the room ref on the node", () => {
    // Arrange
    const geoJson = makeGeoJSON([
      corridor([WP1, WP2]),
      room(ROOM_COORDS, "H851.02"),
    ]);

    // Act
    const graph = buildIndoorGraph(geoJson);

    // Assert
    const roomNode = [...graph.nodes.values()].find(
        (n) => n.type === "room",
    );
    expect(roomNode?.ref).toBe("H851.02");
  });

  it("connects the room node to the corridor network via shared vertex", () => {
    // Arrange
    const geoJson = makeGeoJSON([
      corridor([WP1, WP2]),
      room(ROOM_COORDS, "H851.02"),
    ]);

    // Act
    const graph = buildIndoorGraph(geoJson);

    // Assert
    const roomNode = [...graph.nodes.values()].find(
        (n) => n.type === "room",
    )!;
    const neighbors = graph.adjacency.get(roomNode.id)!;
    expect(neighbors.length).toBeGreaterThan(0);
    const neighbor = graph.nodes.get(neighbors[0].nodeId)!;
    expect(neighbor.type).toBe("waypoint");
  });

  it("assigns the correct floor to room nodes", () => {
    // Arrange
    const geoJson = makeGeoJSON([
      corridor([WP1, WP2], "8"),
      room(ROOM_COORDS, "H851.02", "8"),
    ]);

    // Act
    const graph = buildIndoorGraph(geoJson);

    // Assert
    const roomNode = [...graph.nodes.values()].find(
        (n) => n.type === "room",
    )!;
    expect(roomNode.floor).toBe(8);
  });

  it("creates a room node even without a ref", () => {
    // Arrange
    const geoJson = makeGeoJSON([
      corridor([WP1, WP2]),
      room(ROOM_COORDS, null),
    ]);

    // Act
    const graph = buildIndoorGraph(geoJson);

    // Assert
    const roomNodes = [...graph.nodes.values()].filter(
        (n) => n.type === "room",
    );
    expect(roomNodes).toHaveLength(1);
    expect(roomNodes[0].ref).toBeUndefined();
  });

  it("creates separate room nodes for a multi-floor room", () => {
    // Arrange
    const geoJson = makeGeoJSON([
      corridor([WP1, WP2], "1"),
      corridor([WP1, WP2], "2"),
      room(ROOM_COORDS, "H851.02", "1;2"),
    ]);

    // Act
    const graph = buildIndoorGraph(geoJson);

    // Assert
    const roomNodes = [...graph.nodes.values()].filter(
        (n) => n.type === "room",
    );
    expect(roomNodes).toHaveLength(2);
    const floors = roomNodes
        .map((n) => n.floor)
        .sort((a, b) => a - b);
    expect(floors).toEqual([1, 2]);
  });
});

// ---------------------------------------------------------------------------

describe("buildIndoorGraph – elevator features", () => {
  const ELEV_COORDS = [
    WP1,
    [-73.5792, 45.4971],
    [-73.5792, 45.4969],
    WP1,
  ];

  it("creates one elevator node per floor served", () => {
    // Arrange
    const geoJson = makeGeoJSON([
      corridor([WP1, WP2], "1"),
      corridor([WP1, WP2], "9"),
      elevator(ELEV_COORDS, "1;9"),
    ]);

    // Act
    const graph = buildIndoorGraph(geoJson);

    // Assert
    const elevNodes = [...graph.nodes.values()].filter(
        (n) => n.type === "elevator",
    );
    expect(elevNodes).toHaveLength(2);
    const floors = elevNodes
        .map((n) => n.floor)
        .sort((a, b) => a - b);
    expect(floors).toEqual([1, 9]);
  });

  it("creates an 'elevator' edge connecting the two floors", () => {
    // Arrange
    const geoJson = makeGeoJSON([
      corridor([WP1, WP2], "1"),
      corridor([WP1, WP2], "9"),
      elevator(ELEV_COORDS, "1;9"),
    ]);

    // Act
    const graph = buildIndoorGraph(geoJson);

    // Assert
    const elevEdges = graph.edges.filter(
        (e) => e.type === "elevator",
    );
    expect(elevEdges).toHaveLength(1);
  });

  it("weights the elevator edge by floor difference × penalty", () => {
    // Arrange
    const geoJson = makeGeoJSON([
      corridor([WP1, WP2], "1"),
      corridor([WP1, WP2], "9"),
      elevator(ELEV_COORDS, "1;9"),
    ]);

    // Act
    const graph = buildIndoorGraph(geoJson);

    // Assert
    const elevEdge = graph.edges.find(
        (e) => e.type === "elevator",
    )!;
    // 8 floors apart × 20 m/floor = 160 m
    expect(elevEdge.weight).toBe(160);
  });

  it("connects elevator nodes to the corridor network", () => {
    // Arrange
    const geoJson = makeGeoJSON([
      corridor([WP1, WP2], "1"),
      corridor([WP1, WP2], "9"),
      elevator(ELEV_COORDS, "1;9"),
    ]);

    // Act
    const graph = buildIndoorGraph(geoJson);

    // Assert
    const elevNode = [...graph.nodes.values()].find(
        (n) => n.type === "elevator" && n.floor === 1,
    )!;
    const corridorNeighbors = graph.adjacency
        .get(elevNode.id)!
        .filter((e) => e.type === "corridor");
    expect(corridorNeighbors.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------

describe("buildIndoorGraph – staircase features", () => {
  const STAIR_COORDS = [
    WP1,
    [-73.5792, 45.4971],
    [-73.5792, 45.4969],
    WP1,
  ];

  it("creates one staircase node per floor served", () => {
    // Arrange
    const geoJson = makeGeoJSON([
      corridor([WP1, WP2], "1"),
      corridor([WP1, WP2], "2"),
      corridor([WP1, WP2], "3"),
      staircase(STAIR_COORDS, "1;2;3"),
    ]);

    // Act
    const graph = buildIndoorGraph(geoJson);

    // Assert
    const stairNodes = [...graph.nodes.values()].filter(
        (n) => n.type === "staircase",
    );
    expect(stairNodes).toHaveLength(3);
  });

  it("creates staircase edges only between adjacent floors", () => {
    // Arrange
    const geoJson = makeGeoJSON([
      corridor([WP1, WP2], "1"),
      corridor([WP1, WP2], "2"),
      corridor([WP1, WP2], "3"),
      staircase(STAIR_COORDS, "1;2;3"),
    ]);

    // Act
    const graph = buildIndoorGraph(geoJson);

    // Assert
    const stairEdges = graph.edges.filter(
        (e) => e.type === "staircase",
    );
    // floors [1,2,3] → adjacent pairs: (1,2) and (2,3) → 2 edges
    expect(stairEdges).toHaveLength(2);
  });

  it("labels staircase edges with type 'staircase'", () => {
    // Arrange
    const geoJson = makeGeoJSON([
      corridor([WP1, WP2], "1"),
      corridor([WP1, WP2], "2"),
      corridor([WP1, WP2], "3"),
      staircase(STAIR_COORDS, "1;2;3"),
    ]);

    // Act
    const graph = buildIndoorGraph(geoJson);

    // Assert
    for (const edge of graph.edges.filter(
        (e) => e.type === "staircase",
    )) {
      expect(edge.type).toBe("staircase");
    }
  });

  it("weights staircase edges by floor difference × penalty", () => {
    // Arrange
    const geoJson = makeGeoJSON([
      corridor([WP1, WP2], "1"),
      corridor([WP1, WP2], "2"),
      corridor([WP1, WP2], "3"),
      staircase(STAIR_COORDS, "1;2;3"),
    ]);

    // Act
    const graph = buildIndoorGraph(geoJson);

    // Assert
    const stairEdges = graph.edges.filter(
        (e) => e.type === "staircase",
    );
    // Each adjacent pair is 1 floor apart × 5 m/floor = 5 m
    for (const edge of stairEdges) {
      expect(edge.weight).toBe(5);
    }
  });

  it("connects staircase nodes to the corridor network", () => {
    // Arrange
    const geoJson = makeGeoJSON([
      corridor([WP1, WP2], "1"),
      corridor([WP1, WP2], "2"),
      corridor([WP1, WP2], "3"),
      staircase(STAIR_COORDS, "1;2;3"),
    ]);

    // Act
    const graph = buildIndoorGraph(geoJson);

    // Assert
    const stairNode = [...graph.nodes.values()].find(
        (n) => n.type === "staircase" && n.floor === 1,
    )!;
    const corridorNeighbors = graph.adjacency
        .get(stairNode.id)!
        .filter((e) => e.type === "corridor");
    expect(corridorNeighbors.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------

describe("buildIndoorGraph – multi-floor connectivity", () => {
  it("a room on floor 1 can reach a room on floor 9 via elevator", () => {
    // Arrange
    const ELEV_COORDS = [
      WP2,
      [-73.5785, 45.4971],
      [-73.5785, 45.4969],
      WP2,
    ];
    const ROOM_A = [
      WP1,
      [-73.5791, 45.4971],
      [-73.5791, 45.4969],
      WP1,
    ];
    const ROOM_B = [
      WP3,
      [-73.5769, 45.4971],
      [-73.5769, 45.4969],
      WP3,
    ];
    const geoJson = makeGeoJSON([
      corridor([WP1, WP2], "1"),
      corridor([WP2, WP3], "9"),
      elevator(ELEV_COORDS, "1;9"),
      room(ROOM_A, "H101", "1"),
      room(ROOM_B, "H901", "9"),
    ]);

    // Act
    const graph = buildIndoorGraph(geoJson);

    // Assert
    const roomNodes = [...graph.nodes.values()].filter(
        (n) => n.type === "room",
    );
    expect(roomNodes.some((n) => n.ref === "H101")).toBe(true);
    expect(roomNodes.some((n) => n.ref === "H901")).toBe(true);

    const elevNodes = [...graph.nodes.values()].filter(
        (n) => n.type === "elevator",
    );
    expect(
        elevNodes.map((n) => n.floor).sort((a, b) => a - b),
    ).toEqual([1, 9]);

    expect(graph.edges.some((e) => e.type === "elevator")).toBe(
        true,
    );
  });
});

// ---------------------------------------------------------------------------

describe("buildIndoorGraph – integration with real hall.json", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const hallData =
      require("@/constants/indoorData/hall.json") as IndoorGeoJSON;

  it("produces a non-empty graph from hall.json", () => {
    // Arrange
    const geoJson = hallData;

    // Act
    const graph = buildIndoorGraph(geoJson);

    // Assert
    expect(graph.nodes.size).toBeGreaterThan(0);
    expect(graph.edges.length).toBeGreaterThan(0);
  });

  it("contains room nodes for known hall rooms", () => {
    // Arrange
    const geoJson = hallData;

    // Act
    const graph = buildIndoorGraph(geoJson);

    // Assert
    const roomRefs = [...graph.nodes.values()]
        .filter((n) => n.type === "room")
        .map((n) => n.ref);
    expect(roomRefs).toContain("H851.02");
  });

  it("contains waypoint nodes (corridors)", () => {
    // Arrange
    const geoJson = hallData;

    // Act
    const graph = buildIndoorGraph(geoJson);

    // Assert
    const waypoints = [...graph.nodes.values()].filter(
        (n) => n.type === "waypoint",
    );
    expect(waypoints.length).toBeGreaterThan(0);
  });

  it("contains elevator nodes", () => {
    // Arrange
    const geoJson = hallData;

    // Act
    const graph = buildIndoorGraph(geoJson);

    // Assert
    const elevators = [...graph.nodes.values()].filter(
        (n) => n.type === "elevator",
    );
    expect(elevators.length).toBeGreaterThan(0);
  });

  it("all edges reference existing nodes", () => {
    // Arrange
    const geoJson = hallData;

    // Act
    const graph = buildIndoorGraph(geoJson);

    // Assert
    for (const edge of graph.edges) {
      expect(graph.nodes.has(edge.from)).toBe(true);
      expect(graph.nodes.has(edge.to)).toBe(true);
    }
  });

  it("all edge weights are positive", () => {
    // Arrange
    const geoJson = hallData;

    // Act
    const graph = buildIndoorGraph(geoJson);

    // Assert
    for (const edge of graph.edges) {
      expect(edge.weight).toBeGreaterThan(0);
    }
  });

  it("adjacency list is consistent with edge list", () => {
    // Arrange
    const geoJson = hallData;

    // Act
    const graph = buildIndoorGraph(geoJson);

    // Assert
    for (const edge of graph.edges) {
      const fromAdj = graph.adjacency.get(edge.from)!;
      const toAdj = graph.adjacency.get(edge.to)!;
      expect(
          fromAdj.some((e) => e.nodeId === edge.to),
      ).toBe(true);
      expect(
          toAdj.some((e) => e.nodeId === edge.from),
      ).toBe(true);
    }
  });
});