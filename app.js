// ---- Stage 4: color palette + layer grouping + front/back ordering ----
//
// Big change under the hood: the "active layer" and any selections are now
// tracked by a permanent ID number, not by their position in the list.
// This matters because grouping / front / back can jump a layer to a
// totally different position - if we tracked it by position, the app could
// end up drawing on the wrong layer after a reorder. Tracking by ID means
// it always finds the *same* layer, wherever it currently sits.

const displayCanvas = document.getElementById('drawCanvas');
const displayCtx = displayCanvas.getContext('2d');

const colorPicker = document.getElementById('colorPicker');
const sizeSlider = document.getElementById('sizeSlider');
const opacitySlider = document.getElementById('opacitySlider');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const clearBtn = document.getElementById('clearBtn');
const saveBtn = document.getElementById('saveBtn');
const layersToggleBtn = document.getElementById('layersToggleBtn');
const layerPanel = document.getElementById('layerPanel');
const layerList = document.getElementById('layerList');
const addLayerBtn = document.getElementById('addLayerBtn');
const groupBtn = document.getElementById('groupBtn');
const paletteGroup = document.getElementById('paletteGroup');

// A curated set of tones for realistic skin, hair, eyes and lips -
// tap one to load it straight into the brush color.
const HUMAN_PALETTE = [
  // Skin tones, light to deep
  '#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#5c3a21',
  // Blush / lips
  '#e8909a', '#c1666b', '#8b3a3a',
  // Hair
  '#1a1a1a', '#3b2314', '#7a4b28', '#d1a054', '#c0392b',
  // Eyes
  '#4a6fa5', '#4e7a51', '#6b4f3b'
];

let layers = [];
let activeLayerId = null;
let layerCounter = 0;

let groups = {}; // groupId -> { id, name }
let groupCounter = 0;
let selectedForGrouping = new Set(); // layer ids currently checked in the panel

let drawing = false;
let lastX = 0;
let lastY = 0;

const MAX_HISTORY = 20;
let undoStack = []; // each entry: { layerId, dataURL }
let redoStack = [];

// ---------- Small helpers ----------

function findLayerById(id) {
  return layers.find(l => l.id === id);
}

function getActiveLayer() {
  return findLayerById(activeLayerId);
}

// ---------- Layer management ----------

function createLayer(opts = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = displayCanvas.width;
  canvas.height = displayCanvas.height;
  const ctx = canvas.getContext('2d');

  if (opts.fillWhite) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  layerCounter++;
  return {
    id: layerCounter,
    name: opts.name || `Layer ${layerCounter}`,
    canvas,
    ctx,
    opacity: 1,
    visible: true,
    groupId: null
  };
}

function addLayer() {
  const layer = createLayer({ name: `Layer ${layerCounter + 1}` });
  const activeIndex = layers.findIndex(l => l.id === activeLayerId);
  layers.splice(activeIndex + 1, 0, layer);
  activeLayerId = layer.id;
  renderLayerPanel();
  compositeAndRender();
}

function deleteLayer(id) {
  if (layers.length <= 1) {
    alert("You need at least one layer.");
    return;
  }
  const index = layers.findIndex(l => l.id === id);
  layers.splice(index, 1);
  selectedForGrouping.delete(id);
  if (activeLayerId === id) {
    const fallback = layers[Math.max(0, index - 1)];
    activeLayerId = fallback.id;
  }
  undoStack = undoStack.filter(entry => entry.layerId !== id);
  redoStack = redoStack.filter(entry => entry.layerId !== id);
  updateUndoRedoButtons();
  renderLayerPanel();
  compositeAndRender();
}

function moveLayerStep(id, direction) {
  const index = layers.findIndex(l => l.id === id);
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= layers.length) return;
  // Don't let a step-move break a group's members apart
  if (layers[index].groupId !== null || layers[newIndex].groupId !== null) return;
  const temp = layers[index];
  layers[index] = layers[newIndex];
  layers[newIndex] = temp;
  renderLayerPanel();
  compositeAndRender();
}

function bringToFront(id) {
  const index = layers.findIndex(l => l.id === id);
  const [layer] = layers.splice(index, 1);
  layers.push(layer);
  renderLayerPanel();
  compositeAndRender();
}

function sendToBack(id) {
  const index = layers.findIndex(l => l.id === id);
  const [layer] = layers.splice(index, 1);
  layers.unshift(layer);
  renderLayerPanel();
  compositeAndRender();
}

