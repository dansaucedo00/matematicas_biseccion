import { InputError, type Expression } from "../expressions/parser";

export interface Parameters {
  expression: Expression;
  a: number;
  b: number;
  tolerance: number;
  maxIterations: number;
}
export type Status =
  | "tolerance"
  | "zero"
  | "endpoint"
  | "max-iterations"
  | "precision";
export interface Iteration {
  k: number;
  a: number;
  b: number;
  c: number;
  fa: number;
  fb: number;
  fc: number;
  width: number;
  bound: number;
  decision: "left" | "right" | "stop";
}
export interface Result {
  root: number;
  residual: number;
  a: number;
  b: number;
  bound: number;
  status: Status;
  iterations: Iteration[];
  reductionsNeeded: number;
}
export const opposite = (a: number, b: number) =>
  (a < 0 && b > 0) || (a > 0 && b < 0);

/** Number of halvings for the strict width < tolerance criterion (k starts at 0). */
export function reductionsFor(width: number, tolerance: number): number {
  // Repeated halving avoids overflow in 2**k and in width/tolerance.
  let k = 0;
  while (width >= tolerance) {
    width /= 2;
    k++;
  }
  return k;
}

/** Pure bisection implementation: no external root-finding solver is used. */
export function bisection({
  expression,
  a: initialA,
  b: initialB,
  tolerance,
  maxIterations,
}: Parameters): Result {
  if (![initialA, initialB].every(Number.isFinite))
    throw new InputError("Los extremos deben ser números reales finitos.");
  if (initialA >= initialB)
    throw new InputError("El extremo a debe ser menor que b.");
  if (!Number.isFinite(initialB - initialA))
    throw new InputError(
      "El intervalo es demasiado amplio para la precisión disponible.",
    );
  if (!Number.isFinite(tolerance) || tolerance <= 0)
    throw new InputError("La tolerancia debe ser un número positivo y finito.");
  if (
    !Number.isInteger(maxIterations) ||
    maxIterations < 1 ||
    maxIterations > 10000
  )
    throw new InputError(
      "El máximo de evaluaciones debe ser un entero entre 1 y 10000.",
    );
  let a = initialA,
    b = initialB;
  const reductionsNeeded = reductionsFor(b - a, tolerance);
  let fa = expression.evaluate(a),
    fb = expression.evaluate(b);
  const iterations: Iteration[] = [];
  const finish = (
    root: number,
    residual: number,
    bound: number,
    status: Status,
  ): Result => ({
    root,
    residual: Math.abs(residual),
    a,
    b,
    bound,
    status,
    iterations,
    reductionsNeeded,
  });
  // A zero at an endpoint is a solution even when there is no sign change.
  if (fa === 0) return finish(a, 0, 0, "endpoint");
  if (fb === 0) return finish(b, 0, 0, "endpoint");
  expression.validateInterval(a, b);
  if (!opposite(fa, fb))
    throw new InputError(
      "No hay cambio de signo entre f(a) y f(b). No se puede iniciar bisección con este intervalo; esto no demuestra que no existan raíces.",
    );
  for (let k = 0; k < maxIterations; k++) {
    const width = b - a;
    const c = a + width / 2;
    const fc = expression.evaluate(c);
    const decision = opposite(fa, fc) ? "left" : "right";
    const row: Iteration = {
      k,
      a,
      b,
      c,
      fa,
      fb,
      fc,
      width,
      bound: Math.max(c - a, b - c),
      decision,
    };
    iterations.push(row);
    if (fc === 0) {
      row.decision = "stop";
      return finish(c, fc, 0, "zero");
    }
    if (width < tolerance) {
      row.decision = "stop";
      return finish(c, fc, row.bound, "tolerance");
    }
    if (c === a || c === b) {
      row.decision = "stop";
      return finish(c, fc, row.bound, "precision");
    }
    // Keep the last evaluated interval consistent with the returned midpoint.
    if (k === maxIterations - 1) {
      row.decision = "stop";
      return finish(c, fc, row.bound, "max-iterations");
    }
    if (decision === "left") {
      b = c;
      fb = fc;
    } else {
      a = c;
      fa = fc;
    }
  }
  throw new Error("Estado inalcanzable");
}
