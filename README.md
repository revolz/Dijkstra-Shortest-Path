# Dijkstra Shortest Path Demo

An interactive, browser-based visualizer for Dijkstra's shortest-path algorithm. Generate random weighted graphs, configure their topology, then watch the algorithm find the shortest path step-by-step — with full playback controls.

**Live demo:** https://revolz.github.io/Dijkstra-Shortest-Path/

---

## Objective

Provide a clear, hands-on way to understand how Dijkstra's algorithm works: how the priority queue expands the frontier, how distances are relaxed edge by edge, and how the shortest path is reconstructed at the end.

---

## Features

- **Random graph generation** — nodes placed at random positions; edge weights equal the Euclidean distance between endpoints (scaled to integers), so the graph looks and behaves like a realistic road network
- **Nearest-neighbour connectivity** — spanning tree built with Prim's algorithm so no long cross-canvas jumps; extra edges added shortest-first (Kruskal-style)
- **Configurable topology** — nodes (2–50), target edge count, max degree per node, force-connected toggle, directed/undirected toggle
- **Step-by-step animation** — every algorithm event (enqueue, settle, relax, done) is captured as a snapshot; seek to any step instantly
- **Player controls** — Play/Pause, step forward/back, click-to-seek progress bar, four speed presets (0.5×, 1×, 2×, 4×)
- **Rich visual encoding** — six distinct node states, gold path highlighting with glow, enlarged source/destination nodes with colored rings
- **No build step** — vanilla HTML + CSS + ES Modules; open `index.html` directly or serve with any static file server

---

## Visual Design

### Node colors

| Color | State |
|---|---|
| Green (larger, ringed) | Source node |
| Red (larger, ringed) | Destination node |
| Gold | On the shortest path |
| Purple | Settled (finalized by Dijkstra) |
| Orange | In the priority queue (frontier) |
| Blue | Unvisited |

### Edge colors

| Color | State |
|---|---|
| Gold + glow | Shortest path edge |
| Bright yellow | Edge being relaxed (current step) |
| Muted purple | Both endpoints settled |
| Dark grey | Default / unvisited |

### Labels

| Color | Meaning |
|---|---|
| Cool blue | Edge weight (fixed cost of that connection) |
| Warm amber | Running shortest distance to that node (updates each step) |

---

## How Dijkstra's Algorithm Works

1. **Initialise** — set distance to source = 0, all others = ∞; push source onto a min-heap
2. **Settle** — pop the node with the smallest tentative distance; mark it finalised
3. **Relax** — for each neighbour, if `dist[current] + edge_weight < dist[neighbour]`, update the neighbour's distance and push it onto the heap
4. **Repeat** — until the destination is settled (shortest path found) or the heap is empty (destination unreachable)
5. **Reconstruct** — walk backwards through the predecessor array from destination to source

Every event above is recorded as a snapshot so the player can seek freely in both directions.

---

## Graph Generation

### Positions
Each node gets a uniformly random (x, y) position in the range [0.05, 0.95]. Positions are stored as unit fractions and scaled to canvas pixels at render time, so window resize works cleanly.

### Edge weights
`weight = max(1, round(Euclidean_distance × 100))`

Longer edges cost more, which makes the shortest path visually meaningful.

### Spanning tree (Prim's MST)
When *Force connected graph* is checked, the backbone is built with pure Prim's: always attach the nearest unconnected node. This ensures connectivity with no degree cap applied during the backbone phase (maxDegree is enforced only for extra edges).

### Extra edges (Kruskal-style)
All remaining candidate pairs are sorted by distance; the shortest candidates are added first, subject to the maxDegree cap. This keeps the graph local and readable.

---

## File Structure

```
index.html    — layout shell; loads app.js as ES module entry point
style.css     — dark theme, CSS variables, panel/player layout
graph.js      — Graph class, Prim's spanning tree, Kruskal extra edges
dijkstra.js   — MinHeap, runDijkstra(), snapshot step recorder
animator.js   — Canvas renderer, playback engine (Animator class)
app.js        — DOM wiring, state orchestration
```

---

## Running Locally

```bash
# Any static file server works — example with Python:
python -m http.server 8080
# then open http://localhost:8080
```

Or just open `index.html` directly in a modern browser (Chrome, Firefox, Safari, Edge).

---

## Tech Stack

- Vanilla JavaScript (ES Modules, no framework, no bundler)
- HTML5 Canvas API with HiDPI (devicePixelRatio) support
- CSS custom properties for theming
- Deployed via GitHub Pages (`gh-pages` branch)
