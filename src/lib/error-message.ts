export function getErrorMessage(error: unknown, fallback: string): string {
    if(error instanceof TypeError) {
        return "Could't reach the server. Check your connection and try again.";
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallback;
}
