import { IndoorGraph, GraphNode } from "./indoorGraphService";

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
  // Locate start and destination nodes by their room reference
  let startNode: GraphNode | null = null;
  let destNode: GraphNode | null = null;

  for (const node of graph.nodes.values()) {
    if (node.ref === startRef) startNode = node;
    if (node.ref === destRef) destNode = node;
    if (startNode && destNode) break;
  }

  if (!startNode || !destNode) return null;
  if (startNode.id === destNode.id) return [startNode];

  // Dijkstra initialisation
  const dist = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const visited = new Set<string>();

  for (const id of graph.nodes.keys()) {
    dist.set(id, Infinity);
    prev.set(id, null);
  }
  dist.set(startNode.id, 0);

  // Min-priority queue: array of {id, dist} sorted on extraction
  const queue: Array<{ id: string; cost: number }> = [
    { id: startNode.id, cost: 0 },
  ];

  while (queue.length > 0) {
    // Extract node with minimum cost
    let minIdx = 0;
    for (let i = 1; i < queue.length; i++) {
      if (queue[i].cost < queue[minIdx].cost) minIdx = i;
    }
    const { id: currentId } = queue.splice(minIdx, 1)[0];

    if (visited.has(currentId)) continue;
    visited.add(currentId);

    if (currentId === destNode.id) break;

    for (const { nodeId, weight } of graph.adjacency.get(currentId) ?? []) {
      if (visited.has(nodeId)) continue;
      const newCost = (dist.get(currentId) ?? Infinity) + weight;
      if (newCost < (dist.get(nodeId) ?? Infinity)) {
        dist.set(nodeId, newCost);
        prev.set(nodeId, currentId);
        queue.push({ id: nodeId, cost: newCost });
      }
    }
  }

  // No path found
  if ((dist.get(destNode.id) ?? Infinity) === Infinity) return null;

  // Reconstruct path from dest back to start
  const path: GraphNode[] = [];
  let current: string | null = destNode.id;
  while (current !== null) {
    const node = graph.nodes.get(current);
    if (!node) break;
    path.unshift(node);
    current = prev.get(current) ?? null;
  }

  return path;
}
