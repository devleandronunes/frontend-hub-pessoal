'use client';

import { ChevronDownIcon, CopyIcon, DownloadIcon, PinIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MarkdownPre } from '@/components/notes/markdown-pre';
import { useNotesTree } from '@/components/notes/notes-context';
import { useSync } from '@/components/notes/sync-context';
import { useNoteTabs } from '@/components/notes/tabs-context';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useMarkdownKeys } from '@/hooks/use-markdown-keys';
import { usePersistentState } from '@/hooks/use-persistent-state';
import { getErrorMessage } from '@/lib/error-message';
import {
	duplicateNote,
	exportNote,
	getNote,
	type Note,
	togglePin,
	updateNote,
} from '@/services/notes-service';

const MarkdownEditor = dynamic(
	() => import('@/components/notes/markdown-editor').then((module) => module.MarkdownEditor),
	{ ssr: false, loading: () => <Spinner className='size-6' /> },
);

type SaveStatus = 'idle' | 'saving' | 'saved';

type EditorKind = 'text' | 'markdown';

function parseEditorKind(value: unknown): EditorKind | null {
	return value === 'text' || value === 'markdown' ? value : null;
}

export default function NoteEditorPage() {
	const params = useParams<{ id: string }>();
	return <NoteEditor key={params.id} id={params.id} />;
}

function NoteEditor({ id }: { id: string }) {
	const router = useRouter();
	const { refreshTree, showError } = useNotesTree();
	const { refreshStatus } = useSync();
	const { pinTab } = useNoteTabs();
	const markdownKeys = useMarkdownKeys();

	const [note, setNote] = useState<Note | null>(null);
	const [loading, setLoading] = useState(true);
	const [mode, setMode] = useState<'preview' | 'editor'>('preview');
	const [editorKind, setEditorKind] = usePersistentState<EditorKind>(
		'hub-pessoal:notes-editor-kind',
		'text',
		parseEditorKind,
	);
	const [content, setContent] = useState('');
	const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		getNote(id)
			.then((data) => {
				setNote(data);
				setContent(data.content);
			})
			.catch((error) => showError(getErrorMessage(error, "Couldn't open the note.")))
			.finally(() => setLoading(false));
	}, [id, showError]);

	function handleContentChange(value: string) {
		pinTab(id);
		setContent(value);
		setSaveStatus('saving');

		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
		}

		debounceRef.current = setTimeout(async () => {
			if (!note) {
				return;
			}

			try {
				const updated = await updateNote(note.id, note.title, value, note.tags);
				setNote(updated);
				setSaveStatus('saved');
				void refreshStatus();
			} catch (error) {
				setSaveStatus('idle');
				showError(
					getErrorMessage(
						error,
						"Couldn't save — another note with this title may already exist in this folder.",
					),
				);
			}
		}, 800);
	}

	async function handleTogglePin() {
		if (!note) {
			return;
		}
		try {
			const updated = await togglePin(note.id);
			setNote(updated);
			await refreshTree();
			void refreshStatus();
		} catch (error) {
			showError(getErrorMessage(error, "Couldn't pin the note."));
		}
	}

	async function handleDuplicate() {
		if (!note) {
			return;
		}
		try {
			const copy = await duplicateNote(note.id);
			await refreshTree();
			pinTab(copy.id);
			void refreshStatus();
			router.push(`/notes/${copy.id}`);
		} catch (error) {
			showError(getErrorMessage(error, "Couldn't duplicate the note."));
		}
	}

	async function handleExport() {
		if (!note) {
			return;
		}
		try {
			await exportNote(note.id, note.title);
		} catch (error) {
			showError(getErrorMessage(error, "Couldn't export the note."));
		}
	}

	if (loading) {
		return (
			<div className='flex h-full items-center justify-center'>
				<Spinner className='size-8' />
			</div>
		);
	}

	if (!note) {
		return <div className='p-6 text-muted-foreground text-sm'>Note not found.</div>;
	}

	return (
		<div className='flex h-full flex-col'>
			<div className='flex items-center justify-between border-border border-b-2 p-2'>
				<div className='flex items-center gap-1'>
					<Button
						size='sm'
						variant={mode === 'preview' ? 'default' : 'outline'}
						onClick={() => setMode('preview')}
					>
						Preview
					</Button>
					<div className='flex'>
						<Button
							size='sm'
							variant={mode === 'editor' ? 'default' : 'outline'}
							className='rounded-r-none'
							onClick={() => setMode('editor')}
						>
							Editor
						</Button>
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<Button
										size='icon-sm'
										variant={mode === 'editor' ? 'default' : 'outline'}
										aria-label='Edit mode'
										className='rounded-l-none border-l-0'
									/>
								}
							>
								<ChevronDownIcon />
							</DropdownMenuTrigger>
							<DropdownMenuContent align='start'>
								<DropdownMenuRadioGroup
									value={editorKind}
									onValueChange={(value) => {
										const kind = parseEditorKind(value);
										if (kind) {
											setEditorKind(kind);
											setMode('editor');
										}
									}}
								>
									<DropdownMenuRadioItem value='text' closeOnClick>
										Text editor
									</DropdownMenuRadioItem>
									<DropdownMenuRadioItem value='markdown' closeOnClick>
										Markdown editor
									</DropdownMenuRadioItem>
								</DropdownMenuRadioGroup>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
					<span className='ml-2 text-muted-foreground text-xs'>
						{saveStatus === 'saving' && 'Saving...'}
						{saveStatus === 'saved' && 'Saved'}
					</span>
				</div>

				<div className='flex gap-1'>
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									size='icon-sm'
									variant='ghost'
									aria-label={note.isPinned ? 'Unpin' : 'Pin'}
									onClick={handleTogglePin}
								>
									<PinIcon className={note.isPinned ? 'fill-primary text-primary' : ''} />
								</Button>
							}
						/>
						<TooltipContent>{note.isPinned ? 'Unpin' : 'Pin'}</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									size='icon-sm'
									variant='ghost'
									aria-label='Duplicate'
									onClick={handleDuplicate}
								>
									<CopyIcon />
								</Button>
							}
						/>
						<TooltipContent>Duplicate</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									size='icon-sm'
									variant='ghost'
									aria-label='Export .md'
									onClick={handleExport}
								>
									<DownloadIcon />
								</Button>
							}
						/>
						<TooltipContent>Export .md</TooltipContent>
					</Tooltip>
				</div>
			</div>

			<div className='flex-1 overflow-y-auto p-6'>
				{mode === 'editor' && editorKind === 'markdown' ? (
					<MarkdownEditor value={content} onChange={handleContentChange} />
				) : mode === 'editor' ? (
					<Textarea
						value={content}
						onChange={(e) => handleContentChange(e.target.value)}
						onKeyDown={markdownKeys.onKeyDown}
						onBlur={markdownKeys.onBlur}
						className='min-h-full font-mono'
						placeholder='Write markdown...'
					/>
				) : (
					<div className='prose max-w-none'>
						<ReactMarkdown
							remarkPlugins={[remarkGfm]}
							components={{ pre: ({ node: _node, ...props }) => <MarkdownPre {...props} /> }}
						>
							{content}
						</ReactMarkdown>
					</div>
				)}
			</div>
		</div>
	);
}
