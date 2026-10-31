import "./style.css";
import {
  createExpression,
  InputError,
  type Expression,
} from "./expressions/parser";
import { bisection, type Result, type Status } from "./numerical/bisection";
import { examples, theory, validationCases } from "./content";
import { functionChart, convergenceChart } from "./charts";

const icons: Record<string, string> = {
  calculator:
    '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 7h8M8 11h1m6 0h1m-8 4h1m6 0h1m-8 3h1m6 0h1"/>',
  book: '<path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  test: '<path d="M9 3h6m-5 0v6L4 19a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2L14 9V3M7 15h10"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  graph: '<path d="M4 3v17h17M6 16l5-8 4 4 6-8"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
};
const icon = (name: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] ?? icons.info}</svg>`;
const esc = (v: unknown) =>
  String(v)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
const num = (n: number, precision = 10) =>
  n === 0
    ? "0"
    : Math.abs(n) < 1e-5 || Math.abs(n) >= 1e8
      ? n.toExponential(5)
      : Number(n.toPrecision(precision)).toString();
const statuses: Record<Status, string> = {
  tolerance: "Tolerancia alcanzada",
  zero: "Cero numérico encontrado",
  endpoint: "Raíz en un extremo",
  "max-iterations": "Límite de evaluaciones",
  precision: "Límite de precisión",
};
const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
interface Problem {
  source: string;
  a: number;
  b: number;
  tolerance: number;
  maxIterations: number;
}
interface HistoryItem extends Problem {
  date: string;
  root: number;
}
let problem: Problem = {
  source: examples[0].source,
  a: 2.6,
  b: 2.7,
  tolerance: 0.01,
  maxIterations: 100,
};
let result: Result | undefined;
let expression: Expression = createExpression(problem.source);
let selected = 0,
  chartMode = "function",
  activePage = "calculator",
  tableLimit = 100;
let history: HistoryItem[] = [];
try {
  const data: unknown = JSON.parse(
    localStorage.getItem("intervalo-history") ?? "[]",
  );
  if (Array.isArray(data))
    history = data
      .filter(
        (x): x is HistoryItem =>
          x &&
          typeof x.source === "string" &&
          x.source.length <= 300 &&
          typeof x.date === "string" &&
          [x.a, x.b, x.tolerance, x.maxIterations, x.root].every(
            (n) => typeof n === "number" && Number.isFinite(n),
          ),
      )
      .slice(0, 8);
} catch {
  /* Storage is optional, e.g. private browsing. */
}

$("#app").innerHTML = `
<a class="skip-link" href="#main">Saltar al contenido</a>
<aside class="sidebar">
  <a href="#calculadora" class="brand" aria-label="Intervalo, inicio"><span class="brand-symbol">[<i>·</i>]</span><span>intervalo<span class="brand-dot">.</span></span></a>
  <div class="workspace-label">LABORATORIO NUMÉRICO</div>
  <nav aria-label="Navegación principal">
    <a href="#calculadora" data-page="calculator" class="nav-link active">${icon("calculator")}<span>Calculadora</span><span class="nav-index">01</span></a>
    <a href="#fundamento" data-page="theory" class="nav-link">${icon("book")}<span>Fundamento</span><span class="nav-index">02</span></a>
    <a href="#pruebas" data-page="tests" class="nav-link">${icon("test")}<span>Casos de prueba</span><span class="nav-index">03</span></a>
    <a href="#proyecto" data-page="about" class="nav-link">${icon("info")}<span>El proyecto</span><span class="nav-index">04</span></a>
  </nav>
  <div class="sidebar-note"><span class="mini-brackets">[ a, b ]</span><p>Una raíz.<br>Un intervalo a la vez.</p><span>EXPLORA · CALCULA · COMPRENDE</span></div>
  <div class="course-label"><span class="status-dot"></span> Matemática IV <small>Cálculo numérico · Método de bisección</small></div>
