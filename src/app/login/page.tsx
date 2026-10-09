'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { setToken } from '@/lib/auth-token';
import { getErrorMessage } from '@/lib/error-message';
import { login } from '@/services/auth-service';

export default function LoginPage() {
	const router = useRouter();
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	async function handleSubmit(event: FormEvent) {
		event.preventDefault();
		setError(null);
		setLoading(true);

		try {
			const token = await login(username, password);
			setToken(token);
			router.push('/');
		} catch {
			setError(getErrorMessage(error, 'Login failed.'));
		} finally {
			setLoading(false);
		}
	}

	if (loading) {
		return (
			<main className='mx-auto grid min-h-screen w-full max-w-sm items-center justify-center p-4'>
				<Spinner className='size-8' />
			</main>
		);
	}

	return (
		<main className='mx-auto grid min-h-screen w-full max-w-sm items-center p-4'>
			<Card className='[--card-spacing:--spacing(7)]'>
				<CardHeader>
					<CardTitle>Login to your account</CardTitle>
					<CardDescription>Enter your username below to login to your account</CardDescription>
				</CardHeader>
				<form onSubmit={handleSubmit} className='flex flex-col gap-(--card-spacing)'>
					<CardContent>
						<div className='flex flex-col gap-6'>
							<div className='grid gap-2'>
								<Label htmlFor='username' className='font-normal font-sans text-base'>
									Username
								</Label>
								<Input
									id='username'
									type='text'
									value={username}
									onChange={(e) => setUsername(e.target.value)}
									required
								/>
							</div>
							<div className='grid gap-2'>
								<Label htmlFor='password' className='font-normal font-sans text-base'>
									Password
								</Label>
								<Input
									id='password'
									type='password'
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									required
								/>
							</div>
						</div>
					</CardContent>
					<CardFooter className='flex-col gap-2'>
						<Button type='submit' className='w-full text-base'>
							Login
						</Button>
						{error && (
							<Alert variant='destructive'>
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						)}
					</CardFooter>
				</form>
			</Card>
		</main>
	);
}
