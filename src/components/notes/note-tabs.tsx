'use client';

import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	MouseSensor,
	TouchSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	horizontalListSortingStrategy,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
} from '@dnd-kit/sortable';
import { FileTextIcon, XIcon } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef } from 'react';
import { type NoteTab, useNoteTabs } from '@/components/notes/tabs-context';
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';

export function NoteTabs() {
	const { tabs, moveTab } = useNoteTabs();

	const sensors = useSensors(
		useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
		useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
		useSensor(KeyboardSensor, {
			keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	if (tabs.length === 0) {
		return null;
	}

	function handleDragEnd(event: DragEndEvent) {
		if (event.over && event.active.id !== event.over.id) {
			moveTab(String(event.active.id), String(event.over.id));
		}
	}

	return (
		<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
			<SortableContext items={tabs.map((tab) => tab.id)} strategy={horizontalListSortingStrategy}>
				<nav
					aria-label='Open notes'
					className='flex shrink-0 overflow-x-auto border-border border-b-2'
				>
					{tabs.map((tab) => (
						<TabItem key={tab.id} tab={tab} />
					))}
				</nav>
			</SortableContext>
		</DndContext>
	);
}

function TabItem({ tab }: { tab: NoteTab }) {
	const { tabs, activeId, titleOf, pinTab, closeTab, closeOthers, closeAll } = useNoteTabs();
	const {
		attributes,
		listeners,
		setNodeRef,
		setActivatorNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({
		id: tab.id,
	});
	const { role: _role, ...sortableAttributes } = attributes;
	const rootRef = useRef<HTMLDivElement | null>(null);
	const setRefs = useCallback(
		(element: HTMLDivElement | null) => {
			rootRef.current = element;
			setNodeRef(element);
		},
		[setNodeRef],
	);
	const isActive = tab.id === activeId;
	const title = titleOf(tab.id);

	useEffect(() => {
		if (isActive) {
			rootRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
		}
	}, [isActive]);

	return (
		<ContextMenu>
			<ContextMenuTrigger
				render={
					<div
						ref={setRefs}
						style={{
							transform: transform ? `translate3d(${transform.x}px, 0, 0)` : undefined,
							transition,
						}}
						className={cn(
							'group flex w-44 shrink-0 items-center border-border border-r-2 text-sm',
							isActive ? 'bg-accent' : 'hover:bg-accent/50',
							isDragging && 'relative z-10 opacity-70',
						)}
					/>
				}
			>
				<Link
					ref={setActivatorNodeRef}
					{...sortableAttributes}
					{...listeners}
					href={`/notes/${tab.id}`}
					draggable={false}
					aria-current={isActive ? 'page' : undefined}
					onDoubleClick={() => pinTab(tab.id)}
					onMouseDown={(event) => {
						if (event.button === 1) {
							event.preventDefault();
						}
						listeners?.onMouseDown?.(event);
					}}
					onAuxClick={(event) => {
						if (event.button === 1) {
							event.preventDefault();
							closeTab(tab.id);
						}
					}}
					className='flex min-w-0 flex-1 items-center gap-1 py-1.5 pl-2'
				>
					<FileTextIcon className='size-4 shrink-0' />
					<span className={cn('truncate', tab.preview && 'italic')}>{title}</span>
				</Link>
				<button
					type='button'
					aria-label={`Close ${title}`}
					onClick={() => closeTab(tab.id)}
					className={cn(
						'mr-1 shrink-0 rounded p-0.5 hover:bg-border/40',
						!isActive && 'opacity-0 focus-visible:opacity-100 group-hover:opacity-100',
					)}
				>
					<XIcon className='size-3.5' />
				</button>
			</ContextMenuTrigger>

			<ContextMenuContent>
				<ContextMenuItem onClick={() => closeTab(tab.id)}>Close</ContextMenuItem>
				<ContextMenuItem disabled={tabs.length < 2} onClick={() => closeOthers(tab.id)}>
					Close others
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem onClick={closeAll}>Close all</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
