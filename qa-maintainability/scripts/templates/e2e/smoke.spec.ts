// e2e/smoke.spec.ts: every key page loads without errors, with a single h1, and the form can be filled in.
// Adjust PAGES and the form selectors to the project. Nothing is sent to real services.
// Routes, labels and button texts are those of the Spanish site (/servicios, /contacto, "Mensaje", "Enviar").
import { test, expect } from "@playwright/test";

const PAGES = ["/", "/servicios", "/contacto", "/aviso-legal"];

for (const route of PAGES) {
  test(`smoke ${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    const res = await page.goto(route);
    expect(res?.status(), "HTTP status").toBeLessThan(400);
    await expect(page.locator("h1"), "a single h1").toHaveCount(1);
    await expect(page).not.toHaveTitle(/Create Next App/i);
    expect(errors, "console errors").toEqual([]);
  });
}

test("contact form: accessible fields and intercepted submission", async ({ page }) => {
  await page.goto("/contacto");
  // Server Actions POST to the route itself: intercepted so nothing real is sent
  await page.route("**/contacto", (route) =>
    route.request().method() === "POST" ? route.fulfill({ status: 200, body: "" }) : route.continue(),
  );
  const email = page.getByLabel(/email/i), message = page.getByLabel(/mensaje/i);
  await expect(email, "email field with <label>").toBeVisible({ timeout: 5_000 });
  await email.fill("qa@example.com");
  await message.fill("Prueba automática");
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await expect(page.getByRole("button", { name: /enviar/i })).toBeEnabled();
});

test("custom 404", async ({ page }) => {
  const res = await page.goto("/ruta-que-no-existe-qa");
  expect(res?.status()).toBe(404);
});
