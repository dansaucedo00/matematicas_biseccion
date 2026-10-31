import { describe, expect, it } from "vitest";
import { createExpression } from "../src/expressions/parser";
import { bisection, reductionsFor, opposite } from "../src/numerical/bisection";
import { validationCases } from "../src/content";
const solve = (
  source = "x^2-2",
  a = 1,
  b = 2,
  tolerance = 1e-8,
  maxIterations = 100,
) =>
  bisection({
    expression: createExpression(source),
    a,
    b,
    tolerance,
    maxIterations,
  });

describe("Referencia y propiedades matemáticas", () => {
  it("reproduce las cinco filas de la Unidad 2 sin redondeo intermedio", () => {
    const r = solve("x^3-5*x-6", 2.6, 2.7, 0.01);
    expect(r.status).toBe("tolerance");
    expect(r.iterations).toHaveLength(5);
    r.iterations.forEach((row, i) =>
      expect(row.c).toBeCloseTo(
        [2.65, 2.675, 2.6875, 2.69375, 2.690625][i],
        13,
      ),
    );
    expect(r.root).toBeCloseTo(2.690625, 13);
    expect(r.bound).toBeCloseTo(0.003125, 13);
    expect(Math.abs(r.root - 2.689095323637659)).toBeLessThan(r.bound);
  });
  it.each([
    ["x^2-2", 1, 2, Math.SQRT2],
    ["cos(x)-x", 0, 1, 0.7390851332151607],
    ["exp(-x)-x", 0, 1, 0.5671432904097838],
  ] as const)(
    "conserva el encierro y reduce a la mitad: %s",
    (source, a, b, reference) => {
      const r = solve(source, a, b);
      expect(r.status).toBe("tolerance");
      expect(Math.abs(r.root - reference)).toBeLessThanOrEqual(r.bound + 1e-15);
      r.iterations.forEach((row, i) => {
        expect(opposite(row.fa, row.fb)).toBe(true);
        expect(row.a).toBeLessThanOrEqual(reference);
        expect(row.b).toBeGreaterThanOrEqual(reference);
        expect(row.c).toBeGreaterThanOrEqual(row.a);
        expect(row.c).toBeLessThanOrEqual(row.b);
        expect(Math.abs(row.c - reference)).toBeLessThanOrEqual(
          row.bound + 1e-15,
        );
        if (i) expect(row.width).toBeCloseTo(r.iterations[i - 1].width / 2, 14);
      });
    },
  );
  it("estima intervalos extremos sin desbordar el cociente ni la potencia", () => {
    expect(reductionsFor(1e308, 1e-300)).toBe(2020);
  });
  it("aplica ancho < tolerancia y no <=", () => {
    const r = solve("x^2-2", 1, 2, 0.5);
    expect(r.iterations).toHaveLength(3);
    expect(r.iterations.at(-1)!.width).toBe(0.25);
  });
  it("permite terminar con un intervalo inicial menor que la tolerancia", () => {
    const r = solve("x^2-2", 1, 2, 2);
    expect(r.iterations).toHaveLength(1);
    expect(r.root).toBe(1.5);
  });
  it("distingue cero numérico de raíz en un extremo", () => {
    expect(solve("x", -1, 1).status).toBe("zero");
    const r = solve("x^2-4", 2, 3);
    expect(r.status).toBe("endpoint");
    expect(r.iterations).toHaveLength(0);
    expect(r.root).toBe(2);
  });
  it("mantiene coherencia entre intervalo y resultado al agotar el máximo", () => {
    const r = solve("x^2-2", 1, 2, 1e-12, 2);
    expect(r.status).toBe("max-iterations");
    expect(r.root).toBe(1.25);
    expect(r.a).toBe(1);
    expect(r.b).toBe(1.5);
    expect(r.bound).toBe(0.25);
  });
  it("detecta agotamiento de precisión sin anunciar convergencia", () => {
    const expr = {
      source: "custom",
      evaluate: (x: number) => (x === 1 ? -1 : 1),
      validateInterval: () => {},
    };
    const r = bisection({
      expression: expr,
      a: 1,
      b: 1 + Number.EPSILON,
      tolerance: 1e-30,
      maxIterations: 100,
    });
    expect(r.status).toBe("precision");
    expect(r.bound).toBe(Number.EPSILON);
  });
  it("compara signos sin multiplicar valores que pueden desbordar", () => {
    const r = solve("1e200*(x-1.3)", 1, 2, 0.001);
    expect(r.status).toBe("tolerance");
  });
  it.each([
    [0.1, 0.01, 4],
    [1, 0.5, 2],
    [1, 1, 1],
    [1, 2, 0],
    [1, 1 / 8, 4],
    [1e-300, 1e-310, 34],
  ])("estima reducciones estrictas para %s y %s", (width, tol, k) => {
    expect(reductionsFor(width, tol)).toBe(k);
  });
});
describe("Casos documentados en la interfaz", () => {
  it.each(validationCases)("$title", (test) => {
    const run = () =>
      solve(test.source, test.a, test.b, test.tolerance, test.max);
    if (test.expected === "error")
      expect(run).toThrow(new RegExp(test.error!, "i"));
    else {
      const r = run();
      expect(r.status).toBe(test.expected);
      if (test.reference !== undefined)
        expect(Math.abs(r.root - test.reference)).toBeLessThanOrEqual(
          r.bound + 1e-14,
        );
    }
  });
});
describe("Entradas y dominios", () => {
  it.each([0, -1, NaN, Infinity])("rechaza tolerancia %s", (tol) =>
    expect(() => solve("x", -1, 1, tol)).toThrow("tolerancia"),
  );
  it.each([0, -1, 1.5, 10001, NaN, Infinity])("rechaza máximo %s", (max) =>
    expect(() => solve("x", -1, 1, 0.01, max)).toThrow("entero"),
  );
  it.each([
    [2, 1],
    [1, 1],
    [NaN, 2],
    [-Infinity, 2],
    [-1e308, 1e308],
  ])("rechaza intervalo [%s,%s]", (a, b) =>
    expect(() => solve("x", a, b)).toThrow(),
  );
  it.each([
    "",
    "x=2",
    "x; 2",
    'import("x")',
    "y+2",
    "random()",
    "[1,2]",
    "x!",
    "sin(x,2)",
    "x>1",
    "x and 2",
  ])("rechaza expresión no admitida: %s", (source) =>
    expect(() => createExpression(source)).toThrow(),
  );
  it.each([
    ["1/x", -1, 1],
    ["tan(x)", 1, 2],
    ["log(x)", -1, 2],
    ["sqrt(x)", -1, 1],
    ["x^x", 1, 2],
    ["x^-2", -1, 1],
  ])("rechaza dominio no certificable: %s", (source, a, b) =>
    expect(() =>
      createExpression(String(source)).validateInterval(Number(a), Number(b)),
    ).toThrow(),
  );
  it.each([
    "sin(x)",
    "cos(x)",
    "tan(x)",
    "exp(x)",
    "log(x)",
    "sqrt(x)",
    "abs(x)",
    "x^2",
    "2^3",
    "pi*x-e",
    "2x",
  ])("admite expresión %s", (source) => {
    const e = createExpression(source);
    e.validateInterval(0.5, 1);
    expect(Number.isFinite(e.evaluate(0.75))).toBe(true);
  });
  it("rechaza valores complejos y desbordamientos", () => {
    expect(() => createExpression("sqrt(x)").evaluate(-1)).toThrow(
      "real finito",
    );
    expect(() => createExpression("exp(x)").evaluate(1000)).toThrow(
      "real finito",
    );
  });
  it("limita la complejidad y longitud", () => {
    expect(() => createExpression("x+".repeat(200) + "1")).toThrow("300");
    expect(() => createExpression("x+".repeat(60) + "1")).toThrow("compleja");
  });
});
