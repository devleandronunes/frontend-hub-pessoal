import { ApiError, apiClient } from '@/lib/api-client';

export async function login(username: string, password: string): Promise<string> {
	try {
		const { data } = await apiClient.post<{ token: string }>('/auth/login', {
			username,
			password,
		});
		return data.token;
	} catch (error) {
		if (error instanceof ApiError && error.status === 401) {
			throw new Error('Invalid username or password.');
		}

		throw error;
	}
}

export async function getMe(): Promise<{ username: string }> {
	const { data } = await apiClient.get<{ username: string }>('/auth/me');
	return data;
}
