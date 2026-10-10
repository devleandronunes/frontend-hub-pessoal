import path from 'node:path';
import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

// Dev seed user credentials for login() in the specs (tests/e2e/helpers.ts), loaded from a
// git-ignored file instead of requiring E2E_USERNAME/E2E_PASSWORD on the command line every time.
// A variable already set in the environment (shell, CI) still takes precedence over the file.
dotenv.config({ path: path.resolve(__dirname, '.env.e2e'), quiet: true });

export default defineConfig({
	testDir: './tests/e2e',
	globalSetup: 'tests/e2e/global-setup.ts',
	fullyParallel: false,
	// The specs run against the real dev backend with no mocks (same approach as the rest of the
	// frontend) and share the same database, so running them in parallel would race tests that
	// create and delete notes and folders.
	workers: 1,
	use: {
		baseURL: 'http://localhost:3000',
		// viewport: null lets the page use the real window size instead of a fixed viewport --
		// needed for --start-maximized (below) to actually take effect in --headed mode.
		viewport: null,
		launchOptions: {
			args: ['--start-maximized'],
		},
	},
	webServer: {
		command: 'npm run dev',
		url: 'http://localhost:3000',
		reuseExistingServer: true,
	},
});
