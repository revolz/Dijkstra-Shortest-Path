export class Graph {
  constructor(n, directed = false) {
    this.n = n;
    this.directed = directed;
    this.adj = Array.from({ length: n }, () => []);
    this.positions = [];
    this.edgeList = [];
  }

  addEdge(u, v, w) {
    this.adj[u].push({ v, w });
    if (!this.directed) this.adj[v].push({ v: u, w });
    this.edgeList.push({ u, v, w });
  }

  hasEdge(u, v) {
    return this.adj[u].some(e => e.v === v);
  }

  degree(u) {
    return this.adj[u].length;
  }
}

// Edge cost = Euclidean distance between node positions, scaled to integer units
function edgeCost(graph, u, v) {
  const pu = graph.positions[u], pv = graph.positions[v];
  return Math.max(1, Math.round(Math.hypot(pu.x - pv.x, pu.y - pv.y) * 100));
}

export function generateGraph({ nodes: n, edges: targetEdges, maxDegree, forceConnected, directed }) {
  if (n < 1) return new Graph(1, directed);

  const graph = new Graph(n, directed);

  // Random positions across the canvas area [0.05, 0.95]
  for (let i = 0; i < n; i++) {
    graph.positions.push({
      x: 0.05 + Math.random() * 0.90,
      y: 0.05 + Math.random() * 0.90,
    });
  }

  if (n === 1) return graph;

  const maxPossible = directed ? n * (n - 1) : Math.floor(n * (n - 1) / 2);
  const budget = Math.min(targetEdges, maxPossible);

  // Nearest-neighbour spanning tree (Prim's) — always attach the closest unconnected node
  if (forceConnected) {
    const inTree = new Set([Math.floor(Math.random() * n)]);

    while (inTree.size < n) {
      let bestCost = Infinity, bestSrc = -1, bestTgt = -1;

      // Find the shortest edge from any inTree node to any outside node
      // Prefer sources that haven't hit maxDegree; fall back to any if needed
      for (let pass = 0; pass < 2 && bestSrc === -1; pass++) {
        for (const u of inTree) {
          if (pass === 0 && graph.degree(u) >= maxDegree) continue;
          for (let v = 0; v < n; v++) {
            if (inTree.has(v)) continue;
            const w = edgeCost(graph, u, v);
            if (w < bestCost) { bestCost = w; bestSrc = u; bestTgt = v; }
          }
        }
      }

      graph.addEdge(bestSrc, bestTgt, bestCost);
      inTree.add(bestTgt);
    }

    if (budget < n - 1) {
      graph._edgeNote = `Connected graph needs ≥ ${n - 1} edges; showing ${n - 1}.`;
      return graph;
    }
  }

  // Extra edges: sort all remaining candidate pairs by distance, add shortest first
  const candidates = [];
  for (let u = 0; u < n; u++) {
    for (let v = directed ? 0 : u + 1; v < n; v++) {
      if (u === v || graph.hasEdge(u, v)) continue;
      candidates.push({ u, v, w: edgeCost(graph, u, v) });
    }
  }
  candidates.sort((a, b) => a.w - b.w);

  for (const { u, v, w } of candidates) {
    if (graph.edgeList.length >= budget) break;
    if (graph.hasEdge(u, v)) continue;
    if (graph.degree(u) >= maxDegree) continue;
    if (!directed && graph.degree(v) >= maxDegree) continue;
    graph.addEdge(u, v, w);
  }

  if (graph.edgeList.length < budget) {
    console.warn(`Placed ${graph.edgeList.length}/${budget} edges (degree cap or density limit reached).`);
  }

  return graph;
}
