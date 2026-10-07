'use client';

import {
	ChevronDownIcon,
	ChevronRightIcon,
	FilePlusIcon,
	FileTextIcon,
	FolderIcon,
	FolderPlusIcon,
	PencilIcon,
	PinIcon,
	Trash2Icon,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getErrorMessage } from '@/lib/error-message';
import { cn } from '@/lib/utils';
import {
	createFolder,
	createNote,
	deleteFolder,
	deleteNote,
	moveFolder,
	moveNote,
	type NoteTreeNode,
	renameFolder,
	renameNote,
} from '@/services/notes-service';
import { useNotesTree } from './notes-context';
import { useSync } from './sync-context';
import { type DragItem, TreeDndProvider, TreeRoot, useTreeItem } from './tree-dnd';

type Creating = { parentId: string | null; type: 'note' | 'folder' } | null;

export function NoteTree() {
	const { tree, refreshTree, showError } = useNotesTree();
	const { refreshStatus } = useSync();

	async function handleMove(item: DragItem, folderId: string | null) {
		try {
			if (item.type === 'note') {
				await moveNote(item.id, folderId);
			} else {
				await moveFolder(item.id, folderId);
			}
			await refreshTree();
			void refreshStatus();
			return true;
		} catch (error) {
			showError(getErrorMessage(error, "Couldn't move the item."));
			return false;
		}
	}

	return (
		<TreeDndProvider tree={tree} onMove={handleMove}>
			<NoteTreeContent />
		</TreeDndProvider>
	);
}

function NoteTreeContent() {
	const { tree, refreshTree, showError } = useNotesTree();
	const { refreshStatus } = useSync();
	const [creating, setCreating] = useState<Creating>(null);
	const router = useRouter();

	async function handleCreateSubmit(name: string) {
		if (!creating) {
			return;
		}

		const trimmed = name.trim();
		if (!trimmed) {
			setCreating(null);
			return;
		}

		try {
			if (creating.type === 'note') {
				const note = await createNote(trimmed, creating.parentId);
				await refreshTree();
				void refreshStatus();
				setCreating(null);
				router.push(`/notes/${note.id}`);
			} else {
				await createFolder(trimmed, creating.parentId);
				await refreshTree();
				void refreshStatus();
				setCreating(null);
			}
		} catch (error) {
			showError(
				getErrorMessage(
					error,
					creating.type === 'note' ? "Couldn't create the note." : "Couldn't create the folder.",
				),
			);
		}
	}

	async function handleRename(id: string, type: 'note' | 'folder', name: string) {
		try {
			if (type === 'note') {
				await renameNote(id, name);
			} else {
				await renameFolder(id, name);
			}
			await refreshTree();
			void refreshStatus();
		} catch (error) {
			showError(getErrorMessage(error, "Couldn't rename the item."));
		}
	}

	async function handleDelete(id: string, type: 'note' | 'folder') {
		try {
			if (type === 'note') {
				await deleteNote(id);
				if (window.location.pathname === `/notes/${id}`) {
					router.push('/notes');
				}
			} else {
				await deleteFolder(id);
			}
			await refreshTree();
			void refreshStatus();
		} catch (error) {
			showError(getErrorMessage(error, "Couldn't delete the item."));
		}
	}

	return (
		<TreeRoot>
			<div className='flex items-center justify-between px-1'>
				<span className='font-medium text-muted-foreground text-xs uppercase tracking-wide'>
					Notes
				</span>
				<div className='flex gap-1'>
					<Tooltip>
						<TooltipTrigger
							render={
								<button
									type='button'
									aria-label='New note'
									onClick={() => setCreating({ parentId: null, type: 'note' })}
									className='rounded p-1 hover:bg-accent'
								>
									<FilePlusIcon className='size-4' />
								</button>
							}
						/>
						<TooltipContent>New note</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger
							render={
								<button
									type='button'
									aria-label='New folder'
									onClick={() => setCreating({ parentId: null, type: 'folder' })}
									className='rounded p-1 hover:bg-accent'
								>
									<FolderPlusIcon className='size-4' />
								</button>
							}
						/>
						<TooltipContent>New folder</TooltipContent>
					</Tooltip>
				</div>
			</div>

			{creating?.parentId === null && (
				<InlineInput depth={0} onSubmit={handleCreateSubmit} onCancel={() => setCreating(null)} />
			)}

			{tree.map((node) => (
				<TreeNode
					key={node.id}
					node={node}
					parentId={null}
					depth={0}
					creating={creating}
					onStartCreate={setCreating}
					onCreateSubmit={handleCreateSubmit}
					onCreateCancel={() => setCreating(null)}
					onRename={handleRename}
					onDelete={handleDelete}
				/>
			))}
		</TreeRoot>
	);
}