</aside>
<div class="app-shell">
<header class="topbar"><span>ESPACIO DE APRENDIZAJE <span class="topbar-slash">/</span> <strong id="breadcrumb">Bisección</strong></span><span class="local-badge"><span class="status-dot"></span> Cálculo local · sin servidor</span></header>
<main id="main" tabindex="-1">
<section id="calculator-page" class="page">
  <div class="page-heading calculator-heading"><div><span class="eyebrow">MÉTODOS PARA ENCONTRAR RESPUESTAS</span><h1>Acércate a la raíz.</h1><p>Explora el método de bisección. Comprende cada paso.</p></div><span class="chapter-badge">01 <span>/ BISECCIÓN</span></span></div>
  <div class="examples-heading"><span class="eyebrow">UN PUNTO DE PARTIDA</span><span>Elige un ejemplo o plantea tu propia función</span></div>
  <div class="example-grid">${examples.map((e, i) => `<button type="button" class="example-card ${i === 0 ? "chosen" : ""}" data-example="${i}"><span class="example-top"><span>${e.tag}</span>${icon("arrow")}</span><strong>${e.formula}</strong><span class="example-bottom">${e.title}<span>[${e.a}, ${e.b}]</span></span></button>`).join("")}</div>
  <div class="workspace-grid">
    <section class="panel input-panel" aria-labelledby="problem-title"><div class="panel-heading"><h2 id="problem-title">Define el problema</h2><span class="step-label">01 / ENTRADA</span></div>
      <form id="problem-form" novalidate>
        <label for="function">Función <span>f(x)</span></label><div class="function-input"><span aria-hidden="true">f(x) =</span><input id="function" name="function" value="${esc(problem.source)}" autocomplete="off" spellcheck="false" aria-describedby="function-help" maxlength="300" required/></div>
        <p class="field-help" id="function-help">Potencias: x^2 · Producto: 5*x · Ángulos en radianes</p>
        <div class="field-pair"><div><label for="lower">Extremo <span>a</span></label><input type="text" inputmode="decimal" id="lower" value="2.6" required/></div><div><label for="upper">Extremo <span>b</span></label><input type="text" inputmode="decimal" id="upper" value="2.7" required/></div></div>
        <div class="field-pair"><div><label for="tolerance">Tolerancia <span>ε</span></label><input type="text" inputmode="decimal" id="tolerance" value="0.01" required/></div><div><label for="max-iterations">Máx. evaluaciones</label><input type="text" inputmode="numeric" id="max-iterations" value="100" required/></div></div>
        <div class="criterion-note">${icon("info")}<span>Parada: <strong>bₖ − aₖ &lt; ε</strong><br>El criterio utilizado en la Unidad 2.</span></div>
        <div id="form-error" class="error-box" role="alert" hidden></div>
        <button class="button primary solve-button" type="submit">Calcular raíz ${icon("arrow")}</button>
        <div class="form-actions"><button type="button" class="text-button" id="step-start">Explorar paso a paso</button><span>·</span><button type="button" class="text-button" id="clear">Limpiar</button></div>
      </form>
      <details class="syntax-help"><summary>Funciones y sintaxis admitidas</summary><p>Usa x, pi, e; +, −, *, /, ^; sin, cos, tan, exp, log, sqrt y abs. Ejemplo: exp(-x) - x. log es el logaritmo natural. Se acepta coma decimal en los campos numéricos; en la función usa punto decimal.</p><p>El dominio se revisa de forma conservadora mediante aritmética de intervalos. Algunas expresiones válidas pueden requerir simplificación o un intervalo menor.</p></details>
    </section>
    <section class="results-column" aria-label="Visualización y resultado">
      <div class="panel graph-panel"><div class="panel-heading graph-heading"><div><h2>El intervalo, en perspectiva</h2><p id="plot-subtitle">Función e intervalo inicial</p></div><div class="segmented" role="group" aria-label="Tipo de gráfico"><button type="button" id="function-tab" class="active" aria-pressed="true">Función</button><button type="button" id="convergence-tab" aria-pressed="false">Convergencia</button></div></div><div id="chart" class="chart"></div><div class="chart-legend"><span><i class="legend-line"></i> f(x)</span><span><i class="legend-area"></i> Intervalo actual</span><span><i class="legend-midpoint"></i> Punto medio</span><span class="legend-note">Gráfico orientativo · cálculos sin redondeo de pantalla</span></div></div>
      <div id="result-summary" aria-live="polite"></div>
    </section>
  </div>
  <section class="panel iterations-panel" aria-labelledby="iterations-title"><div class="panel-heading"><div><span class="eyebrow">EL PROCEDIMIENTO IMPORTA</span><h2 id="iterations-title">Cada paso, a la vista.</h2></div><div class="export-actions"><button type="button" class="button secondary small" id="export-csv">${icon("download")} CSV</button><button type="button" class="button secondary small" id="export-json">JSON</button><button type="button" class="button secondary small" id="print">Imprimir</button></div></div><div id="iteration-content"></div></section>
  <section id="history-section" class="history-section"></section>
  <div class="bottom-note">${icon("book")}<p>¿Por qué funciona? Descubre el teorema que sostiene cada iteración.</p><a href="#fundamento">Explorar el fundamento ${icon("arrow")}</a></div>
