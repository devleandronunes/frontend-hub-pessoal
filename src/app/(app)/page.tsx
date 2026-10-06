import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
	return (
		<main className='flex flex-col gap-4 p-8'>
			<Card className='w-full max-w-sm [--card-spacing:--spacing(5)]'>
				<CardHeader>
					<CardTitle>Notes</CardTitle>
				</CardHeader>
				<CardContent>
					<Link href='/notes' className={buttonVariants()}>
						Open
					</Link>
				</CardContent>
			</Card>
		</main>
	);
}
