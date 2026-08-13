// Рисование фигур для «Логических таблиц» через SVG. Только для браузера
// (использует document.createElementNS) — логика генератора отдельно, в generator.js.
const NS = 'http://www.w3.org/2000/svg';

function svg(tag, attrs) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

function polygonPoints(cx, cy, r, sides, rotationDeg = -90) {
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const angle = ((rotationDeg + (i * 360) / sides) * Math.PI) / 180;
    pts.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return pts.join(' ');
}

// Рисует одну фигуру из набора SHAPES, центр (cx,cy), характерный радиус r.
function shapeNode(kind, cx, cy, r, { filled = false, dashed = false } = {}) {
  const style = {
    stroke: 'currentColor',
    'stroke-width': 4,
    fill: filled ? 'currentColor' : 'none',
    ...(dashed ? { 'stroke-dasharray': '7 5' } : {}),
  };
  switch (kind) {
    case 'circle':
      return svg('circle', { cx, cy, r: r * 0.85, ...style });
    case 'oval':
      return svg('ellipse', { cx, cy, rx: r * 1.05, ry: r * 0.72, ...style });
    case 'square':
      return svg('rect', { x: cx - r * 0.8, y: cy - r * 0.8, width: r * 1.6, height: r * 1.6, ...style });
    case 'triangle':
      return svg('polygon', { points: polygonPoints(cx, cy, r, 3), ...style });
    case 'diamond':
      return svg('polygon', { points: polygonPoints(cx, cy, r, 4), ...style });
    case 'pentagon':
      return svg('polygon', { points: polygonPoints(cx, cy, r, 5), ...style });
    case 'hexagon':
      return svg('polygon', { points: polygonPoints(cx, cy, r, 6, -90), ...style });
    case 'trapezoid': {
      const pts = `${cx - r * 0.55},${cy - r * 0.65} ${cx + r * 0.55},${cy - r * 0.65} `
        + `${cx + r * 0.95},${cy + r * 0.65} ${cx - r * 0.95},${cy + r * 0.65}`;
      return svg('polygon', { points: pts, ...style });
    }
    default:
      return svg('circle', { cx, cy, r: r * 0.85, ...style });
  }
}

function makeSvg(viewBox) {
  const node = svg('svg', { viewBox, class: 'matrix-svg' });
  return node;
}

function renderPair({ a, b }) {
  const node = makeSvg('0 0 200 100');
  node.append(
    svg('rect', { x: 4, y: 4, width: 192, height: 92, rx: 12, stroke: 'currentColor', 'stroke-width': 3, fill: 'none' }),
    shapeNode(a, 60, 50, 30),
    shapeNode(b, 140, 50, 30),
  );
  return node;
}

function renderHouse({ roof, window: win }) {
  const node = makeSvg('0 0 120 120');
  node.append(svg('rect', { x: 25, y: 62, width: 70, height: 50, stroke: 'currentColor', 'stroke-width': 4, fill: 'none' }));

  if (roof === 'peak') {
    node.append(svg('polygon', { points: '18,62 60,20 102,62', stroke: 'currentColor', 'stroke-width': 4, fill: 'none' }));
  } else if (roof === 'hip') {
    node.append(svg('polygon', { points: '15,62 38,28 82,28 105,62', stroke: 'currentColor', 'stroke-width': 4, fill: 'none' }));
  } else {
    node.append(svg('path', { d: 'M 18 62 A 42 42 0 0 1 102 62 Z', stroke: 'currentColor', 'stroke-width': 4, fill: 'none' }));
  }

  if (win === 'square') {
    node.append(svg('rect', { x: 48, y: 85, width: 24, height: 20, stroke: 'currentColor', 'stroke-width': 3, fill: 'none' }));
  } else if (win === 'arch') {
    node.append(svg('path', { d: 'M 48 105 V 93 A 12 12 0 0 1 72 93 V 105 Z', stroke: 'currentColor', 'stroke-width': 3, fill: 'none' }));
  }
  return node;
}

function renderSize({ shape, scale }) {
  const node = makeSvg('0 0 100 100');
  node.append(shapeNode(shape, 50, 50, 38 * scale));
  return node;
}

function renderTriple({ shape, scale, style }) {
  const node = makeSvg('0 0 100 100');
  node.append(shapeNode(shape, 50, 50, 38 * scale, { filled: style === 'filled', dashed: style === 'dashed' }));
  return node;
}

const STROKE = { stroke: 'currentColor', 'stroke-width': 5, fill: 'none' };

function renderRotate({ shape, angle }) {
  const node = makeSvg('0 0 100 100');
  const g = svg('g', { transform: `rotate(${angle} 50 50)` });
  if (shape === 'arrow') {
    g.append(svg('polygon', { points: '20,42 55,42 55,28 82,50 55,72 55,58 20,58', ...STROKE }));
  } else if (shape === 'flag') {
    g.append(
      svg('line', { x1: 38, y1: 20, x2: 38, y2: 80, ...STROKE }),
      svg('polygon', { points: '38,24 74,34 38,46', ...STROKE }),
    );
  } else if (shape === 'ell') {
    g.append(svg('path', { d: 'M 36 24 V 72 H 72', ...STROKE, 'stroke-width': 9 }));
  } else {
    g.append(
      svg('rect', { x: 26, y: 26, width: 48, height: 48, ...STROKE }),
      svg('circle', { cx: 35, cy: 35, r: 5, fill: 'currentColor', stroke: 'none' }),
    );
  }
  node.append(g);
  return node;
}

export function renderCell(cellData) {
  switch (cellData.type) {
    case 'pair': return renderPair(cellData);
    case 'house': return renderHouse(cellData);
    case 'size': return renderSize(cellData);
    case 'triple': return renderTriple(cellData);
    case 'rotate': return renderRotate(cellData);
    default: return makeSvg('0 0 100 100');
  }
}
