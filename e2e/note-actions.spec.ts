import { test, expect } from "@playwright/test";
import { login, uniqueTitle } from "./helpers";

test.beforeEach(async ({ page }) => {
  await login(page);
});

test("pins, duplicates, and exports a note", async ({ page }) => {
  const title = uniqueTitle("Nota com ações");

  await page.getByRole("button", { name: "New note" }).click();
  await page.getByLabel("Name").fill(title);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/notes\/[\w-]+/);

  await page.getByRole("button", { name: "Pin", exact: true }).click();
  await expect(page.getByRole("button", { name: "Unpin" })).toBeVisible();

  const originalUrl = page.url();
  await page.getByRole("button", { name: "Duplicate" }).click();
  await expect.poll(() => page.url()).not.toBe(originalUrl);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export .md" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.md$/);
});
