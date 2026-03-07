import { buildIndoorGraph, IndoorGraph, GraphNode, NodeType, EdgeType } from "../indoorGraphService";
import { findIndoorPath } from "../indoorPathService";
import hallData from "@/constants/indoorData/hall.json";
import { IndoorGeoJSON } from "@/app/types/indoorMap";

// ── Helpers ────────────────────────────────────────────────────────────────

function makeSimpleGraph(): IndoorGraph {
  // A → B → C (all on floor 1)
  // A and C are rooms; B is a waypoint between them
  const nodes = new Map<string, GraphNode>([
    ["room:A:1", { id: "room:A:1", lat: 0, lng: 0, floor: 1, type: NodeType.Room, ref: "A" }],
    ["wp:B",     { id: "wp:B",     lat: 0, lng: 1, floor: 1, type: NodeType.Waypoint }],
    ["room:C:1", { id: "room:C:1", lat: 0, lng: 2, floor: 1, type: NodeType.Room, ref: "C" }],
  ]);

  const adjacency = new Map([
    ["room:A:1", [{ nodeId: "wp:B",     weight: 1, type: EdgeType.Corridor }]],
    ["wp:B",     [{ nodeId: "room:A:1", weight: 1, type: EdgeType.Corridor },
                  { nodeId: "room:C:1", weight: 1, type: EdgeType.Corridor }]],
    ["room:C:1", [{ nodeId: "wp:B",     weight: 1, type: EdgeType.Corridor }]],
  ]);

  return { nodes, edges: [], adjacency };
}

function makeDisconnectedGraph(): IndoorGraph {
  // A and B are rooms with no edges between them
  const nodes = new Map<string, GraphNode>([
    ["room:A:1", { id: "room:A:1", lat: 0, lng: 0, floor: 1, type: NodeType.Room, ref: "A" }],
    ["room:B:1", { id: "room:B:1", lat: 0, lng: 1, floor: 1, type: NodeType.Room, ref: "B" }],
  ]);
  const adjacency = new Map([
    ["room:A:1", []],
    ["room:B:1", []],
  ]);
  return { nodes, edges: [], adjacency };
}

// ── findIndoorPath unit tests ───────────────────────────────────────────────

describe("findIndoorPath", () => {
  describe("basic path finding", () => {
    it("returns a path between two connected rooms", () => {
      // Arrange
      const graph = makeSimpleGraph();

      // Act
      const path = findIndoorPath(graph, "A", "C");

      // Assert
      expect(path).not.toBeNull();
      expect(path![0].ref).toBe("A");
      expect(path![path!.length - 1].ref).toBe("C");
    });

    it("path visits intermediate waypoint node", () => {
      // Arrange
      const graph = makeSimpleGraph();

      // Act
      const path = findIndoorPath(graph, "A", "C");

      // Assert — A → wp:B → C
      expect(path).toHaveLength(3);
      expect(path![1].id).toBe("wp:B");
    });

    it("returns single-node path when start equals destination", () => {
      // Arrange
      const graph = makeSimpleGraph();

      // Act
      const path = findIndoorPath(graph, "A", "A");

      // Assert
      expect(path).toHaveLength(1);
      expect(path![0].ref).toBe("A");
    });
  });

  describe("no path / missing nodes", () => {
    it.each([
      ["destination is unreachable",  () => makeDisconnectedGraph(), "A",           "B"],
      ["start ref does not exist",    () => makeSimpleGraph(),       "NONEXISTENT", "C"],
      ["destination ref doesn't exist", () => makeSimpleGraph(),     "A",           "NONEXISTENT"],
      ["both refs are nonexistent",   () => makeSimpleGraph(),       "X",           "Y"],
    ])("returns null when %s", (_label, buildGraph, start, dest) => {
      // Arrange
      const graph = buildGraph();

      // Act
      const path = findIndoorPath(graph, start, dest);

      // Assert
      expect(path).toBeNull();
    });
  });

  describe("path optimality", () => {
    it("chooses the shorter of two routes", () => {
      // Arrange: A → short → B (weight 1) and A → long → B (weight 10)
      const nodes = new Map<string, GraphNode>([
        ["room:A:1",    { id: "room:A:1",    lat: 0, lng: 0, floor: 1, type: NodeType.Room, ref: "A" }],
        ["wp:short",    { id: "wp:short",    lat: 0, lng: 1, floor: 1, type: NodeType.Waypoint }],
        ["wp:long",     { id: "wp:long",     lat: 0, lng: 5, floor: 1, type: NodeType.Waypoint }],
        ["room:B:1",    { id: "room:B:1",    lat: 0, lng: 2, floor: 1, type: NodeType.Room, ref: "B" }],
      ]);
      const adjacency = new Map([
        ["room:A:1", [{ nodeId: "wp:short", weight: 1, type: EdgeType.Corridor },
                      { nodeId: "wp:long",  weight: 10, type: EdgeType.Corridor }]],
        ["wp:short", [{ nodeId: "room:A:1", weight: 1, type: EdgeType.Corridor },
                      { nodeId: "room:B:1", weight: 1, type: EdgeType.Corridor }]],
        ["wp:long",  [{ nodeId: "room:A:1", weight: 10, type: EdgeType.Corridor },
                      { nodeId: "room:B:1", weight: 10, type: EdgeType.Corridor }]],
        ["room:B:1", [{ nodeId: "wp:short", weight: 1, type: EdgeType.Corridor },
                      { nodeId: "wp:long",  weight: 10, type: EdgeType.Corridor }]],
      ]);
      const graph: IndoorGraph = { nodes, edges: [], adjacency };

      // Act
      const path = findIndoorPath(graph, "A", "B");

      // Assert — should go through short waypoint, not long
      expect(path).not.toBeNull();
      expect(path!.some((n) => n.id === "wp:short")).toBe(true);
      expect(path!.some((n) => n.id === "wp:long")).toBe(false);
    });
  });

  describe("integration with real hall.json data", () => {
    let graph: IndoorGraph;

    beforeAll(() => {
      graph = buildIndoorGraph(hallData as unknown as IndoorGeoJSON);
    });

    it("finds a path between two known Hall rooms", () => {
      // Arrange — H851.02 and H857 are both on floor 8
      const path = findIndoorPath(graph, "H851.02", "H857");

      // Assert
      expect(path).not.toBeNull();
      expect(path!.length).toBeGreaterThan(1);
      expect(path![0].ref).toBe("H851.02");
      expect(path![path!.length - 1].ref).toBe("H857");
    });

    it("path nodes all have positive floor numbers", () => {
      // Arrange
      const path = findIndoorPath(graph, "H851.02", "H857");

      // Assert
      expect(path).not.toBeNull();
      for (const node of path!) {
        expect(node.floor).toBeGreaterThanOrEqual(1);
      }
    });

    it("returns null for a ref that does not exist in hall.json", () => {
      // Arrange + Act
      const path = findIndoorPath(graph, "H851.02", "H-FAKE-999");

      // Assert
      expect(path).toBeNull();
    });
  });
});
