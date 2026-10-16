'use client';

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo } from 'react';
import { useNotesTree } from '@/components/notes/notes-context';
import { usePersistentState } from '@/hooks/use-persistent-state';
import type { NoteTreeNode } from '@/services/notes-service';

const STORAGE_KEY = 'hub-pessoal:notes-open-folders';

type OpenFoldersContextValue = {
	isOpen: (id: string) => boolean;
	setOpen: (id: string, open: boolean) => void;
};

const OpenFoldersContext = createContext<OpenFoldersContextValue | null>(null);

function parseOpenFolders(value: unknown) {
	if (!Array.isArray(value)) {
		return null;
	}

	return value.filter((id): id is string => typeof id === 'string');
}

function collectFolderIds(nodes: NoteTreeNode[], ids: Set<string>) {
	for (const node of nodes) {
		if (node.type === 'folder') {
			ids.add(node.id);
			collectFolderIds(node.children, ids);
		}
	}
	return ids;
}

export function OpenFoldersProvider({ children }: { children: ReactNode }) {
	const { tree, loaded } = useNotesTree();
	const [openIds, setOpenIds] = usePersistentState<string[]>(STORAGE_KEY, [], parseOpenFolders);
	const folderIds = useMemo(() => collectFolderIds(tree, new Set()), [tree]);

	useEffect(() => {
		if (!loaded) {
			return;
		}

		setOpenIds((current) => {
			const kept = current.filter((id) => folderIds.has(id));
			return kept.length === current.length ? current : kept;
		});
	}, [loaded, folderIds, setOpenIds]);

	const isOpen = useCallback((id: string) => openIds.includes(id), [openIds]);

	const setOpen = useCallback(
		(id: string, open: boolean) => {
			setOpenIds((current) => {
				if (current.includes(id) === open) {
					return current;
				}
				return open ? [...current, id] : current.filter((openId) => openId !== id);
			});
		},
		[setOpenIds],
	);

	return (
		<OpenFoldersContext.Provider value={{ isOpen, setOpen }}>
			{children}
		</OpenFoldersContext.Provider>
	);
}

export function useOpenFolders() {
	const context = useContext(OpenFoldersContext);
	if (!context) {
		throw new Error('useOpenFolders must be used inside OpenFoldersProvider');
	}

	return context;
}
