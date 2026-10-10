import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { E2E_USERNAME, login } from './helpers';

//========================================
// VALID LOGIN
//========================================
// Valid credentials land on /notes with
// the tree ready ("New note" visible).
//========================================

test('login with valid credentials opens the notes app', async ({ page }) => {
	await login(page);

	await expect(page).toHaveURL('/notes');
	await expect(page.getByRole('button', { name: 'New note' })).toBeVisible();
});

//========================================
// WRONG PASSWORD
//========================================
// Shows the error message and keeps the
// user on /login.
//========================================

test('login with wrong password shows an error and stays on the page', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel('Username').fill(E2E_USERNAME || 'dev-user');
	await page.getByLabel('Password').fill('senha-certamente-errada');
	await page.getByRole('button', { name: 'Login' }).click();

	await expect(page.getByText('Invalid username or password.')).toBeVisible();
	await expect(page).toHaveURL('/login');
});

//========================================
// LOGIN WITH THE API UNREACHABLE
//========================================
// Shows that the server can't be reached
// instead of blaming the credentials.
//========================================

test('login with the API unreachable shows a connection error', async ({ page }) => {
	await page.route('**/auth/login', (route) => route.abort());
	await page.goto('/login');
	await page.getByLabel('Username').fill(E2E_USERNAME || 'dev-user');
	await page.getByLabel('Password').fill('any-password');
	await page.getByRole('button', { name: 'Login' }).click();

	await expect(
		page.getByText("Couldn't reach the server. Check your connection and try again."),
	).toBeVisible();
	await expect(page.getByText('Invalid username or password.')).toBeHidden();
});

//========================================
// LOGIN SCREEN ACCESSIBILITY
//========================================
// Fails only on critical or serious axe
// violations, the ones that really break
// the experience.
//========================================

test('login screen has no serious a11y violations', async ({ page }) => {
	await page.goto('/login');

	const results = await new AxeBuilder({ page }).analyze();
	const serious = results.violations.filter(
		(v) => v.impact === 'critical' || v.impact === 'serious',
	);

	expect(serious).toEqual([]);
});
