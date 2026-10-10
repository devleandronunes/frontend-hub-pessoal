import axios, { isAxiosError } from 'axios';
import { getToken } from '@/lib/auth-token';

type ProblemBody = {
	title?: string;
	detail?: string;
	errors?: Record<string, string[]>;
};

export class ApiError extends Error {
	status: number | null;

	constructor(message: string, status: number | null) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
	}
}

export const apiClient = axios.create({
	baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
});

apiClient.interceptors.request.use((config) => {
	const token = getToken();
	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
});

apiClient.interceptors.response.use(
	(response) => response,
	(error: unknown) => Promise.reject(toApiError(error)),
);

function toApiError(error: unknown) {
	if (!isAxiosError(error) || axios.isCancel(error)) {
		return error;
	}

	if (!error.response) {
		return new ApiError("Couldn't reach the server. Check your connection and try again.", null);
	}

	const { status, data } = error.response;

	if (status === 401) {
		return new ApiError('Your session expired. Log in again.', status);
	}

	if (status === 403) {
		return new ApiError("The server's firewall blocked this request.", status);
	}

	if (status === 404) {
		return new ApiError('That note or folder no longer exists.', status);
	}

	const body: ProblemBody | null =
		typeof data === 'object' && data !== null && !(data instanceof Blob) ? data : null;
	const firstValidationError = body?.errors ? Object.values(body.errors).flat()[0] : undefined;

	return new ApiError(
		body?.detail ?? firstValidationError ?? body?.title ?? `Request failed (${status}).`,
		status,
	);
}
