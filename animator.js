const SPEED_MS = { 0.5: 1600, 1: 800, 2: 400, 4: 200 };

export class Animator {
  constructor(canvas, graph, result) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.graph = graph;
    this.result = result;
    this.currentStep = 0;
    this.totalSteps = result ? result.steps.length : 1;
    this.source = result?.source ?? null;
    this.dest = result?.dest ?? null;
    this._intervalMs = 800;
    this._timer = null;
    this.onChange = null;
    this.onComplete = null;
    this._resizeCanvas();
  }

  _resizeCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._w = rect.width;
    this._h = rect.height;
  }

  resize() {
    this._resizeCanvas();
    this.render(this.currentStep);
  }

  render(stepIndex) {
    this.currentStep = Math.max(0, Math.min(stepIndex, this.totalSteps - 1));
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this._w, this._h);
    const step = this.result?.steps[this.currentStep] ?? null;
    this._drawEdges(step);
    this._drawNodes(step);
    this._drawWeightLabels(step);
    this._drawNodeLabels(step);
  }

  // Maps fractional position to canvas pixel
  _px(i) {
    const p = this.graph.positions[i];
    const maxR = this._nodeRadius(this.source ?? 0);
    const pad = Math.max(36, maxR + 20);
    return {
      x: pad + p.x * (this._w - 2 * pad),
      y: pad + p.y * (this._h - 2 * pad),
    };
  }

  _baseRadius() {
    return Math.max(13, Math.min(22, 180 / this.graph.n));
  }

  _nodeRadius(i = -1) {
    const base = this._baseRadius();
    if (i === this.source || i === this.dest) return Math.round(base * 1.65);
    return base;
  }

  _pathEdgeSet(step) {
    const s = new Set();
    if (!step?.path || step.path.length < 2) return s;
    for (let i = 0; i < step.path.length - 1; i++) {
      s.add(`${step.path[i]},${step.path[i + 1]}`);
      if (!this.graph.directed) s.add(`${step.path[i + 1]},${step.path[i]}`);
    }
    return s;
  }

  _drawEdges(step) {
    const ctx = this.ctx;
    const pathSet = this._pathEdgeSet(step);

    // Two-pass rendering: glow layer first, then solid strokes
    for (let pass = 0; pass < 2; pass++) {
      for (const { u, v } of this.graph.edgeList) {
        const pu = this._px(u);
        const pv = this._px(v);

        const isPath = pathSet.has(`${u},${v}`);
        const isRelaxed = step?.relaxed &&
          ((step.relaxed.u === u && step.relaxed.v === v) ||
            (!this.graph.directed && step.relaxed.u === v && step.relaxed.v === u));
        const bothVisited = step && step.visited.has(u) && step.visited.has(v);

        if (pass === 0) {
          // Glow pass — only path edges get a glow
          if (!isPath) continue;
          ctx.strokeStyle = 'rgba(241,196,15,0.22)';
          ctx.lineWidth = 14;
        } else {
          // Solid pass
          if (isPath) {
            ctx.strokeStyle = '#f1c40f';
            ctx.lineWidth = 4;
          } else if (isRelaxed) {
            ctx.strokeStyle = '#ffe066';
            ctx.lineWidth = 2.5;
          } else if (bothVisited) {
            ctx.strokeStyle = '#5a3070';
            ctx.lineWidth = 1;
          } else {
            ctx.strokeStyle = '#3a3a5c';
            ctx.lineWidth = 1;
          }
        }

        if (this.graph.directed) {
          this._arrowEdge(ctx, pu, pv, ctx.strokeStyle, ctx.lineWidth);
        } else {
          ctx.beginPath();
          ctx.moveTo(pu.x, pu.y);
          ctx.lineTo(pv.x, pv.y);
          ctx.stroke();
        }
      }
    }
  }

  _arrowEdge(ctx, pu, pv, color, lw) {
    const dx = pv.x - pu.x, dy = pv.y - pu.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) return;
    const nx = dx / len, ny = dy / len;
    const r = this._nodeRadius();

    // Perpendicular offset so opposing arrows don't overlap
    const off = 4;
    const ox = -ny * off, oy = nx * off;

    const sx = pu.x + nx * r + ox, sy = pu.y + ny * r + oy;
    const ex = pv.x - nx * r + ox, ey = pv.y - ny * r + oy;

    ctx.strokeStyle = color;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex - nx * 8, ey - ny * 8);
    ctx.stroke();

    // Arrowhead
    const a = Math.atan2(dy, dx);
    const al = 10, aw = 0.42;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - al * Math.cos(a - aw), ey - al * Math.sin(a - aw));
    ctx.lineTo(ex - al * Math.cos(a + aw), ey - al * Math.sin(a + aw));
    ctx.closePath();
    ctx.fill();
  }

  _drawNodes(step) {
    const ctx = this.ctx;

    for (let i = 0; i < this.graph.n; i++) {
      const p = this._px(i);
      const r = this._nodeRadius(i);
      let color = '#4a90d9';

      if (step) {
        const onPath = step.path?.includes(i);
        if (onPath)                    color = '#f1c40f';
        else if (i === this.source)    color = '#27ae60';
        else if (i === this.dest)      color = '#e74c3c';
        else if (step.visited.has(i))  color = '#8e44ad';
        else if (step.frontier.has(i)) color = '#f39c12';
      }

      // Outer colored ring for source / dest
      if (i === this.source || i === this.dest) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 7, 0, Math.PI * 2);
        ctx.strokeStyle = i === this.source ? '#27ae60' : '#e74c3c';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }

      // Ring for current node being processed
      if (step && i === step.current) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, r + 5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  _drawWeightLabels(step) {
    const ctx = this.ctx;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const { u, v, w } of this.graph.edgeList) {
      const pu = this._px(u), pv = this._px(v);
      const mx = (pu.x + pv.x) / 2, my = (pu.y + pv.y) / 2;
      const dx = pv.x - pu.x, dy = pv.y - pu.y;
      const len = Math.hypot(dx, dy);
      const ox = len > 0 ? (-dy / len) * 11 : 0;
      const oy = len > 0 ? (dx / len) * 11 : 0;

      ctx.fillStyle = 'rgba(140,200,245,0.82)';
      ctx.fillText(w, mx + ox, my + oy);
    }
  }

  _drawNodeLabels(step) {
    const ctx = this.ctx;
    const baseR = this._baseRadius();
    const fontSize = Math.max(9, Math.min(13, baseR * 0.72));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < this.graph.n; i++) {
      const p = this._px(i);
      const r = this._nodeRadius(i);
      const fsz = (i === this.source || i === this.dest)
        ? Math.max(10, Math.min(16, r * 0.62))
        : fontSize;

      // Node index
      ctx.font = `bold ${fsz}px monospace`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(i, p.x, p.y);

      // Dist label beneath node
      if (step) {
        const d = step.dist[i];
        ctx.font = `${Math.max(8, fsz - 2)}px monospace`;
        ctx.fillStyle = 'rgba(248,196,56,0.92)';
        ctx.fillText(d === Infinity ? '∞' : d, p.x, p.y + r + 11);
      }
    }
  }

  play() {
    if (this._timer) return;
    this._timer = setInterval(() => {
      if (this.currentStep >= this.totalSteps - 1) {
        this.pause();
        this.onComplete?.();
        return;
      }
      this.currentStep++;
      this.render(this.currentStep);
      this.onChange?.(this.currentStep, this.totalSteps);
    }, this._intervalMs);
  }

  pause() {
    clearInterval(this._timer);
    this._timer = null;
  }

  setSpeed(multiplier) {
    this._intervalMs = SPEED_MS[multiplier] ?? 800;
    if (this._timer) { this.pause(); this.play(); }
  }

  stepForward() {
    if (this.currentStep < this.totalSteps - 1) {
      this.currentStep++;
      this.render(this.currentStep);
      this.onChange?.(this.currentStep, this.totalSteps);
    }
  }

  stepBackward() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.render(this.currentStep);
      this.onChange?.(this.currentStep, this.totalSteps);
    }
  }

  goToStep(n) {
    this.currentStep = Math.max(0, Math.min(n, this.totalSteps - 1));
    this.render(this.currentStep);
    this.onChange?.(this.currentStep, this.totalSteps);
  }
}
