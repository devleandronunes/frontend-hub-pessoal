import { expect, type Locator, type Page, test } from '@playwright/test';
import { login, uniqueTitle } from './helpers';

test.beforeEach(async ({ page }) => {
	await login(page);
});

async function dragTo(page: Page, source: Locator, target: Locator) {
	await source.scrollIntoViewIfNeeded();
	const from = await source.boundingBox();
	if (!from) {
		throw new Error('The drag source is not visible.');
	}

	const x = from.x + from.width / 2;
	const y = from.y + from.height / 2;
	await page.mouse.move(x, y);
	await page.mouse.down();
	await page.mouse.move(x, y - 12, { steps: 4 });

	await target.scrollIntoViewIfNeeded();
	const to = await target.boundingBox();
	if (!to) {
		throw new Error('The drop target is not visible.');
	}

	await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 15 });
	await page.mouse.up();
}

async function createFolder(page: Page, name: string) {
	await page.getByRole('button', { name: 'New folder' }).click();
	await page.getByLabel('Name').fill(name);
	await page.keyboard.press('Enter');
	await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
}

async function createNote(page: Page, title: string) {
	await page.getByRole('button', { name: 'New note' }).click();
	await page.getByLabel('Name').fill(title);
	await page.keyboard.press('Enter');
	await expect(page.getByRole('link', { name: title, exact: true }).first()).toBeVisible();
}

//========================================
// MOVE A NOTE INTO A FOLDER AND OUT
//========================================
// Drags a note onto a folder, checks it is
// inside (one indentation level deeper),
// then drags it to the tree header to
// bring it back to the root.
//========================================

test('moves a note into a folder and back to the root', async ({ page }) => {
	const folderName = uniqueTitle('Pasta mover');
	const title = uniqueTitle('Nota mover');
	await createFolder(page, folderName);
	await createNote(page, title);

	const folder = page.getByRole('button', { name: folderName, exact: true });
	const note = page.getByRole('link', { name: title, exact: true });

	await dragTo(page, note, folder);
	await expect(note).toHaveCSS('padding-left', '20px');

	await dragTo(page, note, page.getByRole('button', { name: 'New note' }));
	await expect(note).toHaveCSS('padding-left', '4px');
});

//========================================
// MOVE A FOLDER OUT OF ITS PARENT
//========================================
// Creates a folder inside another one
// through the context menu, checks that a
// folder can't be dropped into itself or
// its own subtree (it stays one level
// deep), then moves it to the root.
//========================================

test('moves a folder out of its parent and blocks dropping it into its own subtree', async ({
	page,
}) => {
	const parentName = uniqueTitle('Pasta pai');
	const childName = uniqueTitle('Pasta filha');
	await createFolder(page, parentName);

	const parent = page.getByRole('button', { name: parentName, exact: true });
	await parent.click({ button: 'right' });
	await page.getByRole('menuitem', { name: 'New folder' }).click();
	await page.getByLabel('Name').fill(childName);
	await page.keyboard.press('Enter');

	const child = page.getByRole('button', { name: childName, exact: true });
	await expect(child).toBeVisible();

	await dragTo(page, parent, child);
	await expect(child).toHaveCSS('padding-left', '20px');

	await dragTo(page, child, page.getByRole('button', { name: 'New note' }));
	await expect(child).toHaveCSS('padding-left', '4px');
});

//========================================
// MOVE CONFLICT MESSAGE
//========================================
// Moves a note into a folder that already
// has a note with the same title and
// expects the message sent by the API.
//========================================

test('shows the API message when the target folder already has that title', async ({ page }) => {
	const folderName = uniqueTitle('Pasta conflito');
	const title = uniqueTitle('Nota conflito');
	await createFolder(page, folderName);

	const folder = page.getByRole('button', { name: folderName, exact: true });
	await folder.click({ button: 'right' });
	await page.getByRole('menuitem', { name: 'New note' }).click();
	await page.getByLabel('Name').fill(title);
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/notes\/[\w-]+/);

	await createNote(page, title);
	await expect(page.getByRole('link', { name: title, exact: true })).toHaveCount(2);
	const rootNote = page.getByRole('link', { name: title, exact: true }).last();
	await dragTo(page, rootNote, folder);

	await expect(
		page.getByText('A note with this title already exists in the target folder.'),
	).toBeVisible();
});

//========================================
// MOVE WITH THE KEYBOARD
//========================================
// Picks up a folder with the space bar,
// moves it onto its sibling with the
// arrow keys and drops it with the space
// bar again.
//========================================

test('moves a folder with the keyboard', async ({ page }) => {
	const parentName = uniqueTitle('Pasta teclado');
	const firstName = uniqueTitle('Pasta A');
	const secondName = uniqueTitle('Pasta B');
	await createFolder(page, parentName);

	const parent = page.getByRole('button', { name: parentName, exact: true });
	for (const name of [firstName, secondName]) {
		await parent.click({ button: 'right' });
		await page.getByRole('menuitem', { name: 'New folder' }).click();
		await page.getByLabel('Name').fill(name);
		await page.keyboard.press('Enter');
		await expect(page.getByRole('button', { name, exact: true })).toBeVisible();
	}

	const first = page.getByRole('button', { name: firstName, exact: true });

	const announcements = page.locator('[id^="DndLiveRegion"]');

	await first.focus();
	await page.keyboard.press('Space');
	await expect(announcements).toContainText(`${firstName} is over ${firstName}`);
	await page.keyboard.press('ArrowDown');
	await expect(announcements).toContainText(`${firstName} is over ${secondName}`);
	await page.keyboard.press('Space');

	await expect(first).toHaveCSS('padding-left', '36px');
});
