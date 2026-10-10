import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { login, uniqueTitle } from './helpers';

test.beforeEach(async ({ page }) => {
	await login(page);
});

//========================================
// NOTE CREATION AND AUTO-SAVE
//========================================
// Creates a note from the tree, types in
// the editor, waits for "Saved" and checks
// the content in the preview.
//========================================

test('creates a note, edits it, and confirms auto-save', async ({ page }) => {
	const title = uniqueTitle('Nota E2E');

	await page.getByRole('button', { name: 'New note' }).click();
	await page.getByLabel('Name').fill(title);
	await page.keyboard.press('Enter');

	await expect(page).toHaveURL(/\/notes\/[\w-]+/);

	await page.getByRole('button', { name: 'Editor' }).click();
	await page.getByPlaceholder('Write markdown...').fill('Conteúdo escrito pelo Playwright.');

	await expect(page.getByText('Saved')).toBeVisible({ timeout: 3000 });

	await page.getByRole('button', { name: 'Preview' }).click();
	await expect(page.getByText('Conteúdo escrito pelo Playwright.')).toBeVisible();
});

//========================================
// RENAME AND DELETE FROM THE TREE
//========================================
// Renames a note through the context menu
// and deletes it after confirming.
//========================================

test('renames and deletes a note from the tree', async ({ page }) => {
	const title = uniqueTitle('Nota para apagar');
	const renamed = uniqueTitle('Nota renomeada');

	await page.getByRole('button', { name: 'New note' }).click();
	await page.getByLabel('Name').fill(title);
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/notes\/[\w-]+/);

	const treeItem = page.getByText(title, { exact: true });
	await treeItem.click({ button: 'right' });
	await page.getByRole('menuitem', { name: 'Rename' }).click();
	await page.getByLabel('Name').fill(renamed);
	await page.keyboard.press('Enter');

	await expect(page.getByText(renamed, { exact: true })).toBeVisible();

	await page.getByText(renamed, { exact: true }).click({ button: 'right' });
	await page.getByRole('menuitem', { name: 'Delete' }).click();
	await page.getByRole('button', { name: 'Delete' }).click();

	await expect(page.getByText(renamed, { exact: true })).not.toBeVisible();
});

//========================================
// CONTENT WITH SHELL COMMANDS AND ACCENTS
//========================================
// Saves content that the hosting firewall
// used to block (a line starting with
// `curl ... | sh`) and reloads to confirm
// it was stored as typed.
//========================================

test('saves content with shell commands and accents', async ({ page }) => {
	const title = uniqueTitle('Conexão servidor');
	const content = '# Conexão\n```\ncurl -fsSL https://example.com/install.sh | sh\n```';

	await page.getByRole('button', { name: 'New note' }).click();
	await page.getByLabel('Name').fill(title);
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/notes\/[\w-]+/);

	await page.getByRole('button', { name: 'Editor' }).click();
	await page.getByPlaceholder('Write markdown...').fill(content);
	await expect(page.getByText('Saved')).toBeVisible({ timeout: 3000 });

	await page.reload();
	await page.getByRole('button', { name: 'Editor' }).click();
	await expect(page.getByPlaceholder('Write markdown...')).toHaveValue(content);
});

//========================================
// DUPLICATE TITLE MESSAGE
//========================================
// Creates the same note twice and expects
// the message sent by the API, not a
// generic one.
//========================================

test('shows the API message when a title already exists', async ({ page }) => {
	const title = uniqueTitle('Nota duplicada');

	await page.getByRole('button', { name: 'New note' }).click();
	await page.getByLabel('Name').fill(title);
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/notes\/[\w-]+/);

	await page.getByRole('button', { name: 'New note' }).click();
	await page.getByLabel('Name').fill(title);
	await page.keyboard.press('Enter');

	await expect(
		page.getByText('A note with this title already exists in the same folder.'),
	).toBeVisible();
});

//========================================
// AUTHENTICATED SCREEN WITH AN OPEN NOTE
//========================================
// More complex than the login screen;
// covers the editor/preview.
//========================================

test('notes shell has no serious a11y violations', async ({ page }) => {
	const title = uniqueTitle('Nota a11y');

	await page.getByRole('button', { name: 'New note' }).click();
	await page.getByLabel('Name').fill(title);
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/notes\/[\w-]+/);

	const results = await new AxeBuilder({ page }).analyze();
	const serious = results.violations.filter(
		(v) => v.impact === 'critical' || v.impact === 'serious',
	);

	expect(serious).toEqual([]);
});

//========================================
// SESSION EXPIRED MESSAGE
//========================================
// Replaces the token with an invalid one
// and expects the API client to turn the
// 401 into the session expired message.
//========================================

test('shows the session expired message when the token is invalid', async ({ page }) => {
	await page.evaluate(() => localStorage.setItem('hub-pessoal:token', 'invalid-token'));

	await page.getByRole('button', { name: 'New note' }).click();
	await page.getByLabel('Name').fill(uniqueTitle('Nota sessao'));
	await page.keyboard.press('Enter');

	await expect(page.getByText('Your session expired. Log in again.')).toBeVisible();
});

//========================================
// CONNECTION ERROR MESSAGE
//========================================
// Cuts the create request and expects the
// message for a server that can't be
// reached.
//========================================

test('shows the connection error message when the API is unreachable', async ({ page }) => {
	await page.route('**/notes', (route) => route.abort());

	await page.getByRole('button', { name: 'New note' }).click();
	await page.getByLabel('Name').fill(uniqueTitle('Nota offline'));
	await page.keyboard.press('Enter');

	await expect(
		page.getByText("Couldn't reach the server. Check your connection and try again."),
	).toBeVisible();
});
