import { expect, test } from '@playwright/test';
import { login, uniqueTitle } from './helpers';

test.beforeEach(async ({ page, context }) => {
	await context.grantPermissions(['clipboard-read', 'clipboard-write']);
	await login(page);
});

//========================================
// COPY CODE FROM THE PREVIEW
//========================================
// Writes a fenced code block, opens the
// preview, clicks the copy button and
// reads the clipboard back: same text,
// without the trailing newline.
//========================================

test('copies a code block from the preview', async ({ page }) => {
	const title = uniqueTitle('Copy code');
	const code = 'echo "hello"\nls -la';

	await page.getByRole('button', { name: 'New note' }).click();
	await page.getByLabel('Name').fill(title);
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(/\/notes\/[\w-]+/);

	await page.getByRole('button', { name: 'Editor' }).click();
	await page
		.getByPlaceholder('Write markdown...')
		.fill(`# Commands\n\n\`\`\`bash\n${code}\n\`\`\``);
	await expect(page.getByText('Saved')).toBeVisible({ timeout: 3000 });

	await page.getByRole('button', { name: 'Preview' }).click();
	await page.locator('.prose pre').hover();
	await page.getByRole('button', { name: 'Copy code' }).click();

	await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(code);
});
