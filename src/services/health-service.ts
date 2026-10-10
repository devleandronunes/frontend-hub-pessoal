import { apiClient } from '@/lib/api-client';

export async function getHealth(): Promise<string> {
	const { data } = await apiClient.get<string>('/health', { responseType: 'text' });
	return data;
}
