'use client';

import { useEffect, useState } from 'react';

export function usePersistentBoolean(key: string, defaultValue: boolean) {
	const [value, setValue] = useState(() => {
		if (typeof window === 'undefined') {
			return defaultValue;
		}

		try {
			const stored = window.localStorage.getItem(key);
			return stored === null ? defaultValue : stored === 'true';
		} catch {
			return defaultValue;
		}
	});

	useEffect(() => {
		try {
			window.localStorage.setItem(key, String(value));
		} catch {}
	}, [key, value]);

	return [value, setValue] as const;
}
