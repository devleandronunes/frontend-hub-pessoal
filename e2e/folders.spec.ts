import { test, expect } from "@playwright/test";
import { login, uniqueTitle } from "./helpers";

test.beforeEach(async ({ page }) => {
  await login(page);
});

test("creates, renames, and deletes an empty folder", async ({ page }) => {
  const name = uniqueTitle("Pasta E2E");
  const renamed = uniqueTitle("Pasta renomeada");

  await page.getByRole("button", { name: "New folder" }).click();
  await page.getByLabel("Name").fill(name);
  await page.keyboard.press("Enter");

  await expect(page.getByText(name, { exact: true })).toBeVisible();

  await page.getByText(name, { exact: true }).click({ button: "right" });
  await page.getByRole("menuitem", { name: "Rename" }).click();
  await page.getByLabel("Name").fill(renamed);
  await page.keyboard.press("Enter");

  await expect(page.getByText(renamed, { exact: true })).toBeVisible();

  await page.getByText(renamed, { exact: true }).click({ button: "right" });
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete" }).click();

  await expect(page.getByText(renamed, { exact: true })).not.toBeVisible();
});
