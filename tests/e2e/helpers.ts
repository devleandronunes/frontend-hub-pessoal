import type { Page } from '@playwright/test';

// No mocks in the frontend: the specs log in against the real dev backend, so the credentials are
// the seed user's, configured locally with `dotnet user-secrets` (Auth:SeedUsername and
// Auth:SeedPassword) and passed through environment variables so they are never hardcoded.
export const E2E_USERNAME = process.env.E2E_USERNAME ?? '';
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? '';

export async function login(page: Page) {
	if (!E2E_USERNAME || !E2E_PASSWORD) {
		throw new Error(
			"Set E2E_USERNAME and E2E_PASSWORD to the dev seed user's credentials before running the E2E tests.",
		);
	}

	await page.goto('/login');
	await page.getByLabel('Username').fill(E2E_USERNAME);
	await page.getByLabel('Password').fill(E2E_PASSWORD);
	await page.getByRole('button', { name: 'Login' }).click();
	await page.waitForURL('/');
	await page.getByRole('link', { name: 'Open' }).click();
	await page.waitForURL('/notes');
}

export function uniqueTitle(prefix: string) {
	return `${prefix} ${Date.now()}`;
}