function setActiveLayer(id) {
  activeLayerId = id;
  renderLayerPanel();
}

function setLayerOpacity(id, value) {
  findLayerById(id).opacity = value;
  compositeAndRender();
}

function toggleSelectedForGrouping(id) {
  if (selectedForGrouping.has(id)) {
    selectedForGrouping.delete(id);
  } else {
    selectedForGrouping.add(id);
  }
  renderLayerPanel();
}

// ---------- Groups ----------

function groupSelected() {
  const ids = Array.from(selectedForGrouping);
  if (ids.length < 2) {
    alert('Check at least 2 layers first (tap the checkbox on each), then tap Group.');
    return;
  }
  const groupId = ++groupCounter;
  groups[groupId] = { id: groupId, name: `Group ${groupId}` };

  const grouped = layers.filter(l => ids.includes(l.id));
  const rest = layers.filter(l => !ids.includes(l.id));
  grouped.forEach(l => { l.groupId = groupId; });

  // The new group is placed on top of everything else, as one block.
  layers = [...rest, ...grouped];
  selectedForGrouping.clear();
  renderLayerPanel();
  compositeAndRender();
}

function ungroup(groupId) {
  layers.forEach(l => { if (l.groupId === groupId) l.groupId = null; });
  delete groups[groupId];
  renderLayerPanel();
  compositeAndRender();
}

function groupBringToFront(groupId) {
  const members = layers.filter(l => l.groupId === groupId);
  const rest = layers.filter(l => l.groupId !== groupId);
  layers = [...rest, ...members];
  renderLayerPanel();
  compositeAndRender();
}

function groupSendToBack(groupId) {
  const members = layers.filter(l => l.groupId === groupId);
  const rest = layers.filter(l => l.groupId !== groupId);
  layers = [...members, ...rest];
  renderLayerPanel();
  compositeAndRender();
}

// ---------- Undo / Redo ----------

function pushUndoSnapshot(layer) {
  undoStack.push({ layerId: layer.id, dataURL: layer.canvas.toDataURL() });
  if (undoStack.length > MAX_HISTORY) undoStack.shift();
  redoStack = [];
  updateUndoRedoButtons();
}

function restoreSnapshotToLayer(layer, dataURL, callback) {
  const img = new Image();
  img.onload = () => {
    layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
    layer.ctx.drawImage(img, 0, 0);
    compositeAndRender();
    if (callback) callback();
  };
  img.src = dataURL;
}

function undo() {
  if (undoStack.length === 0) return;
  const entry = undoStack.pop();
  const layer = findLayerById(entry.layerId);
  if (!layer) { updateUndoRedoButtons(); undo(); return; }
  const currentDataURL = layer.canvas.toDataURL();
  restoreSnapshotToLayer(layer, entry.dataURL, () => {
    redoStack.push({ layerId: layer.id, dataURL: currentDataURL });
    updateUndoRedoButtons();
  });
}

function redo() {
  if (redoStack.length === 0) return;
  const entry = redoStack.pop();
  const layer = findLayerById(entry.layerId);
  if (!layer) { updateUndoRedoButtons(); redo(); return; }
  const currentDataURL = layer.canvas.toDataURL();
  restoreSnapshotToLayer(layer, entry.dataURL, () => {
    undoStack.push({ layerId: layer.id, dataURL: currentDataURL });
    updateUndoRedoButtons();
  });
}

function updateUndoRedoButtons() {
  undoBtn.disabled = undoStack.length === 0;
  redoBtn.disabled = redoStack.length === 0;
}

// ---------- Rendering ----------

function compositeAndRender() {
  displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
  for (const layer of layers) {
    if (!layer.visible) continue;
    displayCtx.globalAlpha = layer.opacity;
    displayCtx.drawImage(layer.canvas, 0, 0);
  }
  displayCtx.globalAlpha = 1;
}

