import { apiClient } from '@/lib/api-client';

export type SyncState = 'Clean' | 'LocalChanges' | 'RemoteChanges' | 'Diverged';

export type SyncStatus = {
	state: SyncState;
	localChanges: number;
	incomingCommits: number;
};

export type SyncFileChange = {
	path: string;
	changeType: 'Added' | 'Modified' | 'Deleted' | 'Renamed';
	insertions: number;
	deletions: number;
};

export type SyncPlan = {
	state: SyncState;
	willPull: boolean;
	willPush: boolean;
	commitMessage: string;
	commands: string[];
	changes: SyncFileChange[];
	incomingCommits: number;
	filesChanged: number;
	insertions: number;
	deletions: number;
	fingerprint: string;
};

export type SyncCommitSummary = {
	commitHash: string;
	message: string;
	committedAt: string;
	filesChanged: number;
	insertions: number;
	deletions: number;
};

export type SyncCommitDetail = SyncCommitSummary & {
	authorName: string;
	files: {
		path: string;
		changeType: string;
		noteId: string | null;
		content: string;
		insertions: number;
		deletions: number;
	}[];
};

export type ApplySyncResult =
	| { kind: 'success'; commitHash: string }
	| { kind: 'nothingToDo' }
	| { kind: 'planExpired'; detail: string }
	| { kind: 'conflict'; detail: string }
	| { kind: 'gitFailure'; detail: string };

export async function getSyncStatus(): Promise<SyncStatus> {
	const { data } = await apiClient.get<SyncStatus>('/sync/status');
	return data;
}

export async function previewSync(): Promise<SyncPlan> {
	const { data } = await apiClient.post<SyncPlan>('/sync/preview');
	return data;
}

export async function applySync(fingerprint: string): Promise<ApplySyncResult> {
	const response = await apiClient.post(
		'/sync/apply',
		{ fingerprint },
		{ validateStatus: () => true },
	);

	if (response.status === 204) {
		return { kind: 'nothingToDo' };
	}

	if (response.status === 409) {
		const body = response.data || { reason: 'Conflict', detail: '' };
		return body.reason === 'PlanExpired'
			? { kind: 'planExpired', detail: body.detail }
			: { kind: 'conflict', detail: body.detail };
	}

	if (response.status < 200 || response.status >= 300) {
		return {
			kind: 'gitFailure',
			detail: response.data?.detail ?? response.data?.title ?? 'Sync failed.',
		};
	}

	return { kind: 'success', commitHash: response.data.commitHash };
}

export async function getSyncHistory(): Promise<SyncCommitSummary[]> {
	const { data } = await apiClient.get<SyncCommitSummary[]>('/sync/history');
	return data;
}

export async function getSyncCommit(hash: string): Promise<SyncCommitDetail> {
	const { data } = await apiClient.get<SyncCommitDetail>(`/sync/history/${hash}`);
	return data;
}
