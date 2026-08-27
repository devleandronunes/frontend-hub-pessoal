import { test, expect } from "@playwright/test";
import { login, uniqueTitle } from "./helpers";

test("creates a note, syncs it, and finds it in the sync history", async ({ page }) => {
  await login(page);

  const title = uniqueTitle("Nota sincronizada E2E");

  await page.getByRole("button", { name: "New note" }).click();
  await page.getByLabel("Name").fill(title);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/notes\/[\w-]+/);

  await page.getByRole("button", { name: /Local changes|Sync|Remote changes|Diverged/ }).click();

  await expect(page.getByText("Loading the sync plan...")).toBeHidden({ timeout: 10000 });
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("button", { name: /Synced|Sync/ })).toBeVisible({ timeout: 15000 });

  await page.goto("/notes/history");
  await expect(page.getByText("Sync history")).toBeVisible();
  await expect(page.getByText(title, { exact: false })).toBeVisible();
});
