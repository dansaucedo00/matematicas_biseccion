import { test, expect } from "@playwright/test";

test("flujo completo: cálculo, pasos, gráficos y exportación", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Acércate a la raíz." }),
  ).toBeVisible();
  await expect(page.locator(".root-value")).toHaveText("2.690625");
  await expect(page.locator("#iteration-rows tr")).toHaveCount(5);
  await page.getByRole("button", { name: "Explorar paso a paso" }).click();
  await expect(page.locator("#step-count")).toContainText("k = 0");
  await expect(
    page.getByRole("button", { name: "Iteración anterior" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Iteración siguiente" }).click();
  await expect(page.locator("#step-count")).toContainText("k = 1");
  await expect(page.locator("#step-explanation")).toContainText("Se conserva");
  await page.getByRole("button", { name: "Convergencia", exact: true }).click();
  await expect(page.locator("#chart svg")).toHaveAccessibleName(/Convergencia/);
  await page.getByRole("button", { name: "Función", exact: true }).click();
  await page.locator('[data-example="1"]').click();
  await expect(page.locator(".root-value")).toContainText("1.414");
  const dlPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  const dl = await dlPromise;
  expect(dl.suggestedFilename()).toBe("intervalo-biseccion.json");
  const stream = await dl.createReadStream();
  let text = "";
  for await (const chunk of stream!) text += chunk.toString();
  const data = JSON.parse(text);
  expect(data.result.status).toBe("tolerance");
  expect(data.source).toBe("x^2 - 2");
  expect(data.result.iterations.length).toBeGreaterThan(1);
  const csvPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV", exact: true }).click();
  const csv = await csvPromise;
  expect(csv.suggestedFilename()).toBe("intervalo-biseccion.csv");
  expect(errors).toEqual([]);
});

test("validación, coma decimal y estados especiales", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Función f(x)", { exact: true }).fill("1/x");
  await page.getByLabel("Extremo a", { exact: true }).fill("-1");
  await page.getByLabel("Extremo b", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Calcular raíz" }).click();
  await expect(page.getByRole("alert")).toContainText("denominador");
  await expect(page.locator(".root-value")).toHaveCount(0);
  await page.getByLabel("Función f(x)", { exact: true }).fill("x^2-2");
  await page.getByLabel("Extremo a", { exact: true }).fill("1");
  await page.getByLabel("Extremo b", { exact: true }).fill("2");
  await page.getByLabel("Tolerancia ε", { exact: true }).fill("0,001");
  await page.getByRole("button", { name: "Calcular raíz" }).click();
  await expect(page.locator(".result-status")).toContainText(
    "Tolerancia alcanzada",
  );
  await page.getByLabel("Máx. evaluaciones").fill("1");
  await page.getByRole("button", { name: "Calcular raíz" }).click();
  await expect(page.locator(".result-status")).toContainText(
    "Límite de evaluaciones",
  );
  await page.getByLabel("Función f(x)", { exact: true }).fill("x^2-4");
  await page.getByLabel("Extremo a", { exact: true }).fill("2");
  await page.getByLabel("Extremo b", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Calcular raíz" }).click();
  await expect(page.locator(".result-status")).toContainText(
    "Raíz en un extremo",
  );
  await expect(
    page.getByRole("button", { name: "Convergencia", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Limpiar", exact: true }).click();
  await expect(page.locator("#function")).toHaveValue("");
  await expect(page.locator(".root-value")).toHaveCount(0);
});

test("fundamento, pruebas ejecutables e historial persistente", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Calcular raíz" }).click();
  await expect(page.locator("[data-history]")).toHaveCount(1);
  await page.reload();
  await expect(page.locator("[data-history]")).toHaveCount(1);
  await page.getByRole("link", { name: /Fundamento 02/ }).click();
  await expect(
    page.getByRole("heading", { name: "Una raíz entre dos extremos" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Casos de prueba 03/ }).click();
  await page.getByRole("button", { name: "Ejecutar 12 casos" }).click();
  await expect(page.locator(".test-summary")).toContainText("12 / 12");
  await expect(page.locator(".test-badge.pass")).toHaveCount(12);
  await page.getByRole("link", { name: /Calculadora 01/ }).click();
  await page.getByRole("button", { name: "Borrar historial" }).click();
  await expect(page.locator("[data-history]")).toHaveCount(0);
  await page.reload();
  await expect(page.locator("[data-history]")).toHaveCount(0);
});

test("interfaz móvil sin desbordamiento y sin recursos de Internet", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const remote: string[] = [];
  await page.route("**/*", (route) => {
    const host = new URL(route.request().url()).hostname;
    if (host !== "127.0.0.1" && host !== "localhost") {
      remote.push(host);
      return route.abort();
    }
    return route.continue();
  });
  await page.goto("/");
  await expect(page.locator(".root-value")).toHaveText("2.690625");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "/tmp/intervalo-mobile.png", fullPage: true });
  await page.getByRole("link", { name: /Casos de prueba/ }).click();
  await page.getByRole("button", { name: "Ejecutar 12 casos" }).click();
  await expect(page.locator(".test-summary")).toContainText("12 / 12");
  expect(remote).toEqual([]);
});

test("captura de escritorio", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page.locator(".root-value")).toHaveText("2.690625");
  await page.screenshot({ path: "/tmp/intervalo-desktop.png", fullPage: true });
});

test("accesibilidad de las cuatro secciones", async ({ page }) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await page.goto("/");
  for (const hash of ["#calculadora", "#fundamento", "#pruebas", "#proyecto"]) {
    await page.goto("/" + hash);
    if (hash === "#pruebas")
      await page.getByRole("button", { name: "Ejecutar 12 casos" }).click();
    const report = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      report.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({
          html: n.html,
          summary: n.failureSummary,
        })),
      })),
    ).toEqual([]);
  }
});
