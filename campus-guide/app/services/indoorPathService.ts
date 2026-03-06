import { IndoorGraph, GraphNode } from "./indoorGraphService";

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
): void {
  const currentDist = dist.get(currentId) ?? Infinity;
  for (const { nodeId, weight } of graph.adjacency.get(currentId) ?? []) {
    if (visited.has(nodeId)) continue;
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
 * Finds the shortest path between two rooms in an indoor graph using Dijkstra's algorithm.
 *
 * @param graph - The indoor navigation graph built from GeoJSON data
 * @param startRef - The room reference of the start room (e.g. "H851.02")
 * @param destRef  - The room reference of the destination room (e.g. "H820")
 * @returns Ordered array of GraphNodes from start to destination, or null if no path exists
 */
export function findIndoorPath(
  graph: IndoorGraph,
  startRef: string,
  destRef: string,
): GraphNode[] | null {
  const startNode = findNodeByRef(graph, startRef);
  const destNode = findNodeByRef(graph, destRef);
  if (!startNode || !destNode) return null;
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
    relaxNeighbors(currentId, graph, dist, prev, visited, queue);
  }

  if ((dist.get(destNode.id) ?? Infinity) === Infinity) return null;

  return reconstructPath(destNode.id, graph, prev);
}
