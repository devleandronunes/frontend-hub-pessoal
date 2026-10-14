import { expect, type Locator, type Page, test } from '@playwright/test';
import { login, uniqueTitle } from './helpers';

test.use({ viewport: { width: 1280, height: 800 } });

test.beforeEach(async ({ page }) => {
	await login(page);
});

async function createNote(page: Page, title: string) {
	await page.getByRole('button', { name: 'New note' }).click();
	await page.getByLabel('Name').fill(title);
	await page.keyboard.press('Enter');
	await expect(tab(page, title)).toHaveAttribute('aria-current', 'page');
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

async function settledBox(locator: Locator) {
	let previous = await locator.boundingBox();
	await expect
		.poll(async () => {
			const current = await locator.boundingBox();
			const settled = JSON.stringify(current) === JSON.stringify(previous);
			previous = current;
			return settled;
		})
		.toBe(true);

	return previous;
}

async function dragTo(page: Page, source: Locator, target: Locator) {
	const from = await settledBox(source);
	const to = await settledBox(target);
	if (!from || !to) {
		throw new Error('The drag source or target is not visible.');
	}

	const x = from.x + from.width / 2;
	const y = from.y + from.height / 2;
	await page.mouse.move(x, y);
	await page.mouse.down();
	await page.mouse.move(x + 20, y, { steps: 4 });
	await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 15 });
	await nextFrames(page);
	await page.mouse.up();
}

//========================================
// PREVIEW TAB REPLACED BY THE NEXT CLICK
//========================================
// A note opened from the tree shows up in
// italics as a preview tab, and opening
// another note from the tree takes its place.
//========================================

test('opens a note from the tree as a preview tab that the next click replaces', async ({
	page,
}) => {
	const first = uniqueTitle('Aba previa A');
	const second = uniqueTitle('Aba previa B');
	await createNote(page, first);
	await createNote(page, second);
	await closeTab(page, second);
	await expect(tab(page, first)).toHaveAttribute('aria-current', 'page');
	await closeTab(page, first);
	await expect(tabBar(page)).toBeHidden();
	await expect(page).toHaveURL(/\/notes$/);

	const tree = page.locator('aside');
	await tree.getByRole('link', { name: first, exact: true }).click();
	await expect(tab(page, first)).toBeVisible();
	await expect(tab(page, first).locator('span')).toHaveClass(/italic/);

	await tree.getByRole('link', { name: second, exact: true }).click();
	await expect(tab(page, second)).toBeVisible();
	await expect(tab(page, first)).toBeHidden();
});

//========================================
// EDITING KEEPS THE TAB OPEN
//========================================
// Typing in a preview tab makes it a fixed
// tab, so the next click in the tree opens
// another tab instead of replacing it.
//========================================

test('keeps a tab open after editing it', async ({ page }) => {
	const first = uniqueTitle('Aba fixa A');
	const second = uniqueTitle('Aba fixa B');
	await createNote(page, first);
	await createNote(page, second);
	await closeTab(page, second);
	await expect(tab(page, first)).toHaveAttribute('aria-current', 'page');
	await closeTab(page, first);
	await expect(page).toHaveURL(/\/notes$/);

	const tree = page.locator('aside');
	await tree.getByRole('link', { name: first, exact: true }).click();
	await expect(tab(page, first).locator('span')).toHaveClass(/italic/);

	await page.getByRole('button', { name: 'Editor' }).click();
	await page.getByPlaceholder('Write markdown...').fill('Texto que fixa a aba.');
	await expect(page.getByText('Saved')).toBeVisible({ timeout: 3000 });
	await expect(tab(page, first).locator('span')).not.toHaveClass(/italic/);

	await tree.getByRole('link', { name: second, exact: true }).click();
	await expect(tab(page, second)).toBeVisible();
	await expect(tab(page, first)).toBeVisible();
});

//========================================
// CLOSE THE ACTIVE TAB
//========================================
// Closing the active tab opens its right
// neighbour, or the left one when it was the
// last; closing the only tab goes back to
// the empty state.
//========================================

test('closes the active tab and opens its neighbour', async ({ page }) => {
	const first = uniqueTitle('Aba fechar A');
	const second = uniqueTitle('Aba fechar B');
	const third = uniqueTitle('Aba fechar C');
	await createNote(page, first);
	await createNote(page, second);
	await createNote(page, third);

	await closeTab(page, third);
	await expect(tab(page, second)).toHaveAttribute('aria-current', 'page');

	await tab(page, first).click();
	await expect(tab(page, first)).toHaveAttribute('aria-current', 'page');
	await closeTab(page, first);
	await expect(tab(page, second)).toHaveAttribute('aria-current', 'page');

	await closeTab(page, second);
	await expect(page.getByText('No note selected')).toBeVisible();
	await expect(tabBar(page)).toBeHidden();
});

