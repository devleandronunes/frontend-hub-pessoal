export type Edit = {
	from: number;
	to: number;
	text: string;
	selectionStart: number;
	selectionEnd: number;
};

export type KeyInfo = {
	key: string;
	code: string;
	shiftKey: boolean;
	altKey: boolean;
	metaKey: boolean;
	ctrlKey: boolean;
	isComposing: boolean;
};

const PAIRS: Record<string, string> = { '(': ')', '[': ']', '`': '`', '*': '*', '"': '"' };
const CLOSERS = new Set([')', ']', '`', '*', '"']);
const HEADING_CODES = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'];
const LIST_ITEM = /^(\s*)([-*+]|\d+\.)\s(\[[ xX]\]\s)?/;
const HEADING = /^#{1,6}\s/;
const INDENT = '  ';

function lineStart(value: string, index: number) {
	return index === 0 ? 0 : value.lastIndexOf('\n', index - 1) + 1;
}

function lineEnd(value: string, index: number) {
	const end = value.indexOf('\n', index);
	return end === -1 ? value.length : end;
}

function lineBlock(value: string, start: number, end: number) {
	const last = end > start && value[end - 1] === '\n' ? end - 1 : end;
	return { from: lineStart(value, start), to: lineEnd(value, last) };
}

function unchanged(start: number, end: number): Edit {
	return { from: start, to: start, text: '', selectionStart: start, selectionEnd: end };
}

function wrap(value: string, start: number, end: number, marker: string): Edit {
	const size = marker.length;
	const selected = value.slice(start, end);

	if (
		start >= size &&
		value.slice(start - size, start) === marker &&
		value.slice(end, end + size) === marker
	) {
		return {
			from: start - size,
			to: end + size,
			text: selected,
			selectionStart: start - size,
			selectionEnd: start - size + selected.length,
		};
	}

	return {
		from: start,
		to: end,
		text: marker + selected + marker,
		selectionStart: start + size,
		selectionEnd: end + size,
	};
}

function link(value: string, start: number, end: number): Edit {
	const selected = value.slice(start, end);
	const label = selected || 'text';
	const urlStart = start + label.length + 3;

	return {
		from: start,
		to: end,
		text: `[${label}](url)`,
		selectionStart: selected ? urlStart : start + 1,
		selectionEnd: selected ? urlStart + 3 : start + 1 + label.length,
	};
}

function codeBlock(value: string, start: number, end: number): Edit {
	const { from, to } = lineBlock(value, start, end);
	const body = value.slice(from, to);

	return {
		from,
		to,
		text: `\`\`\`\n${body}\n\`\`\``,
		selectionStart: from + 4,
		selectionEnd: from + 4 + body.length,
	};
}

function heading(value: string, start: number, end: number, level: number): Edit {
	const from = lineStart(value, start);
	const to = lineEnd(value, start);
	const line = value.slice(from, to);
	const prefix = `${'#'.repeat(level)} `;
	const existing = HEADING.exec(line)?.[0] ?? '';
	const rest = line.slice(existing.length);
	const text = existing === prefix ? rest : prefix + rest;
	const delta = text.length - line.length;
	const shift = (position: number) =>
		position > to
			? position + delta
			: Math.min(Math.max(position + delta, from), from + text.length);

	return { from, to, text, selectionStart: shift(start), selectionEnd: shift(end) };
}

function continueList(value: string, start: number, end: number): Edit | null {
	if (start !== end) {
		return null;
	}

	const from = lineStart(value, start);
	const line = value.slice(from, lineEnd(value, start));
	const match = LIST_ITEM.exec(line);
	if (!match || start - from < match[0].length) {
		return null;
	}

	if (line.slice(match[0].length).trim() === '') {
		return { from, to: from + line.length, text: '', selectionStart: from, selectionEnd: from };
	}

	const [, leading = '', current = '-', task] = match;
	const marker = /\d/.test(current) ? `${Number.parseInt(current, 10) + 1}.` : current;
	const text = `\n${leading}${marker} ${task ? '[ ] ' : ''}`;

	return {
		from: start,
		to: start,
		text,
		selectionStart: start + text.length,
		selectionEnd: start + text.length,
	};
}

function indent(value: string, start: number, end: number, outdent: boolean): Edit {
	if (!outdent && start === end) {
		const from = lineStart(value, start);
		if (!LIST_ITEM.test(value.slice(from, lineEnd(value, start)))) {
			return {
				from: start,
				to: end,
				text: INDENT,
				selectionStart: start + INDENT.length,
				selectionEnd: start + INDENT.length,
			};
		}
	}

	const { from, to } = lineBlock(value, start, end);
	const original = value.slice(from, to);
	const changes: number[] = [];
	const text = original
		.split('\n')
		.map((line) => {
			if (!outdent) {
				changes.push(INDENT.length);
				return INDENT + line;
			}

			const removed = /^( {1,2}|\t)/.exec(line)?.[0].length ?? 0;
			changes.push(-removed);
			return line.slice(removed);
		})
		.join('\n');

	if (text === original) {
		return unchanged(start, end);
	}

	const total = changes.reduce((sum, change) => sum + change, 0);
	const selectionStart = Math.max(from, start + (changes[0] ?? 0));
	const selectionEnd = start === end ? selectionStart : Math.max(selectionStart, end + total);

	return { from, to, text, selectionStart, selectionEnd };
}

