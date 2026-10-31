import { parse, type MathNode } from "mathjs";

export class InputError extends Error {}
export interface Expression {
  source: string;
  evaluate: (x: number) => number;
  /** Conservative interval arithmetic certifies continuity for the admitted grammar. */
  validateInterval: (a: number, b: number) => void;
}
type Range = [number, number];
type Node = MathNode & {
  value?: number;
  name?: string;
  op?: string;
  args?: Node[];
  content?: Node;
  fn?: Node;
};
const functions = new Set(["sin", "cos", "tan", "exp", "log", "sqrt", "abs"]);
const operators = new Set(["+", "-", "*", "/", "^"]);

function validate(node: Node): void {
  if (
    node.type === "ConstantNode" &&
    typeof node.value === "number" &&
    Number.isFinite(node.value)
  )
    return;
  if (node.type === "SymbolNode" && ["x", "pi", "e"].includes(node.name!))
    return;
  if (node.type === "ParenthesisNode") return validate(node.content!);
  if (
    node.type === "OperatorNode" &&
    operators.has(node.op!) &&
    node.args!.length <= 2
  ) {
    node.args!.forEach(validate);
    return;
  }
  if (
    node.type === "FunctionNode" &&
    node.fn?.type === "SymbolNode" &&
    functions.has(node.fn.name!) &&
    node.args!.length === 1
  ) {
    node.args!.forEach(validate);
    return;
  }
  throw new InputError(
    "Expresión no admitida. Usa solo x, pi, e, +, −, *, /, ^ y sin, cos, tan, exp, log, sqrt o abs.",
  );
}
function range(node: Node, x: Range): Range {
  if (node.type === "ConstantNode") return [node.value!, node.value!];
  if (node.type === "SymbolNode")
    return node.name === "x"
      ? x
      : node.name === "pi"
        ? [Math.PI, Math.PI]
        : [Math.E, Math.E];
  if (node.type === "ParenthesisNode") return range(node.content!, x);
  const args = node.args!.map((n) => range(n, x));
  const [a, b] = args[0];
  if (node.type === "FunctionNode") {
    switch (node.fn!.name) {
      case "sin":
      case "cos":
        return [-1, 1];
      case "abs":
        return [
          a <= 0 && b >= 0 ? 0 : Math.min(Math.abs(a), Math.abs(b)),
          Math.max(Math.abs(a), Math.abs(b)),
        ];
      case "sqrt":
        if (a < 0)
          throw new InputError(
            "No se puede certificar el dominio de sqrt en todo el intervalo. Su argumento debe ser ≥ 0; revisa o reduce el intervalo.",
          );
        return [Math.sqrt(a), Math.sqrt(b)];
      case "log":
        if (a <= 0)
          throw new InputError(
            "No se puede certificar el dominio de log en todo el intervalo. Su argumento debe ser > 0; revisa o reduce el intervalo.",
          );
        return [Math.log(a), Math.log(b)];
      case "exp":
        return [Math.exp(a), Math.exp(b)];
      case "tan": {
        if (
          !Number.isFinite(a) ||
          !Number.isFinite(b) ||
          Math.ceil((a - Math.PI / 2) / Math.PI) <=
            Math.floor((b - Math.PI / 2) / Math.PI)
        ) {
          throw new InputError(
            "El argumento de tan puede atravesar una discontinuidad. Elige otro intervalo.",
          );
        }
        return [Math.tan(a), Math.tan(b)];
      }
    }
  }
  if (args.length === 1) return node.op === "-" ? [-b, -a] : [a, b];
  const [c, d] = args[1];
  switch (node.op) {
    case "+":
      return [a + c, b + d];
    case "-":
      return [a - d, b - c];
    case "*": {
      const values = [a * c, a * d, b * c, b * d];
      return [Math.min(...values), Math.max(...values)];
    }
    case "/": {
      if (c <= 0 && d >= 0)
        throw new InputError(
          "El denominador puede valer cero en el intervalo. No se puede certificar continuidad; revisa o reduce el intervalo.",
        );
      const values = [a / c, a / d, b / c, b / d];
      return [Math.min(...values), Math.max(...values)];
    }
    case "^": {
      if (c !== d || !Number.isFinite(c))
        throw new InputError(
          "Los exponentes deben ser constantes finitas. Usa exp para expresiones exponenciales con x.",
        );
      if (!Number.isInteger(c) && a <= 0)
        throw new InputError(
          "Las potencias no enteras requieren una base positiva en todo el intervalo.",
        );
      if (c < 0 && a <= 0 && b >= 0)
        throw new InputError(
          "Una potencia negativa puede dividir por cero en este intervalo.",
        );
      const values = [a ** c, b ** c];
      if (c > 0 && Number.isInteger(c) && c % 2 === 0 && a <= 0 && b >= 0)
        values.push(0);
      return [Math.min(...values), Math.max(...values)];
    }
  }
  throw new InputError("No se pudo analizar el dominio de la expresión.");
}

export function createExpression(input: string): Expression {
  const source = input.trim().replaceAll("−", "-").replaceAll("π", "pi");
  if (!source)
    throw new InputError("Ingresa una función, por ejemplo x^3 - 5*x - 6.");
  if (source.length > 300)
    throw new InputError("La función no puede superar los 300 caracteres.");
  let node: Node;
  try {
    node = parse(source) as Node;
  } catch {
    throw new InputError(
      "La función tiene un error de sintaxis. Revisa los paréntesis y las operaciones.",
    );
  }
  let count = 0;
  node.traverse(() => {
    count++;
  });
  if (count > 100)
    throw new InputError(
      "La expresión es demasiado compleja. Simplifícala antes de continuar.",
    );
  validate(node);
  const compiled = node.compile();
  return {
    source,
    evaluate(x) {
      let value: unknown;
      try {
        value = compiled.evaluate({ x });
      } catch {
        throw new InputError(
          `No se pudo evaluar la función en x = ${x}. Revisa su dominio.`,
        );
      }
      if (typeof value !== "number" || !Number.isFinite(value))
        throw new InputError(
          `La función no produce un número real finito en x = ${x}. Puede haber división por cero, un problema de dominio o desbordamiento.`,
        );
      return value;
    },
    validateInterval(a, b) {
      const bounds = range(node, [a, b]);
      if (bounds.some((n) => !Number.isFinite(n)))
        throw new InputError(
          "El análisis del intervalo produce valores fuera del rango numérico. Reduce el intervalo o simplifica la expresión.",
        );
    },
  };
}
