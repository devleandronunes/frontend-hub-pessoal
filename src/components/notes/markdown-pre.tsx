import { Children, type ComponentProps, isValidElement, type ReactNode } from 'react';
import { CodeBlock } from './code-block';
import { MermaidBlock } from './mermaid-block';

type CodeProps = { className?: string; children?: ReactNode };

export function MarkdownPre({ children, ...props }: ComponentProps<'pre'>) {
	const code = Children.toArray(children).find((child) => isValidElement<CodeProps>(child));

	if (isValidElement<CodeProps>(code) && code.props.className?.includes('language-mermaid')) {
		const text = typeof code.props.children === 'string' ? code.props.children : '';
		return <MermaidBlock source={text.replace(/\n$/, '')} />;
	}

	return <CodeBlock {...props}>{children}</CodeBlock>;
}
