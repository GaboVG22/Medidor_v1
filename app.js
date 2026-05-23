const canvas = document.getElementById('photoCanvas');
const ctx = canvas.getContext('2d');

const imageInput = document.getElementById('imageInput');
const knownLengthInput = document.getElementById('knownLength');
const unitSelect = document.getElementById('unitSelect');
const calibrateModeBtn = document.getElementById('calibrateModeBtn');
const saveScaleBtn = document.getElementById('saveScaleBtn');
const outlineModeBtn = document.getElementById('outlineModeBtn');
const closeShapeBtn = document.getElementById('closeShapeBtn');
const undoBtn = document.getElementById('undoBtn');
const clearBtn = document.getElementById('clearBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const exportPngBtn = document.getElementById('exportPngBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const modeLabel = document.getElementById('modeLabel');
const pointerHint = document.getElementById('pointerHint');
const scaleInfo = document.getElementById('scaleInfo');
const resultsBox = document.getElementById('resultsBox');
const historyBox = document.getElementById('historyBox');
const statusBadge = document.getElementById('statusBadge');

const state = {
  img: null,
  imgName: '',
  imageRect: null,
  mode: 'outline',
  isDrawing: false,
  startPoint: null,
  calibrationLine: null,
  pxPerUnit: null,
  unit: 'cm',
  currentPoints: [],
  closedZone: null,
  measurements: []
};

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  render();
}

function fitImageRect() {
  if (!state.img) return null;
  const rect = canvas.getBoundingClientRect();
  const iw = state.img.naturalWidth;
  const ih = state.img.naturalHeight;
  const ratio = Math.min(rect.width / iw, rect.height / ih);
  const w = iw * ratio;
  const h = ih * ratio;
  return { x: (rect.width - w) / 2, y: (rect.height - h) / 2, w, h };
}

function canvasToImagePoint(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const ir = state.imageRect;
  if (!ir) return null;
  const inside = x >= ir.x && x <= ir.x + ir.w && y >= ir.y && y <= ir.y + ir.h;
  const ix = (x - ir.x) * state.img.naturalWidth / ir.w;
  const iy = (y - ir.y) * state.img.naturalHeight / ir.h;
  return { x: clamp(ix, 0, state.img.naturalWidth), y: clamp(iy, 0, state.img.naturalHeight), inside };
}

function imageToCanvasPoint(p) {
  const ir = state.imageRect;
  return {
    x: ir.x + p.x * ir.w / state.img.naturalWidth,
    y: ir.y + p.y * ir.h / state.img.naturalHeight
  };
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

function render() {
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);

  if (!state.img) {
    ctx.fillStyle = '#64748b';
    ctx.font = '600 18px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Carga una fotografía para comenzar', rect.width / 2, rect.height / 2);
    return;
  }

  state.imageRect = fitImageRect();
  const ir = state.imageRect;
  ctx.drawImage(state.img, ir.x, ir.y, ir.w, ir.h);

  ctx.save();
  ctx.beginPath();
  ctx.rect(ir.x, ir.y, ir.w, ir.h);
  ctx.clip();

  if (state.calibrationLine) drawLine(state.calibrationLine[0], state.calibrationLine[1], '#ef4444', 4, 'Calibración');
  if (state.closedZone && state.closedZone.length > 2) drawPolygon(state.closedZone, true);
  if (state.currentPoints.length > 1) drawPolyline(state.currentPoints, '#22c55e', 3);

  ctx.restore();
}

function drawLine(aImg, bImg, color, width, label) {
  const a = imageToCanvasPoint(aImg);
  const b = imageToCanvasPoint(bImg);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(a.x, a.y, 6, 0, Math.PI * 2);
  ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
  ctx.fill();

  if (label) {
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    ctx.font = '700 13px system-ui';
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'white';
    ctx.strokeText(label, midX, midY - 10);
    ctx.fillStyle = color;
    ctx.fillText(label, midX, midY - 10);
  }
}

function drawPolyline(points, color, width) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  points.forEach((p, i) => {
    const c = imageToCanvasPoint(p);
    if (i === 0) ctx.moveTo(c.x, c.y);
    else ctx.lineTo(c.x, c.y);
  });
  ctx.stroke();
}