</section>
<section id="theory-page" class="page" hidden>${theory}</section>
<section id="tests-page" class="page" hidden><div class="page-heading"><span class="eyebrow">RESULTADOS QUE SE PUEDEN COMPROBAR</span><h1>Pon el método a prueba.</h1><p>Casos reproducibles para verificar resultados, condiciones y mensajes.</p></div><div class="test-intro panel"><div><h2>Una prueba también puede terminar en rechazo.</h2><p>Se verifica tanto el éxito numérico como la detección de entradas no válidas. Los casos con referencia comprueban el error frente a la cota.</p></div><button type="button" class="button primary" id="run-tests">${icon("test")} Ejecutar 12 casos</button></div><div id="test-results" aria-live="polite"><p class="empty-state">Ejecuta los casos para ver sus resultados reales.</p></div><p class="footnote">Referencias: √2 mediante Math.SQRT2; referencias de la cúbica y cos(x) − x precalculadas a mayor precisión. Tolerancia de comparación adicional de 10⁻¹⁴ para redondeo de referencia. Estas verificaciones no sustituyen la batería automática del repositorio.</p></section>
<section id="about-page" class="page" hidden><div class="page-heading"><span class="eyebrow">MATEMÁTICA · PROGRAMACIÓN · ANÁLISIS</span><h1>Entender el camino.<br>No solo la respuesta.</h1><p>Intervalo es un laboratorio educativo de Matemática IV.</p></div><div class="theory-grid"><article class="panel article"><span class="section-number">EL OBJETIVO</span><h2>Del teorema al algoritmo</h2><p>Este proyecto aproxima raíces mediante una implementación propia de bisección. Expone cada decisión, las condiciones de aplicación y el motivo de finalización.</p><p>El alcance es el método asignado al grupo: bisección para ecuaciones no lineales. No se utiliza un solucionador externo de raíces.</p></article><article class="panel article"><span class="section-number">LAS HERRAMIENTAS</span><h2>Un sistema pequeño y transparente</h2><p>TypeScript para el motor numérico y la interfaz; mathjs exclusivamente para analizar y evaluar expresiones; SVG para gráficos locales; Vite para desarrollo y compilación; Vitest y Playwright para pruebas.</p><p>Sin cuentas ni servidor de cálculo. El historial se guarda solo en este navegador, si está disponible el almacenamiento local. Puedes borrarlo desde la calculadora.</p></article><article class="panel article wide"><span class="section-number">PARA LA PRESENTACIÓN</span><h2>Un recorrido sugerido</h2><ol><li>Cargar el ejemplo de clase y explicar las condiciones iniciales.</li><li>Mostrar una reducción en el modo paso a paso.</li><li>Relacionar el ancho del intervalo con la cota del error.</li><li>Comparar x² − 2 con √2 mediante los casos de prueba.</li><li>Probar 1/x en [−1, 1] y explicar por qué no corresponde aplicar Bolzano.</li></ol><p>El informe técnico y los datos de los integrantes se prepararán en una etapa posterior. Las fórmulas y referencias de la asignatura están en Fundamento.</p></article></div></section>
<footer><span>intervalo. <span>Un laboratorio para comprender.</span></span><span>MATEMÁTICA IV / BISECCIÓN</span></footer>
</main></div><div id="toast" role="status" class="toast" hidden></div>`;

function readNumber(id: string, label: string): number {
  const raw = $<HTMLInputElement>(id).value.trim().replace(",", ".");
  if (
    !raw ||
    !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(raw) ||
    !Number.isFinite(Number(raw))
  )
    throw new InputError(`${label}: ingresa un número real finito.`);
  return Number(raw);
}
function readProblem(): Problem {
  return {
    source: $<HTMLInputElement>("#function").value.trim(),
    a: readNumber("#lower", "Extremo a"),
    b: readNumber("#upper", "Extremo b"),
    tolerance: readNumber("#tolerance", "Tolerancia"),
    maxIterations: readNumber("#max-iterations", "Máximo de evaluaciones"),
  };
}
function fillForm(p: Problem) {
  const fields: Record<string, string | number> = {
    "#function": p.source,
    "#lower": p.a,
    "#upper": p.b,
    "#tolerance": p.tolerance,
    "#max-iterations": p.maxIterations,
  };
  Object.entries(fields).forEach(
    ([id, value]) => ($<HTMLInputElement>(id).value = String(value)),
  );
}
function solve(step = false, save = true) {
  const error = $("#form-error");
  error.hidden = true;
  try {
    const next = readProblem(),
      exp = createExpression(next.source);
    const calculation = bisection({ ...next, expression: exp });
    problem = next;
    expression = exp;
    result = calculation;
    selected = step ? 0 : Math.max(0, result.iterations.length - 1);
    tableLimit = 100;
    if (save) {
      history = [
        { ...problem, root: result.root, date: new Date().toISOString() },
        ...history.filter(
          (x) =>
            !(
              x.source === problem.source &&
              x.a === problem.a &&
              x.b === problem.b &&
              x.tolerance === problem.tolerance &&
              x.maxIterations === problem.maxIterations
            ),
        ),
      ].slice(0, 8);
      try {
        localStorage.setItem("intervalo-history", JSON.stringify(history));
      } catch {
        /* The calculator works without storage. */
      }
    }
    renderResults();
    renderHistory();
    if (step)
      $("#step-controls")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
  } catch (e) {
    result = undefined;
    renderResults();
    error.textContent =
      e instanceof Error ? e.message : "No se pudo procesar el problema.";
    error.hidden = false;
  }
}
function renderChart() {
  const row = result?.iterations[selected];
  $("#chart").innerHTML =
    chartMode === "convergence" && result?.iterations.length
      ? convergenceChart(result.iterations, problem.tolerance)
      : functionChart(expression, problem.a, problem.b, row);
  $("#plot-subtitle").textContent =
    chartMode === "convergence"
      ? "Ancho del intervalo · escala logarítmica"
      : row
        ? `f(x) = ${problem.source} · k = ${row.k}`
        : `f(x) = ${problem.source}`;
  $("#function-tab").classList.toggle("active", chartMode === "function");
  $("#convergence-tab").classList.toggle("active", chartMode === "convergence");
  $("#function-tab").setAttribute(
    "aria-pressed",
    String(chartMode === "function"),
  );
  $("#convergence-tab").setAttribute(
    "aria-pressed",
    String(chartMode === "convergence"),
  );
  $(".chart-legend").hidden = chartMode === "convergence";
}
function renderResults() {
  for (const id of ["#export-csv", "#export-json", "#print"])
    $<HTMLButtonElement>(id).disabled = !result;
  $<HTMLButtonElement>("#convergence-tab").disabled =
    !result?.iterations.length;
  if (!result) {
    chartMode = "function";
    $("#result-summary").innerHTML =
      '<div class="empty-result panel"><span class="empty-math">[ a, b ] → c</span><div><h3>Tu próximo resultado empieza aquí.</h3><p>Define una función y calcula para explorar sus iteraciones.</p></div></div>';
    $("#iteration-content").innerHTML =
      '<p class="empty-state">Las iteraciones aparecerán cuando ejecutes un problema válido.</p>';
    renderChart();
    return;
  }
  const r = result,
    ok = ["tolerance", "zero", "endpoint"].includes(r.status);
  const message =
    r.status === "tolerance"
      ? `Ancho final ${num(r.b - r.a)} < ε = ${num(problem.tolerance)}. La cota corresponde al intervalo final.`
      : r.status === "max-iterations"
        ? "Se agotaron las evaluaciones permitidas sin alcanzar la tolerancia. Aumenta el máximo o revisa la precisión solicitada."
        : r.status === "precision"
          ? "El punto medio coincide con un extremo. La representación numérica no permite seguir reduciendo el intervalo."
          : r.status === "endpoint"
            ? "La evaluación de un extremo dio cero. No se requieren puntos medios."
            : "La evaluación del punto medio dio cero en aritmética de máquina; no es una prueba simbólica de exactitud.";
  $("#result-summary").innerHTML =
    `<div class="result-card ${ok ? "" : "warning"}"><div class="result-status">${icon(ok ? "check" : "info")}<span>${statuses[r.status]}</span><span class="result-method">RESULTADO FINAL</span></div><div class="result-main"><div><span class="metric-label">RAÍZ APROXIMADA</span><strong class="root-value" title="${r.root}">${num(r.root, 14)}</strong></div><div class="result-divider"></div><div><span class="metric-label">EVALUACIONES DE c</span><strong class="metric-value">${r.iterations.length}<small>${Math.max(0, r.iterations.length - 1)} reducciones</small></strong></div><div><span class="metric-label">COTA DEL ERROR</span><strong class="metric-value">${num(r.bound)}<small>Residuo: ${num(r.residual)}</small></strong></div></div><p class="result-message">${message}</p></div>`;
  const rows = r.iterations;
  if (!rows.length) {
    $("#iteration-content").innerHTML =
      '<p class="empty-state">La raíz se encontró en un extremo. No hubo iteraciones del punto medio.</p>';
    renderChart();
    return;
  }
  $("#iteration-content").innerHTML =
    `<div class="step-controls" id="step-controls"><div><span class="step-tag">PASO A PASO</span><strong id="step-count">k = ${selected} <span>de ${rows.length - 1}</span></strong></div><div class="step-navigation"><button type="button" class="button secondary small" id="prev-step" aria-label="Iteración anterior">←</button><input type="range" id="step-slider" min="0" max="${rows.length - 1}" value="${selected}" aria-label="Seleccionar iteración"/><button type="button" class="button secondary small" id="next-step" aria-label="Iteración siguiente">→</button></div><span class="count-note">k empieza en 0 · ${rows.length} puntos medios</span></div><div id="step-explanation" class="step-explanation"></div><div class="table-scroll" tabindex="0" role="region" aria-label="Tabla de iteraciones, desplazable"><table><caption class="sr-only">Historial completo de bisección para ${esc(problem.source)}</caption><thead><tr><th scope="col">k</th><th scope="col">aₖ</th><th scope="col">bₖ</th><th scope="col">cₖ · punto medio</th><th scope="col">f(aₖ)</th><th scope="col">f(bₖ)</th><th scope="col">f(cₖ)</th><th scope="col">Ancho Lₖ</th><th scope="col">Cota del error</th></tr></thead><tbody id="iteration-rows"></tbody></table></div><div class="table-footer"><span id="table-count"></span><button type="button" id="show-more" class="text-button" hidden>Mostrar más filas</button><span>Valores de pantalla redondeados · exportación con precisión completa</span></div><div class="analysis-note">${icon("info")}<span>Previsión: ${r.reductionsNeeded} reducciones para ancho &lt; ε (${r.reductionsNeeded + 1} evaluaciones de c), salvo cero numérico o límite de precisión.</span></div>`;
  renderRows();
  updateSelection();
  renderChart();
  $("#prev-step").onclick = () => setStep(selected - 1);
  $("#next-step").onclick = () => setStep(selected + 1);
  $("#step-slider").oninput = (e) =>
    setStep(Number((e.target as HTMLInputElement).value));
  $("#show-more").onclick = () => {
    tableLimit += 100;
    renderRows();
    updateSelection();
  };
}
function renderRows() {
  if (!result) return;
  const rows = result.iterations.slice(0, tableLimit);
  $("#iteration-rows").innerHTML = rows
    .map(
      (row) =>
        `<tr data-k="${row.k}" class="${row.k === selected ? "selected" : ""}"><th scope="row"><button class="row-select" type="button" data-step="${row.k}" aria-label="Ver iteración ${row.k}" aria-pressed="${row.k === selected}">${row.k}</button></th>${[row.a, row.b, row.c, row.fa, row.fb, row.fc, row.width, row.bound].map((n, i) => `<td class="${i === 2 ? "midpoint-cell" : ""}" title="${n}">${num(n)}</td>`).join("")}</tr>`,
    )
    .join("");
  $("#table-count").textContent =
    `${rows.length} de ${result.iterations.length} filas`;
  $("#show-more").hidden = rows.length >= result.iterations.length;
  document
    .querySelectorAll<HTMLButtonElement>("[data-step]")
    .forEach((b) => (b.onclick = () => setStep(Number(b.dataset.step))));
}
function setStep(k: number) {
  if (!result?.iterations.length) return;
  selected = Math.max(0, Math.min(result.iterations.length - 1, k));
  if (selected >= tableLimit) {
    tableLimit = selected + 1;
    renderRows();
  }
  updateSelection();
  renderChart();
}
function updateSelection() {
  const row = result?.iterations[selected];
  if (!row) return;
  $("#step-count").innerHTML =
    `k = ${selected} <span>de ${result!.iterations.length - 1}</span>`;
  $<HTMLInputElement>("#step-slider").value = String(selected);
  $<HTMLButtonElement>("#prev-step").disabled = selected === 0;
  $<HTMLButtonElement>("#next-step").disabled =
    selected === result!.iterations.length - 1;
  const decision =
    row.decision === "stop"
      ? `Finalización: ${statuses[result!.status].toLowerCase()}.`
      : row.decision === "left"
        ? `f(aₖ) y f(cₖ) tienen signos opuestos. Se conserva [${num(row.a)}, ${num(row.c)}].`
        : `f(cₖ) y f(bₖ) tienen signos opuestos. Se conserva [${num(row.c)}, ${num(row.b)}].`;
  $("#step-explanation").innerHTML =
    `<span class="math-chip">cₖ = (${num(row.a)} + ${num(row.b)}) / 2 = <strong>${num(row.c)}</strong></span><span>${decision}</span>`;
  document.querySelectorAll<HTMLTableRowElement>("[data-k]").forEach((tr) => {
    tr.classList.toggle("selected", Number(tr.dataset.k) === selected);
    tr.querySelector("button")?.setAttribute(
      "aria-pressed",
      String(Number(tr.dataset.k) === selected),
    );
  });
}
function renderHistory() {
  $("#history-section").innerHTML = history.length
    ? `<div class="history-heading"><h2>Tu cuaderno reciente</h2><button type="button" id="clear-history" class="text-button">Borrar historial</button></div><div class="history-list">${history.map((h, i) => `<button type="button" class="history-item" data-history="${i}"><span class="history-function">${esc(h.source)}</span><span>[${num(h.a)}, ${num(h.b)}] · ε ${num(h.tolerance)}</span><strong>≈ ${num(h.root)}</strong>${icon("arrow")}</button>`).join("")}</div>`
    : "";
  document.querySelectorAll<HTMLButtonElement>("[data-history]").forEach(
    (b) =>
      (b.onclick = () => {
        const h = history[Number(b.dataset.history)];
        fillForm(h);
        solve(false, false);
        $("#problem-title").scrollIntoView({ behavior: "smooth" });
      }),
  );
  if (history.length)
    $("#clear-history").onclick = () => {
      history = [];
      try {
        localStorage.removeItem("intervalo-history");
      } catch {}
      renderHistory();
      toast("Historial eliminado de este navegador.");
    };
}
function toast(message: string) {
  $("#toast").textContent = message;
  $("#toast").hidden = false;
  window.setTimeout(() => ($("#toast").hidden = true), 3500);
}
function download(kind: "csv" | "json") {
  if (!result) return;
  const content =
    kind === "json"
      ? JSON.stringify(
          {
            method: "bisection",
            criterion: "width < tolerance",
            ...problem,
            result,
          },
          null,
          2,
        )
      : "\uFEFF" +
        [
          ["funcion", problem.source],
          ["criterio", "ancho < tolerancia"],
          ["tolerancia", problem.tolerance],
          ["estado", statuses[result.status]],
          ["raiz", result.root],
          ["residuo", result.residual],
          ["cota_final", result.bound],
          [],
          [
            "k",
            "a",
            "b",
            "c",
            "f(a)",
            "f(b)",
            "f(c)",
            "ancho",
            "cota",
            "decision",
          ],
          ...result.iterations.map((row) => [
            row.k,
            row.a,
            row.b,
            row.c,
            row.fa,
            row.fb,
            row.fc,
            row.width,
            row.bound,
            row.decision,
          ]),
        ]
          .map((row) =>
            row
              .map((v) => {
                const str = String(v);
                const safe =
                  typeof v === "string" && /^[=+\-@\t\r]/.test(str)
                    ? "'" + str
                    : str;
                return '"' + safe.replaceAll('"', '""') + '"';
              })
              .join(","),
          )
          .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([content], {
      type: kind === "csv" ? "text/csv;charset=utf-8" : "application/json",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `intervalo-biseccion.${kind}`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Resultados exportados con precisión completa.");
}
function runCases() {
  let passed = 0;
  const cards = validationCases.map((test, i) => {
    let ok = false,
      detail = "";
    try {
      const r = bisection({
        expression: createExpression(test.source),
        a: test.a,
        b: test.b,
        tolerance: test.tolerance,
        maxIterations: test.max,
      });
      const error =
        test.reference === undefined
          ? undefined
          : Math.abs(r.root - test.reference);
      ok =
        r.status === test.expected &&
        (error === undefined || error <= r.bound + 1e-14);
      detail = `${statuses[r.status]}. Aproximación: ${num(r.root, 14)}. ${error === undefined ? "" : `Error de referencia: ${num(error)}; cota: ${num(r.bound)}.`}`;
    } catch (e) {
      detail = e instanceof Error ? e.message : String(e);
      ok =
        test.expected === "error" &&
        detail.toLowerCase().includes(test.error!.toLowerCase());
    }
    if (ok) passed++;
    return `<article class="test-card panel"><div class="test-card-top"><span class="section-number">CASO ${String(i + 1).padStart(2, "0")}</span><span class="test-badge ${ok ? "pass" : "fail"}">${icon(ok ? "check" : "info")}${ok ? "Verificado" : "Falló"}</span></div><h3>${test.title}</h3><code>${esc(test.source)}</code><p class="test-inputs">[${test.a}, ${test.b}] · ε ${test.tolerance} · máx. ${test.max}</p><p>${esc(detail)}</p><span class="expected-label">Esperado: ${test.expected === "error" ? "rechazo controlado" : statuses[test.expected as Status]}</span></article>`;
  });
  $("#test-results").innerHTML =
    `<div class="test-summary ${passed === validationCases.length ? "" : "has-failures"}"><strong>${passed} / ${validationCases.length}</strong><span>casos verificados en esta ejecución</span></div><div class="test-grid">${cards.join("")}</div>`;
}
function route() {
  const map: Record<string, string> = {
    "#calculadora": "calculator",
    "#fundamento": "theory",
    "#pruebas": "tests",
    "#proyecto": "about",
  };
  activePage = map[location.hash] ?? "calculator";
  ["calculator", "theory", "tests", "about"].forEach(
    (page) => ($(`#${page}-page`).hidden = page !== activePage),
  );
  document.querySelectorAll<HTMLAnchorElement>("[data-page]").forEach((a) => {
    a.classList.toggle("active", a.dataset.page === activePage);
    if (a.dataset.page === activePage) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  $("#breadcrumb").textContent = {
    calculator: "Bisección",
    theory: "Fundamento matemático",
    tests: "Casos de prueba",
    about: "El proyecto",
  }[activePage]!;
  document.title = `${$("#breadcrumb").textContent} — Intervalo`;
}
$("#problem-form").onsubmit = (e) => {
  e.preventDefault();
  solve();
};
$("#step-start").onclick = () => solve(true);
$("#clear").onclick = () => {
  for (const id of ["#function", "#lower", "#upper", "#tolerance"])
    $<HTMLInputElement>(id).value = "";
  $<HTMLInputElement>("#max-iterations").value = "100";
  $("#form-error").hidden = true;
  result = undefined;
  document
    .querySelectorAll(".example-card")
    .forEach((e) => e.classList.remove("chosen"));
  renderResults();
  $<HTMLInputElement>("#function").focus();
};
$("#problem-form").addEventListener("input", () => {
  result = undefined;
  $("#form-error").hidden = true;
  document
    .querySelectorAll(".example-card")
    .forEach((e) => e.classList.remove("chosen"));
  renderResults();
  $("#plot-subtitle").textContent =
    "Vista anterior · calcula para actualizar la función";
});
document.querySelectorAll<HTMLButtonElement>("[data-example]").forEach(
  (b) =>
    (b.onclick = () => {
      const e = examples[Number(b.dataset.example)];
      fillForm({ ...e, maxIterations: 100 });
      solve();
      document
        .querySelectorAll(".example-card")
        .forEach((c) => c.classList.toggle("chosen", c === b));
    }),
);
$("#function-tab").onclick = () => {
  chartMode = "function";
  renderChart();
};
$("#convergence-tab").onclick = () => {
  chartMode = "convergence";
  renderChart();
};
$("#export-csv").onclick = () => download("csv");
$("#export-json").onclick = () => download("json");
$("#print").onclick = () => {
  if (result) {
    tableLimit = result.iterations.length;
    renderRows();
    window.print();
  }
};
$("#run-tests").onclick = runCases;
window.addEventListener("hashchange", () => {
  route();
  $("#main").focus();
  window.scrollTo({ top: 0, behavior: "instant" });
});
solve(false, false);
route();
renderHistory();
