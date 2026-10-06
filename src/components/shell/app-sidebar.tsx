'use client';

import {
	ChevronsLeftIcon,
	ChevronsRightIcon,
	HouseIcon,
	LogOutIcon,
	type LucideIcon,
	NotebookTextIcon,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePersistentBoolean } from '@/hooks/use-persistent-boolean';
import { cn } from '@/lib/utils';
import packageJson from '../../../package.json';

type Service = { id: string; label: string; href: string; icon: LucideIcon };

const services: Service[] = [
	{ id: 'notes', label: 'Notes', href: '/notes', icon: NotebookTextIcon },
];

export type ApiStatus = 'loading' | 'ok' | 'error';

const apiStatusLabels: Record<ApiStatus, string> = {
	loading: 'Checking API...',
	ok: 'API online',
	error: 'API offline',
};

const apiStatusDotClasses: Record<ApiStatus, string> = {
	loading: 'bg-muted-foreground',
	ok: 'bg-green-600',
	error: 'bg-destructive',
};

export function AppSidebar({
	username,
	apiStatus,
	onLogout,
}: {
	username: string | null;
	apiStatus: ApiStatus;
	onLogout: () => void;
}) {
	const pathname = usePathname();
	const [open, setOpen] = usePersistentBoolean('hub-pessoal:app-sidebar-open', true);
	const activeService = services.find((service) => pathname.startsWith(service.href));

	const toggle = (
		<Tooltip>
			<TooltipTrigger
				render={
					<button
						type='button'
						onClick={() => setOpen((value) => !value)}
						aria-label={open ? 'Minimize app sidebar' : 'Expand app sidebar'}
						className='rounded p-1.5 hover:bg-accent'
					>
						{open ? (
							<ChevronsLeftIcon className='size-4' />
						) : (
							<ChevronsRightIcon className='size-4' />
						)}
					</button>
				}
			/>
			<TooltipContent side='right'>{open ? 'Minimize sidebar' : 'Expand sidebar'}</TooltipContent>
		</Tooltip>
	);

	if (!open) {
		return (
			<aside className='flex w-14 shrink-0 flex-col items-center justify-between border-border border-r-2 py-4'>
				<div className='flex flex-col items-center gap-6'>
					{toggle}

					<nav className='flex flex-col items-center gap-1'>
						{activeService && <RailLink href='/' label='Home' icon={HouseIcon} />}
						{services.map((service) => (
							<RailLink
								key={service.id}
								href={service.href}
								label={service.label}
								icon={service.icon}
								active={service.id === activeService?.id}
							/>
						))}
					</nav>
				</div>

				<div className='flex flex-col items-center gap-3'>
					<Tooltip>
						<TooltipTrigger
							render={
								<span
									role='status'
									aria-label={apiStatusLabels[apiStatus]}
									className={cn('size-2.5 rounded-full', apiStatusDotClasses[apiStatus])}
								/>
							}
						/>
						<TooltipContent side='right'>
							{apiStatusLabels[apiStatus]} · v{packageJson.version}
						</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger
							render={
								<button
									type='button'
									onClick={onLogout}
									aria-label='Log out'
									className='rounded p-1.5 hover:bg-accent'
								>
									<LogOutIcon className='size-4' />
								</button>
							}
						/>
						<TooltipContent side='right'>Log out</TooltipContent>
					</Tooltip>
				</div>
			</aside>
		);
	}

	return (
		<aside className='flex w-64 shrink-0 flex-col justify-between border-border border-r-2 p-4'>
			<div className='flex flex-col gap-6'>
				<div className='flex items-start justify-between gap-2'>
					<div>
						<h1 className='font-head text-lg'>Personal Hub</h1>
						<p className='text-muted-foreground text-sm'>Welcome, {username}</p>
					</div>
					{toggle}
				</div>

				<nav className='flex flex-col gap-1'>
					{activeService ? (
						<>
							<Link
								href='/'
								className='flex items-center gap-2 py-1 text-muted-foreground text-sm hover:text-foreground'
							>
								← Back
							</Link>
							<span className='rounded bg-accent px-3 py-2 font-medium text-sm'>
								{activeService.label}
							</span>
						</>
					) : (
						services.map((service) => (
							<Link
								key={service.id}
								href={service.href}
								className='rounded px-3 py-2 font-medium text-sm hover:bg-accent'
							>
								{service.label}
							</Link>
						))
					)}
				</nav>
			</div>

			<div className='flex flex-col gap-1'>
				<Button onClick={onLogout} className='w-full'>
					Log out
				</Button>
				<p className='text-right text-muted-foreground text-xs'>{apiStatusLabels[apiStatus]}</p>
				<p className='text-right text-muted-foreground text-xs'>v{packageJson.version}</p>
			</div>
		</aside>
	);
}

function RailLink({
	href,
	label,
	icon: Icon,
	active = false,
}: {
	href: string;
	label: string;
	icon: LucideIcon;
	active?: boolean;
}) {
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<Link
						href={href}
						aria-label={label}
						aria-current={active ? 'page' : undefined}
						className={cn('rounded p-2 hover:bg-accent', active && 'bg-accent')}
					/>
				}
			>
				<Icon className='size-4' />
			</TooltipTrigger>
			<TooltipContent side='right'>{label}</TooltipContent>
		</Tooltip>
	);
}
