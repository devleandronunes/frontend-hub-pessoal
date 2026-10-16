'use client';

import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';

export function usePersistentState<T>(
	key: string,
	defaultValue: T,
	parse: (value: unknown) => T | null,
): [T, Dispatch<SetStateAction<T>>] {
	const [value, setValue] = useState<T>(() => {
		if (typeof window === 'undefined') {
			return defaultValue;
		}

		try {
			const stored = window.localStorage.getItem(key);
			return stored === null ? defaultValue : (parse(JSON.parse(stored)) ?? defaultValue);
		} catch {
			return defaultValue;
		}
	});

	useEffect(() => {
		try {
			window.localStorage.setItem(key, JSON.stringify(value));
		} catch {}
	}, [key, value]);

	return [value, setValue];
}