function drawPolygon(points, fill) {
  ctx.beginPath();
  points.forEach((p, i) => {
    const c = imageToCanvasPoint(p);
    if (i === 0) ctx.moveTo(c.x, c.y);
    else ctx.lineTo(c.x, c.y);
  });
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = 'rgba(34, 197, 94, .22)';
    ctx.fill();
  }
  ctx.strokeStyle = '#16a34a';
  ctx.lineWidth = 4;
  ctx.stroke();
}

function setMode(mode) {
  state.mode = mode;
  modeLabel.textContent = mode === 'calibrate' ? 'Calibrar escala' : 'Delinear zona';
  pointerHint.textContent = mode === 'calibrate'
    ? 'Arrastra sobre una referencia de largo conocido.'
    : 'Dibuja el contorno de la zona con el dedo, mouse o lápiz.';
}

function pointerDown(e) {
  if (!state.img) return;
  const p = canvasToImagePoint(e.clientX, e.clientY);
  if (!p || !p.inside) return;
  e.preventDefault();
  state.isDrawing = true;
  state.startPoint = p;
  if (state.mode === 'calibrate') {
    state.calibrationLine = [p, p];
  } else {
    state.closedZone = null;
    state.currentPoints = [p];
  }
  render();
}

function pointerMove(e) {
  if (!state.img || !state.isDrawing) return;
  const p = canvasToImagePoint(e.clientX, e.clientY);
  if (!p) return;
  e.preventDefault();

  if (state.mode === 'calibrate') {
    state.calibrationLine = [state.startPoint, p];
  } else {
    const last = state.currentPoints[state.currentPoints.length - 1];
    if (!last || dist(last, p) > 2.5) state.currentPoints.push(p);
  }
  render();
}

function pointerUp(e) {
  if (!state.img || !state.isDrawing) return;
  e.preventDefault();
  state.isDrawing = false;

  if (state.mode === 'calibrate') {
    saveScale(false);
  } else if (state.currentPoints.length > 5) {
    pointerHint.textContent = 'Contorno dibujado. Presiona “Cerrar y calcular”.';
  }
  render();
}

function saveScale(showAlert = true) {
  if (!state.calibrationLine || state.calibrationLine.length !== 2) {
    if (showAlert) alert('Primero dibuja una línea de calibración sobre la foto.');
    return;
  }
  const known = Number(knownLengthInput.value);
  if (!known || known <= 0) {
    if (showAlert) alert('Ingresa un largo real mayor que cero.');
    return;
  }
  const px = dist(state.calibrationLine[0], state.calibrationLine[1]);
  if (px < 5) {
    if (showAlert) alert('La línea de calibración es demasiado corta.');
    return;
  }
  state.unit = unitSelect.value;
  state.pxPerUnit = px / known;
  scaleInfo.textContent = `Escala guardada: ${state.pxPerUnit.toFixed(2)} px por ${state.unit}.`;
  statusBadge.textContent = 'Escala lista';
  pointerHint.textContent = 'Ahora delinea la zona a medir.';
}

function closeAndCalculate() {
  if (state.currentPoints.length < 6) {
    alert('Dibuja primero el contorno de la zona.');
    return;
  }
  state.closedZone = simplifyPoints(state.currentPoints, 1.2);
  const metrics = calculateMetrics(state.closedZone);
  state.measurements.unshift(metrics);
  renderResults(metrics);
  renderHistory();
  state.currentPoints = [];
  render();
}

function simplifyPoints(points, tolerance) {
  // Ramer-Douglas-Peucker simplification to smooth shaky finger traces.
  if (points.length <= 3) return points.slice();
  const sqTol = tolerance * tolerance;

  function sqSegDist(p, p1, p2) {
    let x = p1.x;
    let y = p1.y;
    let dx = p2.x - x;
    let dy = p2.y - y;
    if (dx !== 0 || dy !== 0) {
      const t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) { x = p2.x; y = p2.y; }
      else if (t > 0) { x += dx * t; y += dy * t; }
    }
    dx = p.x - x;
    dy = p.y - y;
    return dx * dx + dy * dy;
  }

  function simplifyDPStep(pts, first, last, simplified) {
    let maxSqDist = sqTol;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const sqDist = sqSegDist(pts[i], pts[first], pts[last]);
      if (sqDist > maxSqDist) { index = i; maxSqDist = sqDist; }
    }
    if (index !== -1) {
      if (index - first > 1) simplifyDPStep(pts, first, index, simplified);
      simplified.push(pts[index]);
      if (last - index > 1) simplifyDPStep(pts, index, last, simplified);
    }
  }

  const simplified = [points[0]];
  simplifyDPStep(points, 0, points.length - 1, simplified);
  simplified.push(points[points.length - 1]);
  return simplified;
}