function buildLayerItem(layer, index) {
  const item = document.createElement('div');
  item.className = 'layer-item' + (layer.id === activeLayerId ? ' active' : '');

  const top = document.createElement('div');
  top.className = 'layer-item-top';

  // Only ungrouped layers can be checked off for grouping
  if (layer.groupId === null) {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = selectedForGrouping.has(layer.id);
    checkbox.addEventListener('click', (e) => e.stopPropagation());
    checkbox.addEventListener('change', () => toggleSelectedForGrouping(layer.id));
    top.appendChild(checkbox);
  }

  const name = document.createElement('div');
  name.className = 'layer-name';
  name.textContent = layer.name;
  name.addEventListener('click', () => setActiveLayer(layer.id));

  const controls = document.createElement('div');
  controls.className = 'layer-controls';

  const isGrouped = layer.groupId !== null;

  const frontBtn = document.createElement('button');
  frontBtn.textContent = '⤒';
  frontBtn.title = 'Bring to front';
  frontBtn.addEventListener('click', (e) => { e.stopPropagation(); bringToFront(layer.id); });

  const upBtn = document.createElement('button');
  upBtn.textContent = '↑';
  upBtn.title = 'Move up';
  upBtn.disabled = isGrouped;
  upBtn.addEventListener('click', (e) => { e.stopPropagation(); moveLayerStep(layer.id, 1); });

  const downBtn = document.createElement('button');
  downBtn.textContent = '↓';
  downBtn.title = 'Move down';
  downBtn.disabled = isGrouped;
  downBtn.addEventListener('click', (e) => { e.stopPropagation(); moveLayerStep(layer.id, -1); });

  const backBtn = document.createElement('button');
  backBtn.textContent = '⤓';
  backBtn.title = 'Send to back';
  backBtn.addEventListener('click', (e) => { e.stopPropagation(); sendToBack(layer.id); });

  const delBtn = document.createElement('button');
  delBtn.textContent = '✕';
  delBtn.title = 'Delete layer';
  delBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteLayer(layer.id); });

  controls.appendChild(frontBtn);
  controls.appendChild(upBtn);
  controls.appendChild(downBtn);
  controls.appendChild(backBtn);
  controls.appendChild(delBtn);

  top.appendChild(name);
  top.appendChild(controls);

  const opacityRow = document.createElement('div');
  opacityRow.className = 'layer-opacity-row';
  const opLabel = document.createElement('span');
  opLabel.textContent = 'Opacity';
  const opSlider = document.createElement('input');
  opSlider.type = 'range';
  opSlider.min = '0';
  opSlider.max = '100';
  opSlider.value = Math.round(layer.opacity * 100);
  opSlider.addEventListener('input', () => setLayerOpacity(layer.id, opSlider.value / 100));
  opacityRow.appendChild(opLabel);
  opacityRow.appendChild(opSlider);

  item.addEventListener('click', () => setActiveLayer(layer.id));
  item.appendChild(top);
  item.appendChild(opacityRow);
  return item;
}

function renderLayerPanel() {
  layerList.innerHTML = '';
  groupBtn.textContent = selectedForGrouping.size >= 2
    ? `Group (${selectedForGrouping.size})`
    : 'Group';

  // Walk top-to-bottom (last array item = top of the stack).
  // Contiguous layers sharing a groupId get wrapped together.
  let i = layers.length - 1;
  while (i >= 0) {
    const layer = layers[i];

    if (layer.groupId !== null) {
      const groupId = layer.groupId;
      const memberIndexes = [];
      while (i >= 0 && layers[i].groupId === groupId) {
        memberIndexes.push(i);
        i--;
      }

      const wrapper = document.createElement('div');
      wrapper.className = 'group-wrapper';

      const header = document.createElement('div');
      header.className = 'group-header';

      const gName = document.createElement('span');
      gName.className = 'group-name';
      gName.textContent = groups[groupId] ? groups[groupId].name : `Group ${groupId}`;

      const gFront = document.createElement('button');
      gFront.textContent = '⤒';
      gFront.title = 'Bring group to front';
      gFront.addEventListener('click', () => groupBringToFront(groupId));

      const gBack = document.createElement('button');
      gBack.textContent = '⤓';
      gBack.title = 'Send group to back';
      gBack.addEventListener('click', () => groupSendToBack(groupId));

      const gUngroup = document.createElement('button');
      gUngroup.textContent = 'Ungroup';
      gUngroup.addEventListener('click', () => ungroup(groupId));

      header.appendChild(gName);
      header.appendChild(gFront);
      header.appendChild(gBack);
      header.appendChild(gUngroup);

      const membersDiv = document.createElement('div');
      membersDiv.className = 'group-members';
      for (const idx of memberIndexes) {
        membersDiv.appendChild(buildLayerItem(layers[idx], idx));
      }

      wrapper.appendChild(header);
      wrapper.appendChild(membersDiv);
      layerList.appendChild(wrapper);
    } else {
      layerList.appendChild(buildLayerItem(layer, i));
      i--;
    }
  }
}

