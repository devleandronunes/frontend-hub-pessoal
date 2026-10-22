'use client';

import { type ComponentProps, useRef } from 'react';
import { cn } from '@/lib/utils';
import { CopyCodeButton } from './copy-code-button';

export function CodeBlock({ className, children, ...props }: ComponentProps<'pre'>) {
	const preRef = useRef<HTMLPreElement>(null);

	return (
		<div className='group relative'>
			<pre ref={preRef} className={cn(className, 'pr-12')} {...props}>
				{children}
			</pre>
			<CopyCodeButton getCode={() => preRef.current?.textContent?.replace(/\n$/, '') ?? ''} />
		</div>
	);
}
