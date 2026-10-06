'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { type ApiStatus, AppSidebar } from '@/components/shell/app-sidebar';
import { Spinner } from '@/components/ui/spinner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { clearToken, getToken } from '@/lib/auth-token';
import { getMe } from '@/services/auth-service';
import { getHealth } from '@/services/health-service';

export default function AppLayout({ children }: { children: React.ReactNode }) {
	const router = useRouter();
	const [authStatus, setAuthStatus] = useState<'checking' | 'ok'>('checking');
	const [username, setUsername] = useState<string | null>(null);
	const [apiStatus, setApiStatus] = useState<ApiStatus>('loading');

	useEffect(() => {
		if (!getToken()) {
			router.push('/login');
			return;
		}

		getMe()
			.then((data) => {
				setUsername(data.username);
				setAuthStatus('ok');
			})
			.catch(() => {
				clearToken();
				router.push('/login');
			});
	}, [router]);

	useEffect(() => {
		if (authStatus !== 'ok') {
			return;
		}

		getHealth()
			.then(() => setApiStatus('ok'))
			.catch(() => setApiStatus('error'));
	}, [authStatus]);

	function handleLogout() {
		clearToken();
		router.push('/login');
	}

	if (authStatus === 'checking') {
		return (
			<main className='flex min-h-screen items-center justify-center'>
				<Spinner className='size-8' />
			</main>
		);
	}

	return (
		<TooltipProvider>
			<div className='flex min-h-screen'>
				<AppSidebar username={username} apiStatus={apiStatus} onLogout={handleLogout} />
				<div className='flex-1 overflow-y-auto'>{children}</div>
			</div>
		</TooltipProvider>
	);
}
