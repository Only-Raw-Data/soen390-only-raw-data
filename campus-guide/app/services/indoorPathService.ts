import { IndoorGraph, GraphNode, EdgeType, NodeType } from "./indoorGraphService";

function findNodeByRef(
  graph: IndoorGraph,
  ref: string,
): GraphNode | undefined {
  for (const node of graph.nodes.values()) {
    if (node.ref === ref) return node;
  }
  return undefined;
}

function extractMin(queue: Array<{ id: string; cost: number }>): string {
  let minIdx = 0;
  for (let i = 1; i < queue.length; i++) {
    if (queue[i].cost < queue[minIdx].cost) minIdx = i;
  }
  return queue.splice(minIdx, 1)[0].id;
}

function relaxNeighbors(
  currentId: string,
  graph: IndoorGraph,
  dist: Map<string, number>,
  prev: Map<string, string | null>,
  visited: Set<string>,
  queue: Array<{ id: string; cost: number }>,
  accessible: boolean,
): void {
  const currentDist = dist.get(currentId) ?? Infinity;
  for (const { nodeId, weight, type } of graph.adjacency.get(currentId) ?? []) {
    if (visited.has(nodeId)) continue;
    if (accessible && type === EdgeType.Staircase) continue;
    const newCost = currentDist + weight;
    if (newCost < (dist.get(nodeId) ?? Infinity)) {
      dist.set(nodeId, newCost);
      prev.set(nodeId, currentId);
      queue.push({ id: nodeId, cost: newCost });
    }
  }
}

function reconstructPath(
  destId: string,
  graph: IndoorGraph,
  prev: Map<string, string | null>,
): GraphNode[] {
  const path: GraphNode[] = [];
  let current: string | null = destId;
  while (current !== null) {
    const node = graph.nodes.get(current);
    if (!node) break;
    path.unshift(node);
    current = prev.get(current) ?? null;
  }
  return path;
}

/**
 * Core Dijkstra: finds the shortest path between two resolved nodes.
 * Shared by findIndoorPath and findIndoorPathFromNodeId.
 */
function dijkstraPath(
  graph: IndoorGraph,
  startNode: GraphNode,
  destNode: GraphNode,
  accessible: boolean,
): GraphNode[] | null {
  if (startNode.id === destNode.id) return [startNode];

  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const visited = new Set<string>();

  for (const id of graph.nodes.keys()) {
    dist.set(id, Infinity);
    prev.set(id, null);
  }
  dist.set(startNode.id, 0);

  const queue: Array<{ id: string; cost: number }> = [
    { id: startNode.id, cost: 0 },
  ];

  while (queue.length > 0) {
    const currentId = extractMin(queue);
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    if (currentId === destNode.id) break;
    relaxNeighbors(currentId, graph, dist, prev, visited, queue, accessible);
  }

  if ((dist.get(destNode.id) ?? Infinity) === Infinity) return null;

  return reconstructPath(destNode.id, graph, prev);
}

/**
 * Finds the shortest path between two rooms in an indoor graph using Dijkstra's algorithm.
 *
 * @param graph - The indoor navigation graph built from GeoJSON data
 * @param startRef - The room reference of the start room (e.g. "H851.02")
 * @param destRef  - The room reference of the destination room (e.g. "H820")
 * @param accessible - When true, excludes staircase edges (uses elevators/ramps only)
 * @returns Ordered array of GraphNodes from start to destination, or null if no path exists
 */
export function findIndoorPath(
  graph: IndoorGraph,
  startRef: string,
  destRef: string,
  accessible = false,
): GraphNode[] | null {
  const startNode = findNodeByRef(graph, startRef);
  const destNode = findNodeByRef(graph, destRef);
  if (!startNode || !destNode) return null;
  return dijkstraPath(graph, startNode, destNode, accessible);
}

/**
 * Finds the shortest path from a start node (by ID) to a destination room (by ref).
 * Used when the start point is the user's current GPS location mapped to the nearest node.
 */
export function findIndoorPathFromNodeId(
  graph: IndoorGraph,
  startNodeId: string,
  destRef: string,
  accessible = false,
): GraphNode[] | null {
  const startNode = graph.nodes.get(startNodeId);
  const destNode = findNodeByRef(graph, destRef);
  if (!startNode || !destNode) return null;
  return dijkstraPath(graph, startNode, destNode, accessible);
}

/**
 * Finds the shortest path from a room (by ref) to the nearest entrance node.
 * Uses Dijkstra, terminating when any Entrance node is reached.
 */
export function findPathToNearestEntrance(
  graph: IndoorGraph,
  startRef: string,
  accessible = false,
): GraphNode[] | null {
  const startNode = findNodeByRef(graph, startRef);
  if (!startNode) return null;

  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const visited = new Set<string>();

  for (const id of graph.nodes.keys()) {
    dist.set(id, Infinity);
    prev.set(id, null);
  }
  dist.set(startNode.id, 0);

  const queue: Array<{ id: string; cost: number }> = [
    { id: startNode.id, cost: 0 },
  ];

  while (queue.length > 0) {
    const currentId = extractMin(queue);
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const currentNode = graph.nodes.get(currentId);
    if (currentNode?.type === NodeType.Entrance && currentId !== startNode.id) {
      return reconstructPath(currentId, graph, prev);
    }

    relaxNeighbors(currentId, graph, dist, prev, visited, queue, accessible);
  }

  return null;
}

/**
 * Finds the shortest path from any entrance node to a destination room (by ref).
 * Runs Dijkstra from the destination backwards, then picks the nearest entrance.
 */
export function findPathFromEntrance(
  graph: IndoorGraph,
  destRef: string,
  accessible = false,
): GraphNode[] | null {
  const destNode = findNodeByRef(graph, destRef);
  if (!destNode) return null;

  // Run Dijkstra from destination (graph is bidirectional, so this finds
  // shortest distances from dest to all nodes, including entrances).
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const visited = new Set<string>();

  for (const id of graph.nodes.keys()) {
    dist.set(id, Infinity);
    prev.set(id, null);
  }
  dist.set(destNode.id, 0);

  const queue: Array<{ id: string; cost: number }> = [
    { id: destNode.id, cost: 0 },
  ];

  while (queue.length > 0) {
    const currentId = extractMin(queue);
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    relaxNeighbors(currentId, graph, dist, prev, visited, queue, accessible);
  }

  // Find the entrance with the shortest distance from dest
  let bestEntrance: string | null = null;
  let bestCost = Infinity;
  for (const node of graph.nodes.values()) {
    if (node.type !== NodeType.Entrance) continue;
    const cost = dist.get(node.id) ?? Infinity;
    if (cost < bestCost) {
      bestCost = cost;
      bestEntrance = node.id;
    }
  }

  if (!bestEntrance || bestCost === Infinity) return null;

  // Reconstruct path from entrance to dest (reverse the prev chain from dest-rooted Dijkstra)
  const reversePath = reconstructPath(bestEntrance, graph, prev);
  reversePath.reverse();
  return reversePath;
}
