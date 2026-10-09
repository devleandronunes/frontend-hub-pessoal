import { expect, test } from '@playwright/test';
import { login, uniqueTitle } from './helpers';

test.beforeEach(async ({ page }) => {
	await login(page);
});

//========================================
// NOTE ACTIONS
//========================================
// Pins a new note, duplicates it (the URL
// moves to the copy) and exports it as a
// .md download.
//========================================

test('pins, duplicates, and exports a note', async ({ page }) => {
	const title = uniqueTitle('Nota com ações');

	await page.getByRole('button', { name: 'New note' }).click();
	await page.getByLabel('Name').fill(title);
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/notes\/[\w-]+/);

	await page.getByRole('button', { name: 'Pin', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Unpin' })).toBeVisible();

	const originalUrl = page.url();
	await page.getByRole('button', { name: 'Duplicate' }).click();
	await expect.poll(() => page.url()).not.toBe(originalUrl);

	const downloadPromise = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Export .md' }).click();
	const download = await downloadPromise;
	expect(download.suggestedFilename()).toMatch(/\.md$/);
});

//========================================
// NOTE THAT NO LONGER EXISTS
//========================================
// Opens a note id that is not in the
// database: the page says so and no error
// escapes to the browser.
//========================================

test('opening a note that does not exist shows a message without errors', async ({ page }) => {
	const pageErrors: string[] = [];
	page.on('pageerror', (error) => pageErrors.push(error.message));

	await page.goto('/notes/00000000-0000-0000-0000-000000000000');

	await expect(page.getByText('Note not found.')).toBeVisible();
	await expect(page.getByText('That note or folder no longer exists.')).toBeVisible();
	expect(pageErrors).toEqual([]);
});

//========================================
// NOTE ACTION FAILURE
//========================================
// Cuts the pin request and expects a
// message instead of a silent failure.
//========================================

test('shows a message when pinning a note fails', async ({ page }) => {
	const pageErrors: string[] = [];
	page.on('pageerror', (error) => pageErrors.push(error.message));

	await page.getByRole('button', { name: 'New note' }).click();
	await page.getByLabel('Name').fill(uniqueTitle('Nota fixar falha'));
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/notes\/[\w-]+/);

	await page.route('**/pin', (route) => route.abort());
	await page.getByRole('button', { name: 'Pin', exact: true }).click();

	await expect(
		page.getByText("Couldn't reach the server. Check your connection and try again."),
	).toBeVisible();
	expect(pageErrors).toEqual([]);
});
