'use client';

import { type KeyboardEvent, useCallback, useRef } from 'react';
import { applyEdit, getMarkdownEdit } from '@/lib/markdown-shortcuts';

const MODIFIER_KEYS = ['Shift', 'Control', 'Alt', 'Meta'];

export function useMarkdownKeys() {
	const tabLeavesRef = useRef(false);

	const onKeyDown = useCallback((event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (MODIFIER_KEYS.includes(event.key)) {
			return;
		}

		if (event.key === 'Escape') {
			tabLeavesRef.current = true;
			return;
		}

		if (event.key === 'Tab' && tabLeavesRef.current) {
			tabLeavesRef.current = false;
			return;
		}

		tabLeavesRef.current = false;

		const element = event.currentTarget;
		const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent);
		const edit = getMarkdownEdit(
			{
				key: event.key,
				code: event.code,
				shiftKey: event.shiftKey,
				altKey: event.altKey,
				metaKey: event.metaKey,
				ctrlKey: event.ctrlKey,
				isComposing: event.nativeEvent.isComposing,
			},
			element.value,
			element.selectionStart,
			element.selectionEnd,
			isMac,
		);

		if (!edit) {
			return;
		}

		event.preventDefault();
		applyEdit(element, edit);
	}, []);

	const onBlur = useCallback(() => {
		tabLeavesRef.current = false;
	}, []);

	return { onKeyDown, onBlur };
}
