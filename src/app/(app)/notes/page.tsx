import { FileTextIcon } from 'lucide-react';
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@/components/ui/empty';

export default function NotesPage() {
	return (
		<div className='flex h-full items-center justify-center p-6'>
			<Empty>
				<EmptyHeader>
					<EmptyMedia variant='icon'>
						<FileTextIcon />
					</EmptyMedia>
					<EmptyTitle>No note selected</EmptyTitle>
					<EmptyDescription>Pick a note from the tree, or create a new one.</EmptyDescription>
				</EmptyHeader>
			</Empty>
		</div>
	);
}