function polygonAreaPx(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

function polygonPerimeterPx(points) {
  let p = 0;
  for (let i = 0; i < points.length; i++) p += dist(points[i], points[(i + 1) % points.length]);
  return p;
}

function boundingBox(points) {
  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  return {
    minX: Math.min(...xs), maxX: Math.max(...xs),
    minY: Math.min(...ys), maxY: Math.max(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys)
  };
}

function pcaExtents(points) {
  const n = points.length;
  const mean = points.reduce((acc, p) => ({ x: acc.x + p.x / n, y: acc.y + p.y / n }), { x: 0, y: 0 });
  let xx = 0, xy = 0, yy = 0;
  points.forEach(p => {
    const dx = p.x - mean.x;
    const dy = p.y - mean.y;
    xx += dx * dx / n;
    xy += dx * dy / n;
    yy += dy * dy / n;
  });
  const angle = 0.5 * Math.atan2(2 * xy, xx - yy);
  const ux = Math.cos(angle), uy = Math.sin(angle);
  const vx = -Math.sin(angle), vy = Math.cos(angle);
  let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
  points.forEach(p => {
    const dx = p.x - mean.x;
    const dy = p.y - mean.y;
    const u = dx * ux + dy * uy;
    const v = dx * vx + dy * vy;
    minU = Math.min(minU, u); maxU = Math.max(maxU, u);
    minV = Math.min(minV, v); maxV = Math.max(maxV, v);
  });
  let length = maxU - minU;
  let width = maxV - minV;
  if (width > length) [length, width] = [width, length];
  return { length, width, angle };
}

function calculateMetrics(points) {
  const areaPx = polygonAreaPx(points);
  const perimeterPx = polygonPerimeterPx(points);
  const box = boundingBox(points);
  const pca = pcaExtents(points);
  const scale = state.pxPerUnit;
  const hasScale = Boolean(scale);
  const unit = state.unit;
  const area = hasScale ? areaPx / (scale * scale) : areaPx;
  const perimeter = hasScale ? perimeterPx / scale : perimeterPx;
  const width = hasScale ? box.width / scale : box.width;
  const height = hasScale ? box.height / scale : box.height;
  const mainLength = hasScale ? pca.length / scale : pca.length;
  const maxWidth = hasScale ? pca.width / scale : pca.width;
  const equivWidth = mainLength > 0 ? area / mainLength : 0;
  const createdAt = new Date();
  return {
    id: createdAt.toISOString(),
    image: state.imgName,
    hasScale,
    unit: hasScale ? unit : 'px',
    area,
    perimeter,
    width,
    height,
    mainLength,
    maxWidth,
    equivWidth,
    points: points.length,
    createdAt: createdAt.toLocaleString('es-CL')
  };
}

function fmt(value, unit, squared = false) {
  if (!Number.isFinite(value)) return '—';
  const digits = Math.abs(value) >= 100 ? 1 : Math.abs(value) >= 10 ? 2 : 3;
  return `${value.toFixed(digits)} ${unit}${squared ? '²' : ''}`;
}

function renderResults(m) {
  const unit = m.unit;
  const precisionNote = m.hasScale
    ? 'Medición con escala calibrada.'
    : 'Medición sin escala real: resultados en pixeles.';

  resultsBox.className = 'results-card';
  resultsBox.innerHTML = `
    <div class="metric"><span>Área aproximada</span><strong>${fmt(m.area, unit, true)}</strong></div>
    <div class="metric"><span>Perímetro aproximado</span><strong>${fmt(m.perimeter, unit)}</strong></div>
    <div class="metric"><span>Largo dominante</span><strong>${fmt(m.mainLength, unit)}</strong></div>
    <div class="metric"><span>Ancho máximo</span><strong>${fmt(m.maxWidth, unit)}</strong></div>
    <div class="metric"><span>Ancho equivalente área/largo</span><strong>${fmt(m.equivWidth, unit)}</strong></div>
    <div class="metric"><span>Ancho x alto en foto</span><strong>${fmt(m.width, unit)} × ${fmt(m.height, unit)}</strong></div>
    <div class="metric"><span>Puntos del contorno</span><strong>${m.points}</strong></div>
    <div class="metric"><span>Nota</span><strong>${precisionNote}</strong></div>
  `;
}

function renderHistory() {
  if (state.measurements.length === 0) {
    historyBox.className = 'history empty-results';
    historyBox.textContent = 'Sin registros.';
    return;
  }
  historyBox.className = 'history';
  historyBox.innerHTML = state.measurements.slice(0, 8).map((m, i) => `
    <div class="history-item">
      <strong>Medición ${state.measurements.length - i} · ${m.createdAt}</strong>
      Área: ${fmt(m.area, m.unit, true)} · Largo: ${fmt(m.mainLength, m.unit)} · Ancho máx.: ${fmt(m.maxWidth, m.unit)}
    </div>
  `).join('');
}

function undoLast() {
  if (state.currentPoints.length > 0) {
    state.currentPoints.splice(Math.max(0, state.currentPoints.length - 20), 20);
  } else if (state.closedZone) {
    state.currentPoints = state.closedZone.slice();
    state.closedZone = null;
  }
  render();
}

function clearZone() {
  state.currentPoints = [];
  state.closedZone = null;
  resultsBox.className = 'empty-results';
  resultsBox.textContent = 'Zona borrada. Delinea una nueva zona para calcular.';
  render();
}

function resetAll() {
  state.calibrationLine = null;
  state.pxPerUnit = null;
  state.currentPoints = [];
  state.closedZone = null;
  state.measurements = [];
  scaleInfo.textContent = 'Escala pendiente.';
  resultsBox.className = 'empty-results';
  resultsBox.textContent = 'Aún no hay medición. Carga una foto, calibra escala y delinea la zona.';
  renderHistory();
  statusBadge.textContent = state.img ? 'Foto cargada' : 'Sin foto';
  render();
}

function exportAnnotatedPng() {
  if (!state.img) { alert('Carga una foto primero.'); return; }
  const link = document.createElement('a');
  render();
  link.download = `foto-medicion-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function exportCsv() {
  if (state.measurements.length === 0) { alert('No hay mediciones para exportar.'); return; }
  const headers = ['fecha','imagen','unidad','area','perimetro','largo_dominante','ancho_maximo','ancho_equivalente','ancho_foto','alto_foto','puntos','con_escala'];
  const rows = state.measurements.map(m => [
    m.createdAt, m.image, m.unit, m.area, m.perimeter, m.mainLength, m.maxWidth, m.equivWidth, m.width, m.height, m.points, m.hasScale ? 'si' : 'no'
  ]);
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replaceAll('"','""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `mediciones-zona-${Date.now()}.csv`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

imageInput.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    state.img = img;
    state.imgName = file.name;
    state.imageRect = fitImageRect();
    statusBadge.textContent = 'Foto cargada';
    pointerHint.textContent = 'Calibra escala o delinea directamente si solo necesitas pixeles.';
    resetAll();
    render();
    URL.revokeObjectURL(url);
  };
  img.src = url;
});

calibrateModeBtn.addEventListener('click', () => setMode('calibrate'));
outlineModeBtn.addEventListener('click', () => setMode('outline'));
saveScaleBtn.addEventListener('click', () => saveScale(true));
closeShapeBtn.addEventListener('click', closeAndCalculate);
undoBtn.addEventListener('click', undoLast);
clearBtn.addEventListener('click', clearZone);
clearAllBtn.addEventListener('click', resetAll);
exportPngBtn.addEventListener('click', exportAnnotatedPng);
exportCsvBtn.addEventListener('click', exportCsv);
unitSelect.addEventListener('change', () => { state.unit = unitSelect.value; });

canvas.addEventListener('pointerdown', pointerDown);
canvas.addEventListener('pointermove', pointerMove);
canvas.addEventListener('pointerup', pointerUp);
canvas.addEventListener('pointercancel', pointerUp);
canvas.addEventListener('pointerleave', pointerUp);
window.addEventListener('resize', resizeCanvas);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}

setMode('outline');
requestAnimationFrame(resizeCanvas);
