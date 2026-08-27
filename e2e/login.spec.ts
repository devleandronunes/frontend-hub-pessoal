import { test, expect } from "@playwright/test";
import { login, E2E_USERNAME } from "./helpers";

test("login with valid credentials opens the notes app", async ({ page }) => {
  await login(page);

  await expect(page.getByText("Notes", { exact: true })).toBeVisible();
});

test("login with wrong password shows an error and stays on the page", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill(E2E_USERNAME || "dev-user");
  await page.getByLabel("Password").fill("senha-certamente-errada");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page.getByText("Invalid username or password.")).toBeVisible();
  await expect(page).toHaveURL("/login");
});
