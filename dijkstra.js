class MinHeap {
  constructor() { this.heap = []; }

  push(item) {
    this.heap.push(item);
    this._siftUp(this.heap.length - 1);
  }

  pop() {
    if (!this.heap.length) return null;
    const top = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length) { this.heap[0] = last; this._siftDown(0); }
    return top;
  }

  get size() { return this.heap.length; }

  _siftUp(i) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.heap[p].dist <= this.heap[i].dist) break;
      [this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]];
      i = p;
    }
  }

  _siftDown(i) {
    const n = this.heap.length;
    while (true) {
      let s = i, l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.heap[l].dist < this.heap[s].dist) s = l;
      if (r < n && this.heap[r].dist < this.heap[s].dist) s = r;
      if (s === i) break;
      [this.heap[s], this.heap[i]] = [this.heap[i], this.heap[s]];
      i = s;
    }
  }
}

function snap(type, current, frontier, visited, dist, prev, relaxed, path) {
  return {
    type, current,
    frontier: new Set(frontier),
    visited: new Set(visited),
    dist: dist.slice(),
    prev: prev.slice(),
    relaxed,
    path,
  };
}

export function runDijkstra(graph, source, dest) {
  const n = graph.n;
  const dist = new Array(n).fill(Infinity);
  const prev = new Array(n).fill(null);
  const visited = new Set();
  const frontier = new Set();
  const steps = [];

  dist[source] = 0;
  frontier.add(source);
  const heap = new MinHeap();
  heap.push({ node: source, dist: 0 });

  steps.push(snap('explore', source, frontier, visited, dist, prev, null, null));

  while (heap.size > 0) {
    const { node: u, dist: du } = heap.pop();
    if (du > dist[u] || visited.has(u)) continue;

    visited.add(u);
    frontier.delete(u);
    steps.push(snap('settle', u, frontier, visited, dist, prev, null, null));

    if (u === dest) {
      const path = reconstructPath(prev, source, dest);
      steps.push(snap('done', u, frontier, visited, dist, prev, null, path));
      return { steps, path, cost: dist[dest], reachable: true, source, dest };
    }

    for (const { v, w } of graph.adj[u]) {
      if (visited.has(v)) continue;
      const nd = dist[u] + w;
      if (nd < dist[v]) {
        dist[v] = nd;
        prev[v] = u;
        frontier.add(v);
        heap.push({ node: v, dist: nd });
        steps.push(snap('relax', u, frontier, visited, dist, prev, { u, v }, null));
      }
    }
  }

  steps.push(snap('no_path', dest, frontier, visited, dist, prev, null, null));
  return { steps, path: [], cost: Infinity, reachable: false, source, dest };
}

function reconstructPath(prev, source, dest) {
  if (prev[dest] === null && dest !== source) return [];
  const path = [];
  let cur = dest;
  while (cur !== null) { path.unshift(cur); cur = prev[cur]; }
  return path;
}
