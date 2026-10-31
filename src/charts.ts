import type { Expression } from "./expressions/parser";
import type { Iteration } from "./numerical/bisection";
const esc = (x: string) =>
  x.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
export function functionChart(
  expression: Expression,
  initialA: number,
  initialB: number,
  row?: Iteration,
): string {
  const W = 760,
    H = 310,
    p = { l: 60, r: 28, t: 28, b: 42 };
  const width = initialB - initialA;
  const lo = initialA - width * 0.12,
    hi = initialB + width * 0.12;
  if (![lo, hi, hi - lo].every(Number.isFinite) || hi <= lo)
    return '<p class="empty-state">El intervalo está fuera de la escala gráfica disponible. Consulta los resultados y la tabla numérica.</p>';
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i <= 400; i++) {
    const x = lo + ((hi - lo) * i) / 400;
    try {
      points.push({ x, y: expression.evaluate(x) });
    } catch {
      /* Draw a gap outside the function domain. */
    }
  }
  if (!points.length) return "<p>No hay puntos representables.</p>";
  const ys = points.map((p) => p.y).sort((a, b) => a - b);
  let ymin = Math.min(0, ys[Math.floor(ys.length * 0.025)]),
    ymax = Math.max(0, ys[Math.floor(ys.length * 0.975)]);
  if (ymin === ymax) {
    ymin -= 1;
    ymax += 1;
  }
  const pad = (ymax - ymin) * 0.14;
  ymin -= pad;
  ymax += pad;
  if (![ymin, ymax, ymax - ymin].every(Number.isFinite) || ymax <= ymin)
    return '<p class="empty-state">Los valores están fuera de la escala gráfica disponible. Consulta la tabla numérica.</p>';
  const X = (x: number) => p.l + ((x - lo) / (hi - lo)) * (W - p.l - p.r);
  const Y = (y: number) =>
    H - p.b - ((y - ymin) / (ymax - ymin)) * (H - p.t - p.b);
  const fmt = (n: number) =>
    Math.abs(n) < 1e-9 ? "0" : Number(n.toPrecision(4)).toString();
  let grid = "";
  for (let i = 0; i <= 4; i++) {
    const y = ymin + ((ymax - ymin) * i) / 4;
    grid += `<line x1="${p.l}" x2="${W - p.r}" y1="${Y(y)}" y2="${Y(y)}" class="grid-line"/><text x="${p.l - 12}" y="${Y(y) + 4}" text-anchor="end">${fmt(y)}</text>`;
    const x = initialA + (width * i) / 4;
    grid += `<text x="${X(x)}" y="${H - 15}" text-anchor="middle">${fmt(x)}</text>`;
  }
  let path = "",
    prevX = -Infinity;
  for (const point of points) {
    if (point.y < ymin || point.y > ymax) {
      prevX = -Infinity;
      continue;
    }
    path += `${point.x - prevX > (hi - lo) / 200 ? "M" : "L"}${X(point.x).toFixed(2)},${Y(point.y).toFixed(2)} `;
    prevX = point.x;
  }
  const a = row?.a ?? initialA,
    b = row?.b ?? initialB,
    c = row?.c;
  const mark = (x: number, label: string, cls: string) =>
    `<line x1="${X(x)}" x2="${X(x)}" y1="${p.t}" y2="${H - p.b}" class="${cls}"/><rect x="${X(x) - 15}" y="${p.t - 19}" width="30" height="18" rx="5" class="${cls}-label"/><text x="${X(x)}" y="${p.t - 6}" text-anchor="middle" class="marker-text">${label}</text>`;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de ${esc(expression.source)} en el intervalo inicial. La franja indica el intervalo seleccionado."><defs><clipPath id="plot-area"><rect x="${p.l}" y="${p.t}" width="${W - p.l - p.r}" height="${H - p.t - p.b}"/></clipPath></defs>${grid}<g clip-path="url(#plot-area)"><rect x="${X(a)}" y="${p.t}" width="${Math.max(1, X(b) - X(a))}" height="${H - p.t - p.b}" class="plot-interval"/><line x1="${p.l}" x2="${W - p.r}" y1="${Y(0)}" y2="${Y(0)}" class="zero-line"/><path d="${path}" class="function-line"/></g>${mark(a, "a", "endpoint-line")}${mark(b, "b", "endpoint-line")}${c === undefined ? "" : mark(c, "c", "midpoint-line")}${row ? `<circle cx="${X(row.c)}" cy="${Math.max(p.t, Math.min(H - p.b, Y(row.fc)))}" r="5" class="midpoint-dot" stroke="white" stroke-width="2"/>` : ""}</svg>`;
}
export function convergenceChart(rows: Iteration[], tolerance: number): string {
  const W = 760,
    H = 310,
    l = 65,
    r = 30,
    t = 25,
    b = 40;
  const logs = rows.map((row) => Math.log10(row.width));
  const low = Math.min(...logs, Math.log10(tolerance)) - 0.3,
    high = Math.max(...logs, Math.log10(tolerance)) + 0.3;
  const X = (k: number) => l + (k / Math.max(1, rows.length - 1)) * (W - l - r);
  const Y = (v: number) => H - b - ((v - low) / (high - low)) * (H - t - b);
  let grid = "";
  for (let i = 0; i < 5; i++) {
    const y = low + ((high - low) * i) / 4;
    grid += `<line x1="${l}" x2="${W - r}" y1="${Y(y)}" y2="${Y(y)}" class="grid-line"/><text x="${l - 10}" y="${Y(y) + 4}" text-anchor="end">${(10 ** y).toExponential(1)}</text>`;
  }
  const path = rows
    .map((row, i) => `${i ? "L" : "M"}${X(row.k)},${Y(logs[i])}`)
    .join(" ");
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Convergencia: ancho del intervalo en escala logarítmica frente a k">${grid}<line x1="${l}" x2="${W - r}" y1="${Y(Math.log10(tolerance))}" y2="${Y(Math.log10(tolerance))}" class="tolerance-line" stroke-dasharray="6 5"/><text x="${W - r}" y="${Y(Math.log10(tolerance)) - 8}" text-anchor="end">ε = ${tolerance}</text><path d="${path}" class="function-line"/>${rows.map((row, i) => `<circle cx="${X(row.k)}" cy="${Y(logs[i])}" r="3" class="convergence-dot"/>`).join("")}<text x="${W / 2}" y="${H - 8}" text-anchor="middle">Reducciones k · escala vertical logarítmica</text></svg>`;
}
