import { getToken } from '@/lib/auth-token';
import { toBase64 } from '@/lib/base64';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export type NoteTreeNode = {
	id: string;
	name: string;
	type: 'folder' | 'note';
	isPinned: boolean;
	children: NoteTreeNode[];
};

export type Note = {
	id: string;
	title: string;
	content: string;
	tags: string[];
	isPinned: boolean;
	folderId: string | null;
	createdAt: string;
	updatedAt: string;
};

export type Folder = {
	id: string;
	name: string;
	parentFolderId: string | null;
	createdAt: string;
	updatedAt: string;
};

function authHeaders(): HeadersInit {
	const token = getToken();
	return token ? { Authorization: `Bearer ${token}` } : {};
}

type ProblemBody = {
	title?: string;
	detail?: string;
	errors?: Record<string, string[]>;
};

async function handle<T>(response: Response): Promise<T> {
	if (!response.ok) {
		if (response.status === 401) {
			throw new Error('Your session expired. Log in again.');
		}

		if (response.status === 403) {
			throw new Error("The server's firewall blocked this request.");
		}

		const body: ProblemBody | null = await response.json().catch(() => null);
		const firstValidationError = body?.errors ? Object.values(body.errors).flat()[0] : undefined;
		throw new Error(
			body?.detail ?? firstValidationError ?? body?.title ?? `Request failed (${response.status}).`,
		);
	}

	if (response.status === 204) {
		return undefined as T;
	}

	return response.json();
}

export function getTree(): Promise<NoteTreeNode[]> {
	return fetch(`${API_URL}/notes/tree`, { headers: authHeaders() }).then((r) => handle(r));
}

export function getNote(id: string): Promise<Note> {
	return fetch(`${API_URL}/notes/${id}`, { headers: authHeaders() }).then((r) => handle(r));
}

export function createNote(title: string, folderId: string | null): Promise<Note> {
	return fetch(`${API_URL}/notes`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...authHeaders() },
		body: JSON.stringify({ title, contentBase64: toBase64(''), folderId, tags: [] }),
	}).then((r) => handle(r));
}

export function updateNote(
	id: string,
	title: string,
	content: string,
	tags: string[],
): Promise<Note> {
	return fetch(`${API_URL}/notes/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json', ...authHeaders() },
		body: JSON.stringify({ title, contentBase64: toBase64(content), tags }),
	}).then((r) => handle(r));
}

export async function renameNote(id: string, title: string): Promise<Note> {
	const note = await getNote(id);
	return updateNote(id, title, note.content, note.tags);
}

export function deleteNote(id: string): Promise<void> {
	return fetch(`${API_URL}/notes/${id}`, { method: 'DELETE', headers: authHeaders() }).then((r) =>
		handle(r),
	);
}

export function togglePin(id: string): Promise<Note> {
	return fetch(`${API_URL}/notes/${id}/pin`, { method: 'PATCH', headers: authHeaders() }).then(
		(r) => handle(r),
	);
}

export function duplicateNote(id: string): Promise<Note> {
	return fetch(`${API_URL}/notes/${id}/duplicate`, { method: 'POST', headers: authHeaders() }).then(
		(r) => handle(r),
	);
}

export async function exportNote(id: string, title: string): Promise<void> {
	const response = await fetch(`${API_URL}/notes/${id}/export`, { headers: authHeaders() });
	if (!response.ok) {
		throw new Error('Export failed');
	}

	const blob = await response.blob();
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = `${title}.md`;
	link.click();
	URL.revokeObjectURL(url);
}

export function createFolder(name: string, parentFolderId: string | null): Promise<Folder> {
	return fetch(`${API_URL}/folders`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...authHeaders() },
		body: JSON.stringify({ name, parentFolderId }),
	}).then((r) => handle(r));
}

export function renameFolder(id: string, name: string): Promise<Folder> {
	return fetch(`${API_URL}/folders/${id}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json', ...authHeaders() },
		body: JSON.stringify({ name }),
	}).then((r) => handle(r));
}

export function deleteFolder(id: string): Promise<void> {
	return fetch(`${API_URL}/folders/${id}`, { method: 'DELETE', headers: authHeaders() }).then((r) =>
		handle(r),
	);
}
