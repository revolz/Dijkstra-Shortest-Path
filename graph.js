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

export function generateGraph({ nodes: n, edges: targetEdges, maxDegree, forceConnected, directed }) {
  if (n < 1) return new Graph(1, directed);

  const graph = new Graph(n, directed);

  // Positions: circular layout with jitter, clamped to [0.05, 0.95]
  for (let i = 0; i < n; i++) {
    const angle = (2 * Math.PI * i / n) + (Math.random() - 0.5) * 0.3;
    const radius = 0.36 + (Math.random() - 0.5) * 0.04;
    graph.positions.push({
      x: Math.max(0.05, Math.min(0.95, 0.5 + radius * Math.cos(angle))),
      y: Math.max(0.05, Math.min(0.95, 0.5 + radius * Math.sin(angle))),
    });
  }

  if (n === 1) return graph;

  const maxPossible = directed ? n * (n - 1) : Math.floor(n * (n - 1) / 2);
  const budget = Math.min(targetEdges, maxPossible);

  // Spanning tree to guarantee connectivity
  if (forceConnected) {
    const order = Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5);
    for (let i = 1; i < n; i++) {
      const w = Math.floor(Math.random() * 20) + 1;
      if (directed) {
        // root → new node so Dijkstra from root reaches everything
        const src = order[Math.floor(Math.random() * i)];
        const tgt = order[i];
        if (!graph.hasEdge(src, tgt)) graph.addEdge(src, tgt, w);
      } else {
        const a = order[i];
        const b = order[Math.floor(Math.random() * i)];
        if (!graph.hasEdge(a, b)) graph.addEdge(a, b, w);
      }
    }
    if (budget < n - 1) {
      console.warn('Edge budget too low for connected graph; using spanning tree only.');
      return graph;
    }
  }

  // Fill remaining edges up to budget
  const MAX_ATTEMPTS = budget * 20;
  let attempts = 0;
  while (graph.edgeList.length < budget && attempts < MAX_ATTEMPTS) {
    attempts++;
    const u = Math.floor(Math.random() * n);
    let v = Math.floor(Math.random() * (n - 1));
    if (v >= u) v++;
    if (graph.hasEdge(u, v)) continue;
    if (graph.degree(u) >= maxDegree) continue;
    if (!directed && graph.degree(v) >= maxDegree) continue;
    graph.addEdge(u, v, Math.floor(Math.random() * 20) + 1);
  }

  if (graph.edgeList.length < budget) {
    console.warn(`Placed ${graph.edgeList.length}/${budget} edges (degree cap or density limit reached).`);
  }

  return graph;
}
