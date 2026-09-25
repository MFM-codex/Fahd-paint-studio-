// ---- Stage 1: single-layer canvas with pressure-sensitive drawing ----

const canvas = document.getElementById('drawCanvas');
const ctx = canvas.getContext('2d');

const colorPicker = document.getElementById('colorPicker');
const sizeSlider = document.getElementById('sizeSlider');
const opacitySlider = document.getElementById('opacitySlider');
const clearBtn = document.getElementById('clearBtn');
const saveBtn = document.getElementById('saveBtn');

let drawing = false;
let lastX = 0;
let lastY = 0;

function resizeCanvas() {
  // Keep existing drawing when resizing (e.g. rotation)
  const imgData = canvas.width > 0 ? canvas.toDataURL() : null;
  const wrap = document.getElementById('canvasWrap');
  canvas.width = wrap.clientWidth;
  canvas.height = wrap.clientHeight;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (imgData) {
    const img = new Image();
    img.onload = () => ctx.drawImage(img, 0, 0);
    img.src = imgData;
  }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height)
  };
}

function startDraw(e) {
  drawing = true;
  const pos = getPos(e);
  lastX = pos.x;
  lastY = pos.y;
  // draw a dot for single taps
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
  // Some devices report 0 pressure for finger touches - treat as full pressure.
  const p = (pressure && pressure > 0) ? pressure : 1;

  const baseSize = parseFloat(sizeSlider.value);
  const opacity = parseFloat(opacitySlider.value) / 100;

  ctx.globalAlpha = opacity;
  ctx.strokeStyle = colorPicker.value;
  ctx.lineWidth = baseSize * p;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  startDraw(e);
});
canvas.addEventListener('pointermove', moveDraw);
canvas.addEventListener('pointerup', endDraw);
canvas.addEventListener('pointercancel', endDraw);
canvas.addEventListener('pointerleave', endDraw);

clearBtn.addEventListener('click', () => {
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
});

saveBtn.addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = 'drawing.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
});
