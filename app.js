// ---- Stage 2: multi-layer canvas with pressure-sensitive drawing ----
//
// How layers work here (simple explanation):
// Each "layer" is its own hidden <canvas> that nobody sees directly.
// The one visible canvas (#drawCanvas) is just a "screen" that we
// repaint by stacking all the hidden layer canvases on top of each other,
// in order, respecting each layer's opacity. This is called "compositing."
//
// When you draw, you're only drawing onto the currently active layer's
// hidden canvas. Then we re-composite so you see the result.

const displayCanvas = document.getElementById('drawCanvas');
const displayCtx = displayCanvas.getContext('2d');

const colorPicker = document.getElementById('colorPicker');
const sizeSlider = document.getElementById('sizeSlider');
const opacitySlider = document.getElementById('opacitySlider');
const clearBtn = document.getElementById('clearBtn');
const saveBtn = document.getElementById('saveBtn');
const layersToggleBtn = document.getElementById('layersToggleBtn');
const layerPanel = document.getElementById('layerPanel');
const layerList = document.getElementById('layerList');
const addLayerBtn = document.getElementById('addLayerBtn');

let layers = [];
let activeLayerIndex = 0;
let layerCounter = 0;

let drawing = false;
let lastX = 0;
let lastY = 0;

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
    visible: true
  };
}

function addLayer() {
  const layer = createLayer({ name: `Layer ${layerCounter + 1}` });
  // New layers go on top, right after the current active layer position+1
  layers.splice(activeLayerIndex + 1, 0, layer);
  activeLayerIndex = activeLayerIndex + 1;
  renderLayerPanel();
  compositeAndRender();
}

function deleteLayer(index) {
  if (layers.length <= 1) {
    alert("You need at least one layer.");
    return;
  }
  layers.splice(index, 1);
  if (activeLayerIndex >= layers.length) {
    activeLayerIndex = layers.length - 1;
  }
  renderLayerPanel();
  compositeAndRender();
}

function moveLayer(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= layers.length) return;
  const temp = layers[index];
  layers[index] = layers[newIndex];
  layers[newIndex] = temp;
  if (activeLayerIndex === index) {
    activeLayerIndex = newIndex;
  } else if (activeLayerIndex === newIndex) {
    activeLayerIndex = index;
  }
  renderLayerPanel();
  compositeAndRender();
}

function setActiveLayer(index) {
  activeLayerIndex = index;
  renderLayerPanel();
}

function setLayerOpacity(index, value) {
  layers[index].opacity = value;
  compositeAndRender();
}

// ---------- Rendering ----------

function compositeAndRender() {
  displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
  // Layers are drawn bottom-to-top, in array order (index 0 = bottom)
  for (const layer of layers) {
    if (!layer.visible) continue;
    displayCtx.globalAlpha = layer.opacity;
    displayCtx.drawImage(layer.canvas, 0, 0);
  }
  displayCtx.globalAlpha = 1;
}

function renderLayerPanel() {
  layerList.innerHTML = '';
  // Show top layer first in the list (reverse of drawing order)
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    const item = document.createElement('div');
    item.className = 'layer-item' + (i === activeLayerIndex ? ' active' : '');

    const top = document.createElement('div');
    top.className = 'layer-item-top';

    const name = document.createElement('div');
    name.className = 'layer-name';
    name.textContent = layer.name;
    name.addEventListener('click', () => setActiveLayer(i));

    const controls = document.createElement('div');
    controls.className = 'layer-controls';

    const upBtn = document.createElement('button');
    upBtn.textContent = '↑';
    upBtn.addEventListener('click', (e) => { e.stopPropagation(); moveLayer(i, 1); });

    const downBtn = document.createElement('button');
    downBtn.textContent = '↓';
    downBtn.addEventListener('click', (e) => { e.stopPropagation(); moveLayer(i, -1); });

    const delBtn = document.createElement('button');
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteLayer(i); });

    controls.appendChild(upBtn);
    controls.appendChild(downBtn);
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
    opSlider.addEventListener('input', () => {
      setLayerOpacity(i, opSlider.value / 100);
    });

    opacityRow.appendChild(opLabel);
    opacityRow.appendChild(opSlider);

    item.addEventListener('click', () => setActiveLayer(i));
    item.appendChild(top);
    item.appendChild(opacityRow);
    layerList.appendChild(item);
  }
}

// ---------- Canvas sizing ----------

function resizeCanvases() {
  const wrap = document.getElementById('canvasWrap');
  const newWidth = wrap.clientWidth;
  const newHeight = wrap.clientHeight;

  displayCanvas.width = newWidth;
  displayCanvas.height = newHeight;

  // Resize each layer canvas, keeping its existing drawing (scaled/copied as-is)
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

  const activeLayer = layers[activeLayerIndex];
  const ctx = activeLayer.ctx;

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

clearBtn.addEventListener('click', () => {
  const layer = layers[activeLayerIndex];
  layer.ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);
  compositeAndRender();
});

saveBtn.addEventListener('click', () => {
  // Flatten everything onto a temp white-backed canvas so exported PNG looks right
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
  layerPanel.classList.toggle('hidden');
});

addLayerBtn.addEventListener('click', addLayer);

// ---------- Init ----------

function init() {
  const wrap = document.getElementById('canvasWrap');
  displayCanvas.width = wrap.clientWidth;
  displayCanvas.height = wrap.clientHeight;

  // Start with one background layer (white) so exports look right
  const background = createLayer({ name: 'Background', fillWhite: true });
  layers.push(background);
  activeLayerIndex = 0;

  renderLayerPanel();
  compositeAndRender();
}

init();
