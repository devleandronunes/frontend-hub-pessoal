import { execFileSync } from 'node:child_process';
import path from 'node:path';
import dotenv from 'dotenv';

const LOCAL_HOSTS = ['localhost', '127.0.0.1'];

export default function globalSetup() {
	if (process.env.E2E_KEEP_DATA === '1') {
		return;
	}

	dotenv.config({ path: path.resolve(__dirname, '../../.env.local'), quiet: true });
	dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

	const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080');
	const container = process.env.E2E_DB_CONTAINER ?? 'personal-hub-db';
	const user = process.env.E2E_DB_USER ?? 'personalhub';
	const database = process.env.E2E_DB_NAME ?? 'personalhub_dev';

	if (!LOCAL_HOSTS.includes(apiUrl.hostname)) {
		throw new Error(`Refusing to reset the data: the API at ${apiUrl.origin} is not local.`);
	}

	if (!database.endsWith('_dev')) {
		throw new Error(`Refusing to reset the data: "${database}" is not a dev database.`);
	}

	try {
		execFileSync(
			'docker',
			[
				'exec',
				container,
				'psql',
				'-U',
				user,
				'-d',
				database,
				'-v',
				'ON_ERROR_STOP=1',
				'-c',
				'TRUNCATE TABLE "SyncCommitFiles", "SyncCommits", "Notes", "NoteFolders" RESTART IDENTITY CASCADE',
			],
			{ stdio: 'pipe' },
		);
	} catch (error) {
		throw new Error(
			`Couldn't reset the dev database. Is Docker running and is the container "${container}" up?`,
			{ cause: error },
		);
	}
}