//========================================
// CLOSE FROM THE CONTEXT MENU AND MIDDLE CLICK
//========================================
// "Close others" keeps one tab, the middle
// button closes the tab under the pointer and
// "Close all" empties the bar.
//========================================

test('closes tabs from the context menu and with the middle button', async ({ page }) => {
	const first = uniqueTitle('Aba menu A');
	const second = uniqueTitle('Aba menu B');
	const third = uniqueTitle('Aba menu C');
	await createNote(page, first);
	await createNote(page, second);
	await createNote(page, third);

	await tab(page, second).click({ button: 'right' });
	await page.getByRole('menuitem', { name: 'Close others' }).click();
	await expect(tab(page, second)).toHaveAttribute('aria-current', 'page');
	await expect(tab(page, first)).toBeHidden();
	await expect(tab(page, third)).toBeHidden();

	await page.locator('aside').getByRole('link', { name: first, exact: true }).click();
	await expect(tab(page, first)).toBeVisible();
	await tab(page, first).click({ button: 'middle' });
	await expect(tab(page, first)).toBeHidden();
	await expect(tab(page, second)).toBeVisible();

	await tab(page, second).click({ button: 'right' });
	await page.getByRole('menuitem', { name: 'Close all' }).click();
	await expect(tabBar(page)).toBeHidden();
	await expect(page.getByText('No note selected')).toBeVisible();
});

//========================================
// REORDER TABS
//========================================
// Drags a tab to the other end with the
// mouse, then moves one with the keyboard
// (Space to pick up, arrow keys to move,
// Space to drop).
//========================================

test('reorders tabs by dragging and with the keyboard', async ({ page }) => {
	const first = uniqueTitle('Aba ordem A');
	const second = uniqueTitle('Aba ordem B');
	const third = uniqueTitle('Aba ordem C');
	await createNote(page, first);
	await createNote(page, second);
	await createNote(page, third);
	expect(await tabTitles(page)).toEqual([first, second, third]);

	await dragTo(page, tab(page, first), tab(page, third));
	await expect.poll(() => tabTitles(page)).toEqual([second, third, first]);

	await tab(page, second).focus();
	await page.keyboard.press('Space');
	await expect(tab(page, second)).toHaveAttribute('aria-pressed', 'true');
	await nextFrames(page);
	await page.keyboard.press('ArrowRight');
	await nextFrames(page);
	await page.keyboard.press('Space');
	await expect.poll(() => tabTitles(page)).toEqual([third, second, first]);
});

//========================================
// RENAME AND DELETE REFLECTED IN THE TAB
//========================================
// Renaming a note in the tree changes the
// title on its tab, and deleting it closes
// the tab.
//========================================

test('shows a renamed note on its tab and closes the tab when it is deleted', async ({ page }) => {
	const title = uniqueTitle('Aba renomear');
	const renamed = uniqueTitle('Aba renomeada');
	await createNote(page, title);

	await page.locator('aside').getByText(title, { exact: true }).click({ button: 'right' });
	await page.getByRole('menuitem', { name: 'Rename' }).click();
	await page.getByLabel('Name').fill(renamed);
	await page.keyboard.press('Enter');
	await expect(tab(page, renamed)).toBeVisible();

	await page.locator('aside').getByText(renamed, { exact: true }).click({ button: 'right' });
	await page.getByRole('menuitem', { name: 'Delete' }).click();
	await page.getByRole('button', { name: 'Delete' }).click();
	await expect(tabBar(page)).toBeHidden();
});

//========================================
// MANY TABS
//========================================
// With more tabs than fit, the bar scrolls
// sideways and the active tab stays in view.
//========================================

test('scrolls the tab bar to keep the active tab in view', async ({ page }) => {
	const first = uniqueTitle('Aba muitas A');
	const middle = ['B', 'C', 'D', 'E'].map((letter) => uniqueTitle(`Aba muitas ${letter}`));
	const last = uniqueTitle('Aba muitas F');
	for (const title of [first, ...middle, last]) {
		await createNote(page, title);
	}

	await expect(tab(page, last)).toBeInViewport();
	await tab(page, first).click();
	await expect(tab(page, first)).toBeInViewport();
	await tab(page, last).click();
	await expect(tab(page, last)).toBeInViewport();
});
