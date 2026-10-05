import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { login } from "./helpers";

test.beforeEach(async ({ page }) => {
  await login(page);
});

//========================================
// APP SIDEBAR AS AN ICON RAIL
//========================================
// Minimizes the app sidebar to the icon
// rail, checks navigation, logout and
// accessibility there, and that the state
// survives a reload.
//========================================

test("minimizes the app sidebar to an icon rail and remembers it", async ({ page }) => {
  await page.getByRole("button", { name: "Minimize app sidebar" }).click();

  await expect(page.getByRole("heading", { name: "Personal Hub" })).toBeHidden();
  await expect(page.getByRole("link", { name: "Notes" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: "Home" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();

  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((v) => v.impact === "critical" || v.impact === "serious");
  expect(serious).toEqual([]);

  await page.reload();
  await expect(page.getByRole("button", { name: "Expand app sidebar" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Personal Hub" })).toBeHidden();

  await page.getByRole("button", { name: "Expand app sidebar" }).click();
  await expect(page.getByRole("heading", { name: "Personal Hub" })).toBeVisible();
});

//========================================
// NOTES TREE STATE AFTER RELOAD
//========================================
// Collapses the notes tree, reloads and
// expects it to stay collapsed until it
// is expanded again.
//========================================

test("remembers the collapsed notes tree after a reload", async ({ page }) => {
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(page.getByRole("button", { name: "New note" })).toBeHidden();

  await page.reload();
  await expect(page.getByRole("button", { name: "New note" })).toBeHidden();

  await page.getByRole("button", { name: "Expand sidebar" }).click();
  await expect(page.getByRole("button", { name: "New note" })).toBeVisible();
});