function InlineInput({
	onSubmit,
	onCancel,
	depth,
	defaultValue = '',
}: {
	onSubmit: (value: string) => void;
	onCancel: () => void;
	depth: number;
	defaultValue?: string;
}) {
	const [value, setValue] = useState(defaultValue);
	// Enter fires onSubmit and, at the same moment, the input unmounts (the parent leaves the tree's
	// "creating" mode). Losing focus on an element being removed from the DOM fires blur, which would
	// call onSubmit again with the same value. This guard lets only the first call (Enter or Escape)
	// propagate; a blur after that is a no-op.
	const settledRef = useRef(false);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	function submit(current: string) {
		if (settledRef.current) {
			return;
		}
		settledRef.current = true;
		onSubmit(current);
	}

	function cancel() {
		if (settledRef.current) {
			return;
		}
		settledRef.current = true;
		onCancel();
	}

	return (
		<input
			ref={inputRef}
			aria-label='Name'
			value={value}
			onChange={(e) => setValue(e.target.value)}
			onKeyDown={(e) => {
				if (e.key === 'Enter') {
					submit(value);
				}
				if (e.key === 'Escape') {
					cancel();
				}
			}}
			onBlur={() => submit(value)}
			style={{ paddingLeft: `${depth * 16 + 8}px` }}
			className='w-full rounded border-2 bg-input py-1 pr-2 text-sm outline-none'
		/>
	);
}

