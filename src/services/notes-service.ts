import { apiClient } from '@/lib/api-client';
import { toBase64 } from '@/lib/base64';

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

export async function getTree(): Promise<NoteTreeNode[]> {
	const { data } = await apiClient.get<NoteTreeNode[]>('/notes/tree');
	return data;
}

export async function getNote(id: string): Promise<Note> {
	const { data } = await apiClient.get<Note>(`/notes/${id}`);
	return data;
}

export async function createNote(title: string, folderId: string | null): Promise<Note> {
	const { data } = await apiClient.post<Note>('/notes', {
		title,
		contentBase64: toBase64(''),
		folderId,
		tags: [],
	});
	return data;
}

export async function updateNote(
	id: string,
	title: string,
	content: string,
	tags: string[],
): Promise<Note> {
	const { data } = await apiClient.put<Note>(`/notes/${id}`, {
		title,
		contentBase64: toBase64(content),
		tags,
	});
	return data;
}

export async function renameNote(id: string, title: string): Promise<Note> {
	const note = await getNote(id);
	return updateNote(id, title, note.content, note.tags);
}

export async function deleteNote(id: string): Promise<void> {
	await apiClient.delete(`/notes/${id}`);
}

export async function togglePin(id: string): Promise<Note> {
	const { data } = await apiClient.patch<Note>(`/notes/${id}/pin`);
	return data;
}

export async function duplicateNote(id: string): Promise<Note> {
	const { data } = await apiClient.post<Note>(`/notes/${id}/duplicate`);
	return data;
}

export async function exportNote(id: string, title: string): Promise<void> {
	const { data } = await apiClient.get<Blob>(`/notes/${id}/export`, { responseType: 'blob' });

	const url = URL.createObjectURL(data);
	const link = document.createElement('a');
	link.href = url;
	link.download = `${title}.md`;
	link.click();
	URL.revokeObjectURL(url);
}

export async function createFolder(name: string, parentFolderId: string | null): Promise<Folder> {
	const { data } = await apiClient.post<Folder>('/folders', { name, parentFolderId });
	return data;
}

export async function renameFolder(id: string, name: string): Promise<Folder> {
	const { data } = await apiClient.put<Folder>(`/folders/${id}`, { name });
	return data;
}

export async function deleteFolder(id: string): Promise<void> {
	await apiClient.delete(`/folders/${id}`);
}

export async function moveNote(id: string, folderId: string | null): Promise<void> {
	await apiClient.patch(`/notes/${id}/move`, { folderId });
}

export async function moveFolder(id: string, parentFolderId: string | null): Promise<void> {
	await apiClient.patch(`/folders/${id}/move`, { parentFolderId });
}
