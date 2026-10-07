'use client';

import {
	type Active,
	type Announcements,
	type ClientRect,
	type CollisionDetection,
	DndContext,
	type DragEndEvent,
	type DragOverEvent,
	DragOverlay,
	type DragStartEvent,
	type KeyboardCoordinateGetter,
	KeyboardSensor,
	MouseSensor,
	type Over,
	pointerWithin,
	rectIntersection,
	TouchSensor,
	useDraggable,
	useDroppable,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import { FileTextIcon, FolderIcon } from 'lucide-react';
import { createContext, type ReactNode, useContext, useState } from 'react';
import { cn } from '@/lib/utils';
import type { NoteTreeNode } from '@/services/notes-service';

export type DragItem = {
	id: string;
	type: 'note' | 'folder';
	name: string;
	parentId: string | null;
};

type DropData = { folderId: string | null; label: string; blocked: boolean };

type TreeDndState = {
	dragging: DragItem | null;
	blockedIds: ReadonlySet<string>;
	overFolderId: string | null | undefined;
	movedInto: string | null;
};

const ROOT_ID = 'root';

const TreeDndContext = createContext<TreeDndState | null>(null);

function useTreeDnd() {
	const context = useContext(TreeDndContext);
	if (!context) {
		throw new Error('useTreeDnd must be used inside TreeDndProvider');
	}
	return context;
}

const collisionDetection: CollisionDetection = (args) => {
	const collisions = pointerWithin(args);
	const candidates = collisions.length > 0 ? collisions : rectIntersection(args);
	const specific = candidates.filter((collision) => collision.id !== ROOT_ID);
	return specific.length > 0 ? specific : candidates;
};

const keyboardCoordinateGetter: KeyboardCoordinateGetter = (
	event,
	{ currentCoordinates, context: { collisionRect, droppableContainers, droppableRects } },
) => {
	if (event.code !== 'ArrowDown' && event.code !== 'ArrowUp') {
		return undefined;
	}

	event.preventDefault();
	if (!collisionRect) {
		return undefined;
	}

	const direction = event.code === 'ArrowDown' ? 1 : -1;
	const currentCenter = collisionRect.top + collisionRect.height / 2;
	const nextCenter = droppableContainers
		.getEnabled()
		.filter((container) => container.id !== ROOT_ID)
		.map((container) => droppableRects.get(container.id))
		.filter((rect): rect is ClientRect => rect !== undefined)
		.map((rect) => rect.top + rect.height / 2)
		.filter((center) => (center - currentCenter) * direction > 1)
		.sort((a, b) => (a - b) * direction)[0];

	if (nextCenter === undefined) {
		return undefined;
	}

	return { x: currentCoordinates.x, y: currentCoordinates.y + (nextCenter - currentCenter) };
};

const announcements: Announcements = {
	onDragStart: ({ active }) => `Picked up ${dragItemOf(active).name}.`,
	onDragOver: ({ active, over }) =>
		over ? `${dragItemOf(active).name} is over ${dropDataOf(over).label}.` : undefined,
	onDragEnd: ({ active, over }) =>
		over
			? `${dragItemOf(active).name} was dropped on ${dropDataOf(over).label}.`
			: `${dragItemOf(active).name} was dropped.`,
	onDragCancel: ({ active }) => `Moving ${dragItemOf(active).name} was cancelled.`,
};

function dragItemOf(active: Active) {
	return active.data.current as DragItem;
}

function dropDataOf(over: Over) {
	return over.data.current as DropData;
}

function collectSubtreeIds(tree: NoteTreeNode[], rootId: string) {
	const ids = new Set<string>();
	const pending = [...tree];

	while (pending.length > 0) {
		const node = pending.pop();
		if (!node) {
			continue;
		}

		if (node.id === rootId) {
			const subtree = [node];
			while (subtree.length > 0) {
				const current = subtree.pop();
				if (current) {
					ids.add(current.id);
					subtree.push(...current.children);
				}
			}
			break;
		}

		pending.push(...node.children);
	}

	return ids;
}

export function TreeDndProvider({
	tree,
	onMove,
	children,
}: {
	tree: NoteTreeNode[];
	onMove: (item: DragItem, folderId: string | null) => Promise<boolean>;
	children: ReactNode;
}) {
	const [dragging, setDragging] = useState<DragItem | null>(null);
	const [blockedIds, setBlockedIds] = useState<ReadonlySet<string>>(new Set());
	const [overFolderId, setOverFolderId] = useState<string | null | undefined>(undefined);
	const [movedInto, setMovedInto] = useState<string | null>(null);

	const sensors = useSensors(
		useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
		useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
		useSensor(KeyboardSensor, {
			keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
			coordinateGetter: keyboardCoordinateGetter,
		}),
	);

	function reset() {
		setDragging(null);
		setOverFolderId(undefined);
	}

	function handleDragStart({ active }: DragStartEvent) {
		const item = dragItemOf(active);
		setDragging(item);
		setBlockedIds(item.type === 'folder' ? collectSubtreeIds(tree, item.id) : new Set());
		setMovedInto(null);
	}

	function handleDragOver({ over }: DragOverEvent) {
		const target = over ? dropDataOf(over) : undefined;
		setOverFolderId(target && !target.blocked ? target.folderId : undefined);
	}

	async function handleDragEnd({ active, over }: DragEndEvent) {
		const item = dragItemOf(active);
		const target = over ? dropDataOf(over) : undefined;
		reset();

		if (!target || target.blocked || target.folderId === item.parentId) {
			return;
		}

		if (await onMove(item, target.folderId)) {
			setMovedInto(target.folderId);
		}
	}

	return (
		<DndContext
			sensors={sensors}
			collisionDetection={collisionDetection}
			onDragStart={handleDragStart}
			onDragOver={handleDragOver}
			onDragEnd={handleDragEnd}
			onDragCancel={reset}
			accessibility={{
				announcements,
				screenReaderInstructions: {
					draggable:
						'To move this item, press the space bar, use the up and down arrow keys to reach a folder, then press the space bar again to drop it. Press Escape to cancel.',
				},
			}}
		>
			<TreeDndContext.Provider value={{ dragging, blockedIds, overFolderId, movedInto }}>
				{children}
			</TreeDndContext.Provider>
			<DragOverlay dropAnimation={null}>
				{dragging && (
					<div className='flex items-center gap-1 rounded border-2 border-border bg-background px-2 py-1 text-sm shadow-md'>
						{dragging.type === 'folder' ? (
							<FolderIcon className='size-4 shrink-0' />
						) : (
							<FileTextIcon className='size-4 shrink-0' />
						)}
						<span className='truncate'>{dragging.name}</span>
					</div>
				)}
			</DragOverlay>
		</DndContext>
	);
}

export function TreeRoot({ children }: { children: ReactNode }) {
	const { overFolderId } = useTreeDnd();
	const { setNodeRef } = useDroppable({
		id: ROOT_ID,
		data: { folderId: null, label: 'the root', blocked: false } satisfies DropData,
	});

	return (
		<div
			ref={setNodeRef}
			className={cn(
				'flex min-h-full flex-col gap-1',
				overFolderId === null && 'ring-2 ring-primary ring-inset',
			)}
		>
			{children}
		</div>
	);
}

export function useTreeItem(node: NoteTreeNode, parentId: string | null) {
	const { dragging, blockedIds, overFolderId, movedInto } = useTreeDnd();
	const isFolder = node.type === 'folder';
	const item: DragItem = { id: node.id, type: node.type, name: node.name, parentId };

	const draggable = useDraggable({ id: node.id, data: item });
	const droppable = useDroppable({
		id: node.id,
		data: {
			folderId: isFolder ? node.id : parentId,
			label: isFolder ? node.name : parentId === null ? 'the root' : `the folder of ${node.name}`,
			blocked: dragging !== null && blockedIds.has(node.id),
		} satisfies DropData,
	});

	return {
		ref: (element: HTMLElement | null) => {
			draggable.setNodeRef(element);
			droppable.setNodeRef(element);
		},
		dragProps: {
			...draggable.listeners,
			'aria-describedby': draggable.attributes['aria-describedby'],
			'aria-roledescription': draggable.attributes['aria-roledescription'],
		},
		isDragging: draggable.isDragging,
		isDropTarget: isFolder && overFolderId === node.id,
		movedInto,
	};
}
