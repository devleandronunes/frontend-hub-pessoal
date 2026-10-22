import { expect, type Page, test } from '@playwright/test';
import { login, uniqueTitle } from './helpers';

test.beforeEach(async ({ page, context }) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await login(page);
	await page.getByRole('button', { name: 'New note' }).click();
	await page.getByLabel('Name').fill(uniqueTitle('Mermaid'));
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/notes\/[\w-]+/, { timeout: 15000 });
});

async function openPreviewWith(page: Page, markdown: string) {
	await page.getByRole('button', { name: 'Editor', exact: true }).click();
	await page.getByPlaceholder('Write markdown...').fill(markdown);
	await expect(page.getByText('Saved')).toBeVisible({ timeout: 3000 });
	await page.getByRole('button', { name: 'Preview' }).click();
}

const FLOW = 'graph TD\n  A[Inicio] --> B{Decisao}\n  B -->|sim| C[Fim]\n  B -->|nao| A';

//========================================
// DIAGRAM DRAWN IN THE PREVIEW
//========================================
// A fenced mermaid block shows up as a
// drawn diagram in the dark hub theme, and
// the copy button hands back the source.
//========================================

test('draws a mermaid block in the preview and copies its source', async ({ page }) => {
	await openPreviewWith(page, `# Fluxo\n\n\`\`\`mermaid\n${FLOW}\n\`\`\``);

	const diagram = page.locator('.prose svg[id^="mermaid"]');
	await expect(diagram).toBeVisible({ timeout: 15000 });
	await expect(diagram.getByText('Decisao')).toBeVisible();
	await expect(page.locator('.prose pre')).toHaveCount(0);

	const fill = await diagram
		.locator('.node rect, .node polygon')
		.first()
		.evaluate((element) => getComputedStyle(element).fill);
	const [red = 255, green = 255, blue = 255] = (fill.match(/\d+/g) ?? []).map(Number);
	expect(red + green + blue).toBeLessThan(300);

	await page.locator('.prose svg[id^="mermaid"]').hover();
	await page.getByRole('button', { name: 'Copy code', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(FLOW);
});

//========================================
// SYNTAX ERROR
//========================================
// A broken diagram shows the error message
// and keeps the block's text as a normal
// code block, so it can be fixed.
//========================================

test('shows the error and the source when the diagram is not valid', async ({ page }) => {
	await openPreviewWith(page, '```mermaid\ngraph TD\n  A --> \n```');

	await expect(page.locator('.prose svg[id^="mermaid"]')).toHaveCount(0);
	await expect(page.getByRole('alert')).toBeVisible();
	await expect(page.locator('.prose pre')).toContainText('graph TD');
});

//========================================
// OTHER BLOCKS UNTOUCHED
//========================================
// A bash block next to a diagram is still a
// code block, and other diagram types draw.
//========================================

test('keeps other code blocks as they are and draws other diagram types', async ({ page }) => {
	await openPreviewWith(
		page,
		'```bash\nls -la\n```\n\n```mermaid\nsequenceDiagram\n  Ana->>Beto: Oi\n  Beto-->>Ana: Ola\n```',
	);

	await expect(page.locator('.prose pre')).toContainText('ls -la');
	const diagram = page.locator('.prose svg[id^="mermaid"]');
	await expect(diagram).toBeVisible({ timeout: 15000 });
	await expect(diagram.getByText('Oi', { exact: true })).toBeVisible();
});