// ---------- Canvas sizing ----------

function resizeCanvases() {
  const wrap = document.getElementById('canvasWrap');
  const newWidth = wrap.clientWidth;
  const newHeight = wrap.clientHeight;

  displayCanvas.width = newWidth;
  displayCanvas.height = newHeight;

  for (const layer of layers) {
    const oldData = layer.canvas.toDataURL();
    layer.canvas.width = newWidth;
    layer.canvas.height = newHeight;
    const img = new Image();
    img.onload = () => {
      layer.ctx.drawImage(img, 0, 0);
      compositeAndRender();
    };
    img.src = oldData;
  }
}
window.addEventListener('resize', resizeCanvases);

// ---------- Drawing ----------

function getPos(e) {
  const rect = displayCanvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (displayCanvas.width / rect.width),
    y: (e.clientY - rect.top) * (displayCanvas.height / rect.height)
  };
}

function startDraw(e) {
  drawing = true;
  const pos = getPos(e);
  lastX = pos.x;
  lastY = pos.y;
  pushUndoSnapshot(getActiveLayer());
  drawSegment(pos.x, pos.y, pos.x, pos.y, e.pressure);
}

function moveDraw(e) {
  if (!drawing) return;
  const pos = getPos(e);
  drawSegment(lastX, lastY, pos.x, pos.y, e.pressure);
  lastX = pos.x;
  lastY = pos.y;
}

function endDraw() {
  drawing = false;
}

function drawSegment(x1, y1, x2, y2, pressure) {
  const p = (pressure && pressure > 0) ? pressure : 1;
  const baseSize = parseFloat(sizeSlider.value);
  const strokeOpacity = parseFloat(opacitySlider.value) / 100;

  const ctx = getActiveLayer().ctx;
  ctx.globalAlpha = strokeOpacity;
  ctx.strokeStyle = colorPicker.value;
  ctx.lineWidth = baseSize * p;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();

  compositeAndRender();
}

displayCanvas.addEventListener('pointerdown', (e) => {
  displayCanvas.setPointerCapture(e.pointerId);
  startDraw(e);
});
displayCanvas.addEventListener('pointermove', moveDraw);
displayCanvas.addEventListener('pointerup', endDraw);
displayCanvas.addEventListener('pointercancel', endDraw);
displayCanvas.addEventListener('pointerleave', endDraw);

// ---------- Toolbar buttons ----------

undoBtn.addEventListener('click', undo);
redoBtn.addEventListener('click', redo);

clearBtn.addEventListener('click', () => {
  const layer = getActiveLayer();
  pushUndoSnapshot(layer);
  layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
  compositeAndRender();
});

saveBtn.addEventListener('click', () => {
  const temp = document.createElement('canvas');
  temp.width = displayCanvas.width;
  temp.height = displayCanvas.height;
  const tctx = temp.getContext('2d');
  tctx.fillStyle = '#ffffff';
  tctx.fillRect(0, 0, temp.width, temp.height);
  for (const layer of layers) {
    if (!layer.visible) continue;
    tctx.globalAlpha = layer.opacity;
    tctx.drawImage(layer.canvas, 0, 0);
  }
  tctx.globalAlpha = 1;
  const link = document.createElement('a');
  link.download = 'drawing.png';
  link.href = temp.toDataURL('image/png');
  link.click();
});

layersToggleBtn.addEventListener('click', () => {
  layerPanel.classList.toggle('open');
});

addLayerBtn.addEventListener('click', addLayer);
groupBtn.addEventListener('click', groupSelected);

// ---------- Palette ----------

function buildPalette() {
  HUMAN_PALETTE.forEach(hex => {
    const btn = document.createElement('button');
    btn.className = 'palette-swatch';
    btn.style.background = hex;
    btn.title = hex;
    btn.addEventListener('click', () => { colorPicker.value = hex; });
    paletteGroup.appendChild(btn);
  });
}

// ---------- Init ----------

function init() {
  const wrap = document.getElementById('canvasWrap');
  displayCanvas.width = wrap.clientWidth;
  displayCanvas.height = wrap.clientHeight;

  const background = createLayer({ name: 'Background', fillWhite: true });
  layers.push(background);
  activeLayerId = background.id;

  buildPalette();
  renderLayerPanel();
  compositeAndRender();
  updateUndoRedoButtons();
}

init();
