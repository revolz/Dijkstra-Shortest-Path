import { generateGraph } from './graph.js';
import { runDijkstra } from './dijkstra.js';
import { Animator } from './animator.js';

const state = { graph: null, result: null, animator: null, playing: false };

// Config inputs
const inpNodes     = document.getElementById('inp-nodes');
const inpEdges     = document.getElementById('inp-edges');
const inpDegree    = document.getElementById('inp-degree');
const inpConnected = document.getElementById('inp-connected');
const inpDirected  = document.getElementById('inp-directed');
const btnGenerate  = document.getElementById('btn-generate');

// Path inputs
const selSource    = document.getElementById('sel-source');
const selDest      = document.getElementById('sel-dest');
const btnFind      = document.getElementById('btn-find');
const resultSummary = document.getElementById('result-summary');
const pathSection  = document.getElementById('path-config');

// Canvas
const canvas = document.getElementById('graph-canvas');

// Player controls
const btnPrev      = document.getElementById('btn-prev');
const btnPlay      = document.getElementById('btn-play');
const btnNext      = document.getElementById('btn-next');
const sldSpeed     = document.getElementById('sld-speed');
const lblSpeed     = document.getElementById('lbl-speed');
const progressWrap = document.getElementById('progress-bar-wrap');
const progressFill = document.getElementById('progress-bar-fill');
const lblStep      = document.getElementById('lbl-step');
const stepDesc     = document.getElementById('step-desc');
const playerBar    = document.getElementById('player-bar');

const SPEED_MAP   = { 1: 0.5, 2: 1, 3: 2, 4: 4 };
const SPEED_LABEL = { 1: '0.5×', 2: '1×', 3: '2×', 4: '4×' };

function onGenerateGraph() {
  const nodes = parseInt(inpNodes.value);
  const edges = parseInt(inpEdges.value);
  const maxDegree = parseInt(inpDegree.value);
  const forceConnected = inpConnected.checked;
  const directed = inpDirected.checked;

  if (nodes < 2 || nodes > 50) return showError('Nodes must be between 2 and 50.');
  if (edges < 1)               return showError('Edges must be at least 1.');
  if (maxDegree < 1)           return showError('Max degree must be at least 1.');

  state.animator?.pause();
  state.graph = generateGraph({ nodes, edges, maxDegree, forceConnected, directed });
  state.result = null;
  state.playing = false;
  btnPlay.textContent = '▶';

  // Populate node selects
  const opts = Array.from({ length: nodes }, (_, i) =>
    `<option value="${i}">Node ${i}</option>`).join('');
  selSource.innerHTML = opts;
  selDest.innerHTML   = opts;
  selDest.value = String(Math.min(1, nodes - 1));

  setPathEnabled(true);
  setPlayerEnabled(false);
  resultSummary.textContent = '';
  resultSummary.className = '';
  stepDesc.textContent = '';
  updatePlayerUI(0, 1);

  state.animator = new Animator(canvas, state.graph, null);
  state.animator.render(0);
}

function onFindPath() {
  const source = parseInt(selSource.value);
  const dest   = parseInt(selDest.value);

  if (source === dest) {
    showError('Source and destination must be different nodes.');
    return;
  }

  state.animator?.pause();
  state.playing = false;
  btnPlay.textContent = '▶';

  state.result = runDijkstra(state.graph, source, dest);
  state.animator = new Animator(canvas, state.graph, state.result);
  state.animator.onChange = (step, total) => { updatePlayerUI(step, total); updateStepDesc(step); };
  state.animator.onComplete = () => { state.playing = false; btnPlay.textContent = '▶'; };
  state.animator.setSpeed(SPEED_MAP[parseInt(sldSpeed.value)]);

  setPlayerEnabled(true);
  state.animator.render(0);
  updatePlayerUI(0, state.result.steps.length);
  updateStepDesc(0);

  if (state.result.reachable) {
    resultSummary.textContent = `Cost: ${state.result.cost}  ·  Path: ${state.result.path.join(' → ')}`;
    resultSummary.className = 'success';
  } else {
    resultSummary.textContent = `No path from Node ${source} to Node ${dest}.`;
    resultSummary.className = 'error';
  }
}

function onPlayPause() {
  if (!state.animator || !state.result) return;
  if (state.playing) {
    state.animator.pause();
    state.playing = false;
    btnPlay.textContent = '▶';
  } else {
    if (state.animator.currentStep >= state.result.steps.length - 1) {
      state.animator.goToStep(0);
    }
    state.animator.play();
    state.playing = true;
    btnPlay.textContent = '⏸';
  }
}

function updatePlayerUI(step, total) {
  lblStep.textContent = `Step ${step + 1} / ${total}`;
  progressFill.style.width = `${((step + 1) / total) * 100}%`;
  btnPrev.disabled = step === 0;
  btnNext.disabled = step === total - 1;
}

function updateStepDesc(i) {
  if (!state.result) return;
  const s = state.result.steps[i];
  const d = s.dist;
  const msgs = {
    explore:  () => `Start — node ${s.current} added to queue (dist: 0)`,
    settle:   () => `Settle — node ${s.current} finalized (dist: ${d[s.current]})`,
    relax:    () => `Relax — edge ${s.relaxed.u} → ${s.relaxed.v}  (new dist: ${d[s.relaxed.v]})`,
    done:     () => `Done — shortest path found  (cost: ${state.result.cost})`,
    no_path:  () => `Done — destination unreachable`,
  };
  stepDesc.textContent = msgs[s.type]?.() ?? '';
}

function showError(msg) {
  resultSummary.textContent = msg;
  resultSummary.className = 'error';
}

function setPathEnabled(on) {
  pathSection.querySelectorAll('select, button').forEach(el => (el.disabled = !on));
}

function setPlayerEnabled(on) {
  playerBar.querySelectorAll('button, input').forEach(el => (el.disabled = !on));
}

function pauseOnManualStep() {
  if (state.playing) {
    state.animator.pause();
    state.playing = false;
    btnPlay.textContent = '▶';
  }
}

let _resizeId = null;
window.addEventListener('resize', () => {
  clearTimeout(_resizeId);
  _resizeId = setTimeout(() => state.animator?.resize(), 100);
});

// Progress bar click-to-seek
progressWrap.addEventListener('click', e => {
  if (!state.result) return;
  const rect = progressWrap.getBoundingClientRect();
  const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  const step = Math.round(frac * (state.result.steps.length - 1));
  pauseOnManualStep();
  state.animator.goToStep(step);
});

btnGenerate.addEventListener('click', onGenerateGraph);
btnFind.addEventListener('click', onFindPath);
btnPlay.addEventListener('click', onPlayPause);

btnPrev.addEventListener('click', () => {
  pauseOnManualStep();
  state.animator?.stepBackward();
});

btnNext.addEventListener('click', () => {
  pauseOnManualStep();
  state.animator?.stepForward();
});

sldSpeed.addEventListener('input', () => {
  const v = parseInt(sldSpeed.value);
  lblSpeed.textContent = SPEED_LABEL[v];
  state.animator?.setSpeed(SPEED_MAP[v]);
});

// Initialize with a default graph on load
setPathEnabled(false);
setPlayerEnabled(false);
onGenerateGraph();
