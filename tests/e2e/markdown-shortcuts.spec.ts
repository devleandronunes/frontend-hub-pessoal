import { expect, type Locator, type Page, test } from '@playwright/test';
import { login, uniqueTitle } from './helpers';

test.beforeEach(async ({ page }) => {
	await login(page);
	await page.getByRole('button', { name: 'New note' }).click();
	await page.getByLabel('Name').fill(uniqueTitle('Atalhos markdown'));
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/notes\/[\w-]+/);
	await page.getByRole('button', { name: 'Editor' }).click();
});

function editor(page: Page) {
	return page.getByPlaceholder('Write markdown...');
}

async function write(page: Page, content: string, selection?: [number, number]) {
	const field = editor(page);
	await field.fill(content);
	if (selection) {
		await field.evaluate((element: HTMLTextAreaElement, [start, end]) => {
			element.setSelectionRange(start, end);
		}, selection);
	}
	return field;
}

async function expectCaret(field: Locator, position: number) {
	expect(
		await field.evaluate((element: HTMLTextAreaElement) => [
			element.selectionStart,
			element.selectionEnd,
		]),
	).toEqual([position, position]);
}

//========================================
// INLINE FORMATTING
//========================================
// Each shortcut wraps the selection and
// pressing it again takes the markers off.
// With nothing selected the markers go in
// and the caret lands between them.
//========================================

test('wraps the selection in bold, italic, code and strikethrough and toggles it back', async ({
	page,
}) => {
	const field = await write(page, 'texto');

	const shortcuts: [string, string][] = [
		['ControlOrMeta+B', '**texto**'],
		['ControlOrMeta+I', '_texto_'],
		['ControlOrMeta+E', '`texto`'],
		['ControlOrMeta+Shift+X', '~~texto~~'],
	];

	for (const [shortcut, expected] of shortcuts) {
		await field.press('ControlOrMeta+A');
		await field.press(shortcut);
		await expect(field).toHaveValue(expected);
		await field.press(shortcut);
		await expect(field).toHaveValue('texto');
	}

	await write(page, '');
	await field.press('ControlOrMeta+B');
	await expect(field).toHaveValue('****');
	await page.keyboard.type('forte');
	await expect(field).toHaveValue('**forte**');
});

//========================================
// LINK, HEADING AND CODE BLOCK
//========================================
// The link leaves "url" selected to be
// typed over, the heading shortcut swaps
// or removes the level of the current line,
// and the block fences the selected lines.
//========================================

test('inserts a link, changes the heading level and fences a code block', async ({ page }) => {
	const field = await write(page, 'site');
	await field.press('ControlOrMeta+A');
	await field.press('ControlOrMeta+K');
	await expect(field).toHaveValue('[site](url)');
	await page.keyboard.type('https://exemplo.dev');
	await expect(field).toHaveValue('[site](https://exemplo.dev)');

	await write(page, 'Titulo');
	await field.press('ControlOrMeta+Alt+2');
	await expect(field).toHaveValue('## Titulo');
	await field.press('ControlOrMeta+Alt+1');
	await expect(field).toHaveValue('# Titulo');
	await field.press('ControlOrMeta+Alt+1');
	await expect(field).toHaveValue('Titulo');

	await write(page, 'const a = 1;');
	await field.press('ControlOrMeta+Shift+E');
	await expect(field).toHaveValue('```\nconst a = 1;\n```');
});

//========================================
// LISTS
//========================================
// Enter continues bullet, numbered and task
// items, and Enter on an empty item ends
// the list.
//========================================

test('continues lists with Enter and ends them on an empty item', async ({ page }) => {
	const field = await write(page, '- um');
	await field.press('Enter');
	await page.keyboard.type('dois');
	await expect(field).toHaveValue('- um\n- dois');
	await field.press('Enter');
	await field.press('Enter');
	await expect(field).toHaveValue('- um\n- dois\n');

	await write(page, '1. a');
	await field.press('Enter');
	await page.keyboard.type('b');
	await expect(field).toHaveValue('1. a\n2. b');

	await write(page, '- [ ] tarefa');
	await field.press('Enter');
	await expect(field).toHaveValue('- [ ] tarefa\n- [ ] ');
});

//========================================
// TAB AND SHIFT+TAB
//========================================
// Tab indents a list item, Shift+Tab takes
// the indent off, and after Escape the next
// Tab moves the focus out of the editor.
//========================================

test('indents with Tab, outdents with Shift+Tab and lets Escape free the focus', async ({
	page,
}) => {
	const field = await write(page, '- item');
	await field.press('Tab');
	await expect(field).toHaveValue('  - item');
	await field.press('Shift+Tab');
	await expect(field).toHaveValue('- item');

	await write(page, 'texto');
	await field.press('Tab');
	await expect(field).toHaveValue('texto  ');

	await write(page, 'a\nb\nc', [0, 5]);
	await field.press('Tab');
	await expect(field).toHaveValue('  a\n  b\n  c');

	await field.press('Escape');
	await field.press('Tab');
	await expect(field).not.toBeFocused();
});

//========================================
// MOVE AND DUPLICATE LINES
//========================================
// Alt+Up and Alt+Down move the current
// line, and adding Shift duplicates it.
//========================================

test('moves and duplicates lines with the arrow keys', async ({ page }) => {
	const field = await write(page, 'a\nb\nc', [2, 2]);
	await field.press('Alt+ArrowUp');
	await expect(field).toHaveValue('b\na\nc');
	await field.press('Alt+ArrowDown');
	await expect(field).toHaveValue('a\nb\nc');
	await expectCaret(field, 2);

	await field.press('Alt+Shift+ArrowDown');
	await expect(field).toHaveValue('a\nb\nb\nc');
});

//========================================
// PAIRED CHARACTERS
//========================================
// Opening a bracket or quote inserts the
// pair, typing the closer steps over it,
// Backspace removes an empty pair and a
// selection gets surrounded.
//========================================

test('closes pairs, steps over the closer and surrounds the selection', async ({ page }) => {
	const field = await write(page, '');
	await field.press('(');
	await expect(field).toHaveValue('()');
	await page.keyboard.type('x');
	await field.press(')');
	await expect(field).toHaveValue('(x)');
	await expectCaret(field, 3);

	await write(page, '');
	await field.press('[');
	await expect(field).toHaveValue('[]');
	await field.press('Backspace');
	await expect(field).toHaveValue('');

	await write(page, 'abc', [0, 3]);
	await field.press('"');
	await expect(field).toHaveValue('"abc"');
});

//========================================
// UNDO
//========================================
// The edits go through the browser's own
// editing command, so Undo takes a shortcut
// back in a single step.
//========================================

test('undoes a shortcut in one step', async ({ page }) => {
	const field = await write(page, 'texto');
	await field.press('ControlOrMeta+A');
	await field.press('ControlOrMeta+B');
	await expect(field).toHaveValue('**texto**');

	await field.press('ControlOrMeta+Z');
	await expect(field).toHaveValue('texto');
});
