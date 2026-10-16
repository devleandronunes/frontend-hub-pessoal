import { expect, type Page, test } from '@playwright/test';
import { login, uniqueTitle } from './helpers';

test.use({ viewport: { width: 1280, height: 800 } });

test.beforeEach(async ({ page }) => {
	await login(page);
});

const TABS_KEY = 'hub-pessoal:notes-tabs';
const UNKNOWN_ID = '00000000-0000-0000-0000-000000000000';

async function createNote(page: Page, title: string) {
	await page.getByRole('button', { name: 'New note' }).click();
	await page.getByLabel('Name').fill(title);
	await page.keyboard.press('Enter');
	await expect(tab(page, title)).toHaveAttribute('aria-current', 'page');
}

async function createFolder(page: Page, name: string) {
	await page.getByRole('button', { name: 'New folder' }).click();
	await page.getByLabel('Name').fill(name);
	await page.keyboard.press('Enter');
	await expect(folder(page, name)).toBeVisible();
}

function folder(page: Page, name: string) {
	return page.locator('aside').getByRole('button', { name, exact: true });
}

function tabBar(page: Page) {
	return page.getByRole('navigation', { name: 'Open notes' });
}

function tab(page: Page, title: string) {
	return tabBar(page).getByRole('link', { name: title, exact: true });
}

async function closeTab(page: Page, title: string) {
	await tabBar(page)
		.getByRole('button', { name: `Close ${title}` })
		.click();
}

async function tabTitles(page: Page) {
	return tabBar(page).getByRole('link').allInnerTexts();
}

async function nextFrames(page: Page) {
	await page.evaluate(
		() =>
			new Promise<void>((resolve) => {
				requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
			}),
	);
}

//========================================
// OPEN FOLDERS AFTER A RELOAD
//========================================
// Opens a folder and a subfolder, leaves a
// third one closed, and expects the same
// state after a reload.
//========================================

test('remembers which folders are open after a reload', async ({ page }) => {
	const parent = uniqueTitle('Pasta lembrada');
	const child = uniqueTitle('Subpasta lembrada');
	const closed = uniqueTitle('Pasta fechada');
	await createFolder(page, parent);
	await createFolder(page, closed);

	await folder(page, parent).click({ button: 'right' });
	await page.getByRole('menuitem', { name: 'New folder' }).click();
	await page.getByLabel('Name').fill(child);
	await page.keyboard.press('Enter');
	await expect(folder(page, child)).toBeVisible();
	await folder(page, child).click();
	await expect(folder(page, child)).toHaveAttribute('aria-expanded', 'true');

	await page.reload();
	await expect(folder(page, parent)).toHaveAttribute('aria-expanded', 'true');
	await expect(folder(page, child)).toHaveAttribute('aria-expanded', 'true');
	await expect(folder(page, closed)).toHaveAttribute('aria-expanded', 'false');

	await folder(page, parent).click();
	await page.reload();
	await expect(folder(page, parent)).toHaveAttribute('aria-expanded', 'false');
});

//========================================
// OPEN TABS AFTER A RELOAD
//========================================
// Two fixed tabs and a preview tab come
// back in the same order, with the preview
// tab still in italics and the note from
// the URL active.
//========================================

test('restores the open tabs, their order and the preview tab after a reload', async ({ page }) => {
	const first = uniqueTitle('Aba salva A');
	const second = uniqueTitle('Aba salva B');
	const third = uniqueTitle('Aba salva C');
	await createNote(page, first);
	await createNote(page, second);
	await createNote(page, third);
	await closeTab(page, third);
	await expect(tab(page, second)).toHaveAttribute('aria-current', 'page');

	await page.locator('aside').getByRole('link', { name: third, exact: true }).click();
	await expect(tab(page, third).locator('span')).toHaveClass(/italic/);

	await page.reload();
	await expect.poll(() => tabTitles(page)).toEqual([first, second, third]);
	await expect(tab(page, third)).toHaveAttribute('aria-current', 'page');
	await expect(tab(page, third).locator('span')).toHaveClass(/italic/);
	await expect(tab(page, first).locator('span')).not.toHaveClass(/italic/);
});

//========================================
// ENTERING THE NOTES AREA
//========================================
// Going to /notes with no note in the URL
// opens the note that was active, and does
// nothing when every tab had been closed.
//========================================

test('opens the last active note when /notes is opened without a link', async ({ page }) => {
	const first = uniqueTitle('Aba entrada A');
	const second = uniqueTitle('Aba entrada B');
	await createNote(page, first);
	await createNote(page, second);

	await tab(page, first).click();
	await expect(tab(page, first)).toHaveAttribute('aria-current', 'page');

	await page.goto('/notes');
	await expect(tab(page, first)).toHaveAttribute('aria-current', 'page');
	await expect(page).toHaveURL(/\/notes\/[\w-]+/);
});

test('does not reopen anything after every tab was closed', async ({ page }) => {
	const title = uniqueTitle('Aba encerrada');
	await createNote(page, title);
	await closeTab(page, title);
	await expect(page).toHaveURL(/\/notes$/);

	await page.goto('/notes');
	await expect(page.getByText('No note selected')).toBeVisible();
	await expect(tabBar(page)).toBeHidden();
});

//========================================
// STALE AND CORRUPT SAVED DATA
//========================================
// A saved tab whose note is gone is
// dropped, and unreadable saved data is
// ignored instead of breaking the page.
//========================================

test('drops saved tabs whose note is gone and ignores corrupt data', async ({ page }) => {
	const title = uniqueTitle('Aba sobrevivente');
	await createNote(page, title);

	await page.evaluate(
		({ key, id }) => {
			const stored = JSON.parse(localStorage.getItem(key) ?? '{}');
			stored.tabs.push({ id, preview: false });
			localStorage.setItem(key, JSON.stringify(stored));
		},
		{ key: TABS_KEY, id: UNKNOWN_ID },
	);
	await page.reload();
	await expect(tab(page, title)).toBeVisible();
	await expect(tabBar(page).getByRole('link')).toHaveCount(1);

	await page.evaluate((key) => localStorage.setItem(key, '{not json'), TABS_KEY);
	await page.goto('/notes');
	await expect(page.getByText('No note selected')).toBeVisible();
	await expect(tabBar(page)).toBeHidden();
});

//========================================
// TREE REQUEST FAILURE
//========================================
// When the tree can't be loaded the app
// can't tell which notes still exist, so
// the saved tabs must be left alone.
//========================================

test('keeps the saved tabs when the tree request fails', async ({ page }) => {
	const title = uniqueTitle('Aba offline');
	await createNote(page, title);

	await page.route('**/notes/tree', (route) => route.abort());
	const failed = page.waitForEvent('requestfailed', (request) =>
		request.url().endsWith('/notes/tree'),
	);
	await page.reload();
	await failed;
	await nextFrames(page);

	const stored = await page.evaluate((key) => localStorage.getItem(key), TABS_KEY);
	expect(JSON.parse(stored ?? '{}').tabs).toHaveLength(1);
});
