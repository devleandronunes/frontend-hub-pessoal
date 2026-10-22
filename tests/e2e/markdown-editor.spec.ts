import { expect, type Page, test } from '@playwright/test';
import { login, uniqueTitle } from './helpers';

test.beforeEach(async ({ page }) => {
	await login(page);
	await page.getByRole('button', { name: 'New note' }).click();
	await page.getByLabel('Name').fill(uniqueTitle('Editor markdown'));
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/notes\/[\w-]+/);
});

function markdownEditor(page: Page) {
	return page.getByRole('textbox', { name: 'Markdown editor' });
}

function textEditor(page: Page) {
	return page.getByPlaceholder('Write markdown...');
}

async function chooseEditor(page: Page, name: 'Text editor' | 'Markdown editor') {
	await page.getByRole('button', { name: 'Edit mode' }).click();
	await page.getByRole('menuitemradio', { name }).click();
}

async function savedContent(page: Page) {
	await expect(page.getByText('Saved')).toBeVisible({ timeout: 3000 });
	await chooseEditor(page, 'Text editor');
	return textEditor(page).inputValue();
}

//========================================
// CHOOSING THE EDITOR
//========================================
// The arrow next to "Editor" picks between
// the text editor and the markdown editor,
// and the choice is remembered by the "Editor"
// button and after a reload.
//========================================

test('picks the markdown editor from the arrow and remembers the choice', async ({ page }) => {
	await expect(markdownEditor(page)).toBeHidden();

	await chooseEditor(page, 'Markdown editor');
	await expect(markdownEditor(page)).toBeVisible();
	await expect(textEditor(page)).toBeHidden();

	await page.getByRole('button', { name: 'Preview' }).click();
	await expect(markdownEditor(page)).toBeHidden();
	await page.getByRole('button', { name: 'Editor', exact: true }).click();
	await expect(markdownEditor(page)).toBeVisible();

	await page.reload();
	await page.getByRole('button', { name: 'Editor', exact: true }).click();
	await expect(markdownEditor(page)).toBeVisible();

	await chooseEditor(page, 'Text editor');
	await expect(textEditor(page)).toBeVisible();
});

//========================================
// EDITING IN THE FORMATTED TEXT
//========================================
// Markdown typed into the markdown editor
// becomes formatted text right away, and the
// saved note is plain markdown again.
//========================================

test('turns typed markdown into formatted text and saves it as markdown', async ({ page }) => {
	await chooseEditor(page, 'Markdown editor');
	await markdownEditor(page).click();
	await page.keyboard.type('# Titulo');
	await page.keyboard.press('Enter');
	await page.keyboard.type('um **forte** e _suave_');
	await expect(markdownEditor(page).locator('h1')).toHaveText('Titulo');
	await expect(markdownEditor(page).locator('strong')).toHaveText('forte');
	await expect(markdownEditor(page).locator('em')).toHaveText('suave');

	await expect.poll(() => savedContent(page)).toContain('# Titulo');
	const content = await textEditor(page).inputValue();
	expect(content).toContain('**forte**');
	expect(content).toMatch(/[*_]suave[*_]/);
});

//========================================
// SHORTCUTS IN THE MARKDOWN EDITOR
//========================================
// The same shortcuts as the text editor:
// bold, italic, code, strikethrough, headings
// and the code block.
//========================================

test('formats the selection with the keyboard shortcuts', async ({ page }) => {
	await chooseEditor(page, 'Markdown editor');
	const editor = markdownEditor(page);
	await editor.click();
	await page.keyboard.type('texto');

	const shortcuts: [string, string][] = [
		['ControlOrMeta+B', 'strong'],
		['ControlOrMeta+I', 'em'],
		['ControlOrMeta+E', 'code'],
		['ControlOrMeta+Shift+X', 's'],
	];

	for (const [shortcut, tag] of shortcuts) {
		await page.keyboard.press('ControlOrMeta+A');
		await page.keyboard.press(shortcut);
		await expect(editor.locator(tag)).toHaveText('texto');
		await page.keyboard.press(shortcut);
		await expect(editor.locator(tag)).toHaveCount(0);
	}

	await page.keyboard.press('ControlOrMeta+Alt+2');
	await expect(editor.locator('h2')).toHaveText('texto');
	await page.keyboard.press('ControlOrMeta+Shift+E');
	await expect(editor.locator('pre')).toHaveText('texto');
});

//========================================
// LISTS AND NOTHING LOST ON OPENING
//========================================
// Enter continues a list and Tab nests it.
// Opening a note written in the text editor
// shows it formatted without rewriting it.
//========================================

test('continues and nests lists', async ({ page }) => {
	await chooseEditor(page, 'Markdown editor');
	await markdownEditor(page).click();
	await page.keyboard.type('- um');
	await page.keyboard.press('Enter');
	await page.keyboard.type('dois');
	await page.keyboard.press('Tab');
	await expect(markdownEditor(page).locator('ul ul li')).toHaveText('dois');
});

test('shows a note written as text formatted and leaves it unchanged until edited', async ({
	page,
}) => {
	const original = '* item\n\n__negrito__ e [link](https://exemplo.dev)';
	await page.getByRole('button', { name: 'Editor', exact: true }).click();
	await textEditor(page).fill(original);
	await expect(page.getByText('Saved')).toBeVisible({ timeout: 3000 });
	await page.getByRole('button', { name: 'Preview' }).click();

	await chooseEditor(page, 'Markdown editor');
	await expect(markdownEditor(page).locator('ul li')).toHaveText('item');
	await expect(markdownEditor(page).locator('strong')).toHaveText('negrito');
	await expect(markdownEditor(page).locator('a')).toHaveAttribute('href', 'https://exemplo.dev');

	await chooseEditor(page, 'Text editor');
	await expect(textEditor(page)).toHaveValue(original);
});

//========================================
// NOTHING LOST WHEN EDITING
//========================================
// Tables, task items and images survive an
// edit in the markdown editor, and the
// preview renders tables and strikethrough.
//========================================

test('keeps tables, task items and images when a note is edited', async ({ page }) => {
	const original = [
		'- [ ] tarefa',
		'',
		'| a | b |',
		'| --- | --- |',
		'| 1 | 2 |',
		'',
		'![alt](https://exemplo.dev/i.png)',
		'',
		'~~riscado~~',
		'',
		'fim',
	].join('\n');
	await page.getByRole('button', { name: 'Editor', exact: true }).click();
	await textEditor(page).fill(original);
	await expect(page.getByText('Saved')).toBeVisible({ timeout: 3000 });

	await page.getByRole('button', { name: 'Preview' }).click();
	await expect(page.locator('.prose table')).toBeVisible();
	await expect(page.locator('.prose del')).toHaveText('riscado');

	await chooseEditor(page, 'Markdown editor');
	await markdownEditor(page).locator('p').last().click();
	await page.keyboard.press('End');
	await page.keyboard.type('!');

	await expect.poll(() => savedContent(page)).toContain('fim!');
	const content = await textEditor(page).inputValue();
	expect(content).toContain('- [ ] tarefa');
	expect(content).toMatch(/\| a\s+\| b\s+\|/);
	expect(content).toContain('![alt](https://exemplo.dev/i.png)');
	expect(content).toContain('~~riscado~~');
});
