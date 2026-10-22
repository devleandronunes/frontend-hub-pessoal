'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CodeBlock } from './code-block';
import { CopyCodeButton } from './copy-code-button';

type DiagramState = { status: 'loading' | 'ready' } | { status: 'error'; message: string };

export function MermaidBlock({ source }: { source: string }) {
	const id = `mermaid-${useId().replace(/:/g, '')}`;
	const containerRef = useRef<HTMLDivElement>(null);
	const [state, setState] = useState<DiagramState>({ status: 'loading' });

	useEffect(() => {
		let cancelled = false;

		async function render() {
			try {
				const { default: mermaid } = await import('mermaid');
				mermaid.initialize({
					startOnLoad: false,
					securityLevel: 'strict',
					suppressErrorRendering: true,
					theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
				});
				const { svg } = await mermaid.render(id, source);

				if (cancelled) {
					return;
				}

				if (containerRef.current) {
					containerRef.current.innerHTML = svg;
				}
				setState({ status: 'ready' });
			} catch (error) {
				if (!cancelled) {
					setState({
						status: 'error',
						message: error instanceof Error ? error.message : 'The diagram is not valid.',
					});
				}
			}
		}

		void render();

		return () => {
			cancelled = true;
		};
	}, [id, source]);

	if (state.status === 'error') {
		return (
			<div>
				<Alert status='error' className='text-xs'>
					<AlertDescription className='whitespace-pre-wrap'>{state.message}</AlertDescription>
				</Alert>
				<CodeBlock>
					<code>{source}</code>
				</CodeBlock>
			</div>
		);
	}

	return (
		<div className='group relative'>
			<div
				ref={containerRef}
				aria-busy={state.status === 'loading'}
				className='flex justify-center overflow-x-auto py-2'
			/>
			{state.status === 'ready' && <CopyCodeButton getCode={() => source} />}
		</div>
	);
}
