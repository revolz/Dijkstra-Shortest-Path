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

  // Spanning tree to guarantee connectivity, respecting maxDegree where possible
  if (forceConnected) {
    const order = Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5);
    const connected = [order[0]];

    for (let i = 1; i < n; i++) {
      if (directed) {
        const tgt = order[i];
        const preferred = connected.filter(s => graph.degree(s) < maxDegree);
        const pool = preferred.length > 0 ? preferred : connected;
        const src = pool[Math.floor(Math.random() * pool.length)];
        if (!graph.hasEdge(src, tgt)) graph.addEdge(src, tgt, edgeCost(graph, src, tgt));
      } else {
        const a = order[i];
        const preferred = connected.filter(b => graph.degree(b) < maxDegree);
        const pool = preferred.length > 0 ? preferred : connected;
        const b = pool[Math.floor(Math.random() * pool.length)];
        if (!graph.hasEdge(a, b)) graph.addEdge(a, b, edgeCost(graph, a, b));
      }
      connected.push(order[i]);
    }

    if (budget < n - 1) {
      graph._edgeNote = `Connected graph needs ≥ ${n - 1} edges; showing ${n - 1}.`;
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
    graph.addEdge(u, v, edgeCost(graph, u, v));
  }

  if (graph.edgeList.length < budget) {
    console.warn(`Placed ${graph.edgeList.length}/${budget} edges (degree cap or density limit reached).`);
  }

  return graph;
}
