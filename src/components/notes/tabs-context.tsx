'use client';

import { arrayMove } from '@dnd-kit/sortable';
import { useParams, usePathname, useRouter } from 'next/navigation';
import {
	createContext,
	type ReactNode,
	type SetStateAction,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
} from 'react';
import { useNotesTree } from '@/components/notes/notes-context';
import { usePersistentState } from '@/hooks/use-persistent-state';
import type { NoteTreeNode } from '@/services/notes-service';

const STORAGE_KEY = 'hub-pessoal:notes-tabs';

export type NoteTab = { id: string; preview: boolean };

type StoredTabs = { tabs: NoteTab[]; lastActiveId: string | null };

const EMPTY_STORED_TABS: StoredTabs = { tabs: [], lastActiveId: null };

type NoteTabsContextValue = {
	tabs: NoteTab[];
	activeId: string | null;
	titleOf: (id: string) => string;
	openTab: (id: string, options?: { preview: boolean }) => void;
	pinTab: (id: string) => void;
	closeTab: (id: string) => void;
	closeOthers: (id: string) => void;
	closeAll: () => void;
	moveTab: (id: string, overId: string) => void;
};

const NoteTabsContext = createContext<NoteTabsContextValue | null>(null);

function parseStoredTabs(value: unknown): StoredTabs | null {
	if (typeof value !== 'object' || value === null) {
		return null;
	}

	const { tabs, lastActiveId } = value as { tabs?: unknown; lastActiveId?: unknown };
	if (!Array.isArray(tabs)) {
		return null;
	}

	return {
		tabs: tabs
			.filter(
				(tab): tab is NoteTab =>
					typeof tab === 'object' &&
					tab !== null &&
					typeof tab.id === 'string' &&
					typeof tab.preview === 'boolean',
			)
			.filter((tab, index, all) => all.findIndex((other) => other.id === tab.id) === index),
		lastActiveId: typeof lastActiveId === 'string' ? lastActiveId : null,
	};
}

function collectTitles(nodes: NoteTreeNode[], titles: Map<string, string>) {
	for (const node of nodes) {
		if (node.type === 'note') {
			titles.set(node.id, node.name);
		}
		collectTitles(node.children, titles);
	}
	return titles;
}

export function NoteTabsProvider({ children }: { children: ReactNode }) {
	const router = useRouter();
	const params = useParams<{ id?: string }>();
	const pathname = usePathname();
	const { tree, loaded } = useNotesTree();
	const [stored, setStored] = usePersistentState(STORAGE_KEY, EMPTY_STORED_TABS, parseStoredTabs);
	const restoredRef = useRef(false);

	const { tabs, lastActiveId } = stored;

	const setTabs = useCallback(
		(update: SetStateAction<NoteTab[]>) => {
			setStored((current) => {
				const next = typeof update === 'function' ? update(current.tabs) : update;
				return next === current.tabs ? current : { ...current, tabs: next };
			});
		},
		[setStored],
	);

	const activeId = params.id ?? null;
	const titles = useMemo(() => collectTitles(tree, new Map()), [tree]);
	const activeKnown = activeId !== null && titles.has(activeId);

	const titleOf = useCallback((id: string) => titles.get(id) ?? 'Untitled', [titles]);

	const openTab = useCallback(
		(id: string, options: { preview: boolean } = { preview: true }) => {
			setTabs((current) => {
				const existing = current.find((tab) => tab.id === id);
				if (existing) {
					if (!existing.preview || options.preview) {
						return current;
					}
					return current.map((tab) => (tab.id === id ? { id, preview: false } : tab));
				}

				const previewIndex = current.findIndex((tab) => tab.preview);
				if (options.preview && previewIndex !== -1) {
					return current.map((tab, index) =>
						index === previewIndex ? { id, preview: true } : tab,
					);
				}

				return [...current, { id, preview: options.preview }];
			});
		},
		[setTabs],
	);

	const pinTab = useCallback((id: string) => openTab(id, { preview: false }), [openTab]);

	useEffect(() => {
		if (activeId && activeKnown) {
			openTab(activeId);
			setStored((current) =>
				current.lastActiveId === activeId ? current : { ...current, lastActiveId: activeId },
			);
		}
	}, [activeId, activeKnown, openTab, setStored]);

	useEffect(() => {
		if (!loaded || restoredRef.current) {
			return;
		}

		restoredRef.current = true;

		if (
			pathname === '/notes' &&
			lastActiveId &&
			titles.has(lastActiveId) &&
			tabs.some((tab) => tab.id === lastActiveId)
		) {
			router.replace(`/notes/${lastActiveId}`);
		}
	}, [loaded, pathname, lastActiveId, titles, tabs, router]);

	useEffect(() => {
		if (!loaded) {
			return;
		}

		setTabs((current) => {
			const kept = current.filter((tab) => titles.has(tab.id));
			return kept.length === current.length ? current : kept;
		});
	}, [loaded, titles, setTabs]);

	const closeTab = useCallback(
		(id: string) => {
			const index = tabs.findIndex((tab) => tab.id === id);
			if (index === -1) {
				return;
			}

			const remaining = tabs.filter((tab) => tab.id !== id);
			setTabs(remaining);

			if (id === activeId) {
				const next = remaining[index] ?? remaining[index - 1];
				router.push(next ? `/notes/${next.id}` : '/notes');
			}
		},
		[tabs, activeId, router, setTabs],
	);

	const closeOthers = useCallback(
		(id: string) => {
			setTabs([{ id, preview: false }]);

			if (activeId !== id) {
				router.push(`/notes/${id}`);
			}
		},
		[activeId, router, setTabs],
	);

	const closeAll = useCallback(() => {
		setTabs([]);

		if (activeId) {
			router.push('/notes');
		}
	}, [activeId, router, setTabs]);

	const moveTab = useCallback(
		(id: string, overId: string) => {
			setTabs((current) => {
				const from = current.findIndex((tab) => tab.id === id);
				const to = current.findIndex((tab) => tab.id === overId);
				return from === -1 || to === -1 || from === to ? current : arrayMove(current, from, to);
			});
		},
		[setTabs],
	);

	return (
		<NoteTabsContext.Provider
			value={{
				tabs,
				activeId,
				titleOf,
				openTab,
				pinTab,
				closeTab,
				closeOthers,
				closeAll,
				moveTab,
			}}
		>
			{children}
		</NoteTabsContext.Provider>
	);
}

export function useNoteTabs() {
	const context = useContext(NoteTabsContext);
	if (!context) {
		throw new Error('useNoteTabs must be used inside NoteTabsProvider');
	}

	return context;
}
