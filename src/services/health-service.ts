const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export async function getHealth(): Promise<string> {
    if(!API_URL) {
        throw new Error('API_URL is not defined');
    }
    const response = await fetch(`${API_URL}/health`);
    if (!response.ok) {
        throw new Error(`Health check failed with status: ${response.status}`);
    }
    return response.text();
}