function TreeNode({
	node,
	parentId,
	depth,
	creating,
	onStartCreate,
	onCreateSubmit,
	onCreateCancel,
	onRename,
	onDelete,
}: {
	node: NoteTreeNode;
	parentId: string | null;
	depth: number;
	creating: Creating;
	onStartCreate: (c: Creating) => void;
	onCreateSubmit: (name: string) => void;
	onCreateCancel: () => void;
	onRename: (id: string, type: 'note' | 'folder', name: string) => void;
	onDelete: (id: string, type: 'note' | 'folder') => void;
}) {
	const [expanded, setExpanded] = useState(false);
	const [editing, setEditing] = useState(false);
	const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
	const params = useParams<{ id?: string }>();
	const isActive = node.type === 'note' && params.id === node.id;
	const { ref, dragProps, isDragging, isDropTarget, movedInto } = useTreeItem(node, parentId);

	useEffect(() => {
		if (!isDropTarget || expanded) {
			return;
		}

		const timeout = setTimeout(() => setExpanded(true), 600);
		return () => clearTimeout(timeout);
	}, [isDropTarget, expanded]);

	useEffect(() => {
		if (movedInto === node.id) {
			setExpanded(true);
		}
	}, [movedInto, node.id]);

	const deleteDialog = (
		<AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
			<AlertDialogContent size='sm'>
				<AlertDialogHeader>
					<AlertDialogTitle>
						Delete {node.type === 'folder' ? 'this folder' : 'this note'}?
					</AlertDialogTitle>
					<AlertDialogDescription>This action can&apos;t be undone.</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						variant='destructive'
						onClick={() => {
							onDelete(node.id, node.type);
							setConfirmDeleteOpen(false);
						}}
					>
						Delete
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);

	if (editing) {
		return (
			<>
				<InlineInput
					depth={depth}
					defaultValue={node.name}
					onSubmit={(name) => {
						setEditing(false);
						const trimmed = name.trim();
						if (trimmed && trimmed !== node.name) {
							onRename(node.id, node.type, trimmed);
						}
					}}
					onCancel={() => setEditing(false)}
				/>
				{deleteDialog}
			</>
		);
	}

	if (node.type === 'folder') {
		return (
			<div>
				<ContextMenu>
					<ContextMenuTrigger
						render={
							<button
								ref={ref}
								{...dragProps}
								type='button'
								aria-expanded={expanded}
								onClick={() => setExpanded((v) => !v)}
								onDoubleClick={() => setEditing(true)}
								className={cn(
									'flex w-full items-center gap-1 rounded py-1 pr-1 text-left text-sm hover:bg-accent',
									isDragging && 'opacity-50',
									isDropTarget && 'bg-accent ring-2 ring-primary ring-inset',
								)}
								style={{ paddingLeft: `${depth * 16 + 4}px` }}
							/>
						}
					>
						{expanded ? (
							<ChevronDownIcon className='size-3.5 shrink-0' />
						) : (
							<ChevronRightIcon className='size-3.5 shrink-0' />
						)}
						<FolderIcon className='size-4 shrink-0' />
						<span className='truncate'>{node.name}</span>
					</ContextMenuTrigger>

					<ContextMenuContent>
						<ContextMenuItem
							onClick={() => {
								setExpanded(true);
								onStartCreate({ parentId: node.id, type: 'note' });
							}}
						>
							<FilePlusIcon /> New note
						</ContextMenuItem>
						<ContextMenuItem
							onClick={() => {
								setExpanded(true);
								onStartCreate({ parentId: node.id, type: 'folder' });
							}}
						>
							<FolderPlusIcon /> New folder
						</ContextMenuItem>
						<ContextMenuSeparator />
						<ContextMenuItem onClick={() => setEditing(true)}>
							<PencilIcon /> Rename
						</ContextMenuItem>
						<ContextMenuItem variant='destructive' onClick={() => setConfirmDeleteOpen(true)}>
							<Trash2Icon /> Delete
						</ContextMenuItem>
					</ContextMenuContent>
				</ContextMenu>

				{deleteDialog}

				{expanded && (
					<div>
						{creating?.parentId === node.id && (
							<InlineInput depth={depth + 1} onSubmit={onCreateSubmit} onCancel={onCreateCancel} />
						)}
						{node.children.map((child) => (
							<TreeNode
								key={child.id}
								node={child}
								parentId={node.id}
								depth={depth + 1}
								creating={creating}
								onStartCreate={onStartCreate}
								onCreateSubmit={onCreateSubmit}
								onCreateCancel={onCreateCancel}
								onRename={onRename}
								onDelete={onDelete}
							/>
						))}
					</div>
				)}
			</div>
		);
	}

	return (
		<>
			<ContextMenu>
				<ContextMenuTrigger
					render={
						<Link
							ref={ref}
							{...dragProps}
							draggable={false}
							href={`/notes/${node.id}`}
							onDoubleClick={(e) => {
								e.preventDefault();
								setEditing(true);
							}}
							className={cn(
								'flex items-center gap-1 rounded py-1 pr-1 text-sm hover:bg-accent',
								isActive && 'bg-accent',
								isDragging && 'opacity-50',
							)}
							style={{ paddingLeft: `${depth * 16 + 4}px` }}
						/>
					}
				>
					<FileTextIcon className='size-4 shrink-0' />
					<span className='truncate'>{node.name}</span>
					{node.isPinned && <PinIcon className='size-3 shrink-0 fill-primary text-primary' />}
				</ContextMenuTrigger>

				<ContextMenuContent>
					<ContextMenuItem onClick={() => setEditing(true)}>
						<PencilIcon /> Rename
					</ContextMenuItem>
					<ContextMenuItem variant='destructive' onClick={() => setConfirmDeleteOpen(true)}>
						<Trash2Icon /> Delete
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>

			{deleteDialog}
		</>
	);
}