function moveLines(value: string, start: number, end: number, direction: 'up' | 'down'): Edit {
	const { from, to } = lineBlock(value, start, end);
	const block = value.slice(from, to);

	if (direction === 'up') {
		if (from === 0) {
			return unchanged(start, end);
		}

		const previousFrom = lineStart(value, from - 1);
		const previous = value.slice(previousFrom, from - 1);
		const shift = -(previous.length + 1);

		return {
			from: previousFrom,
			to,
			text: `${block}\n${previous}`,
			selectionStart: start + shift,
			selectionEnd: end + shift,
		};
	}

	if (to >= value.length) {
		return unchanged(start, end);
	}

	const nextTo = lineEnd(value, to + 1);
	const next = value.slice(to + 1, nextTo);
	const shift = next.length + 1;

	return {
		from,
		to: nextTo,
		text: `${next}\n${block}`,
		selectionStart: start + shift,
		selectionEnd: end + shift,
	};
}

function duplicateLines(value: string, start: number, end: number, direction: 'up' | 'down'): Edit {
	const { from, to } = lineBlock(value, start, end);
	const block = value.slice(from, to);
	const shift = direction === 'down' ? block.length + 1 : 0;

	return {
		from: to,
		to,
		text: `\n${block}`,
		selectionStart: start + shift,
		selectionEnd: end + shift,
	};
}

function typeCharacter(value: string, start: number, end: number, key: string): Edit | null {
	const closer = PAIRS[key];

	if (start !== end) {
		if (!closer) {
			return null;
		}

		return {
			from: start,
			to: end,
			text: key + value.slice(start, end) + closer,
			selectionStart: start + 1,
			selectionEnd: end + 1,
		};
	}

	const previous = value[start - 1];
	const next = value[start];

	if (CLOSERS.has(key) && next === key) {
		return unchanged(start + 1, start + 1);
	}

	if (!closer) {
		return null;
	}

	const nextAllowsPair = next === undefined || /\s/.test(next) || CLOSERS.has(next);
	const symmetricAllowsPair =
		closer !== key || (previous !== key && (previous === undefined || !/\w/.test(previous)));

	if (!nextAllowsPair || !symmetricAllowsPair) {
		return null;
	}

	return {
		from: start,
		to: start,
		text: key + closer,
		selectionStart: start + 1,
		selectionEnd: start + 1,
	};
}

function deletePair(value: string, start: number, end: number): Edit | null {
	if (start !== end || start === 0) {
		return null;
	}

	const previous = value[start - 1] ?? '';
	if (PAIRS[previous] === undefined || PAIRS[previous] !== value[start]) {
		return null;
	}

	return {
		from: start - 1,
		to: start + 1,
		text: '',
		selectionStart: start - 1,
		selectionEnd: start - 1,
	};
}

export function getMarkdownEdit(
	event: KeyInfo,
	value: string,
	start: number,
	end: number,
	isMac: boolean,
): Edit | null {
	if (event.isComposing) {
		return null;
	}

	const mod = isMac ? event.metaKey && !event.ctrlKey : event.ctrlKey && !event.metaKey;
	const { key } = event;

	if (mod) {
		if (event.altKey) {
			const level = HEADING_CODES.indexOf(event.code) + 1;
			return level > 0 ? heading(value, start, end, level) : null;
		}

		const letter = key.toLowerCase();

		if (event.shiftKey) {
			if (letter === 'x') {
				return wrap(value, start, end, '~~');
			}
			return letter === 'e' ? codeBlock(value, start, end) : null;
		}

		switch (letter) {
			case 'b':
				return wrap(value, start, end, '**');
			case 'i':
				return wrap(value, start, end, '_');
			case 'e':
				return wrap(value, start, end, '`');
			case 'k':
				return link(value, start, end);
			default:
				return null;
		}
	}

	if (event.metaKey || event.ctrlKey) {
		return null;
	}

	if (event.altKey) {
		if (key !== 'ArrowUp' && key !== 'ArrowDown') {
			return null;
		}

		const direction = key === 'ArrowUp' ? 'up' : 'down';
		return event.shiftKey
			? duplicateLines(value, start, end, direction)
			: moveLines(value, start, end, direction);
	}

	switch (key) {
		case 'Enter':
			return event.shiftKey ? null : continueList(value, start, end);
		case 'Tab':
			return indent(value, start, end, event.shiftKey);
		case 'Backspace':
			return event.shiftKey ? null : deletePair(value, start, end);
		default:
			return key.length === 1 ? typeCharacter(value, start, end, key) : null;
	}
}

export function applyEdit(element: HTMLTextAreaElement, edit: Edit) {
	if (edit.from !== edit.to || edit.text !== '') {
		element.setSelectionRange(edit.from, edit.to);

		const done =
			edit.text === ''
				? document.execCommand('delete')
				: document.execCommand('insertText', false, edit.text);

		if (!done) {
			element.setRangeText(edit.text, edit.from, edit.to, 'end');
			element.dispatchEvent(new Event('input', { bubbles: true }));
		}
	}

	element.setSelectionRange(edit.selectionStart, edit.selectionEnd);
}
