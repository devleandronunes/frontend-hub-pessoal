import { test, expect } from "@playwright/test";
import { login, uniqueTitle } from "./helpers";

test.beforeEach(async ({ page }) => {
  await login(page);
});

test("creates a note, edits it, and confirms auto-save", async ({ page }) => {
  const title = uniqueTitle("Nota E2E");

  await page.getByRole("button", { name: "New note" }).click();
  await page.getByLabel("Name").fill(title);
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/notes\/[\w-]+/);

  await page.getByRole("button", { name: "Editor" }).click();
  await page.getByPlaceholder("Write markdown...").fill("Conteúdo escrito pelo Playwright.");

  await expect(page.getByText("Saved")).toBeVisible({ timeout: 3000 });

  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.getByText("Conteúdo escrito pelo Playwright.")).toBeVisible();
});

test("renames and deletes a note from the tree", async ({ page }) => {
  const title = uniqueTitle("Nota para apagar");
  const renamed = uniqueTitle("Nota renomeada");

  await page.getByRole("button", { name: "New note" }).click();
  await page.getByLabel("Name").fill(title);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/notes\/[\w-]+/);

  const treeItem = page.getByText(title, { exact: true });
  await treeItem.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Rename" }).click();
  await page.getByLabel("Name").fill(renamed);
  await page.keyboard.press("Enter");

  await expect(page.getByText(renamed, { exact: true })).toBeVisible();

  await page.getByText(renamed, { exact: true }).click({ button: "right" });
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete" }).click();

  await expect(page.getByText(renamed, { exact: true })).not.toBeVisible();
});
