'use client';

import { Extension } from '@tiptap/core';
import { Image } from '@tiptap/extension-image';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import { Markdown } from '@tiptap/markdown';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useRef } from 'react';

const HubShortcuts = Extension.create({
	name: 'hubShortcuts',
	addKeyboardShortcuts() {
		return {
			'Mod-Shift-x': () => this.editor.commands.toggleStrike(),
			'Mod-Shift-e': () => this.editor.commands.toggleCodeBlock(),
		};
	},
});

export function MarkdownEditor({
	value,
	onChange,
}: {
	value: string;
	onChange: (value: string) => void;
}) {
	const onChangeRef = useRef(onChange);

	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	const editor = useEditor({
		extensions: [
			StarterKit.configure({ underline: false, trailingNode: false, link: { openOnClick: false } }),
			Image,
			TaskList,
			TaskItem.configure({ nested: true }),
			TableKit,
			Markdown,
			HubShortcuts,
		],
		content: value,
		contentType: 'markdown',
		immediatelyRender: false,
		editorProps: {
			attributes: {
				class: 'prose min-h-full max-w-none outline-none',
				role: 'textbox',
				'aria-label': 'Markdown editor',
				'aria-multiline': 'true',
			},
		},
		onUpdate: ({ editor: current }) => onChangeRef.current(current.getMarkdown()),
	});

	return <EditorContent editor={editor} className='h-full' />;
}
