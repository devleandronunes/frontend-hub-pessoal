import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { login, E2E_USERNAME } from "./helpers";

test("login with valid credentials opens the notes app", async ({ page }) => {
  await login(page);

  await expect(page).toHaveURL("/notes");
  await expect(page.getByRole("button", { name: "New note" })).toBeVisible();
});

test("login with wrong password shows an error and stays on the page", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill(E2E_USERNAME || "dev-user");
  await page.getByLabel("Password").fill("senha-certamente-errada");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page.getByText("Invalid username or password.")).toBeVisible();
  await expect(page).toHaveURL("/login");
});

// Checagem de a11y só nas violações que quebrariam a experiência de verdade (critical/serious) —
// mesma filosofia de "vocabulário pequeno" das outras categorias de teste desta frente.
test("login screen has no serious a11y violations", async ({ page }) => {
  await page.goto("/login");

  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious"
  );

  expect(serious).toEqual([]);
});
