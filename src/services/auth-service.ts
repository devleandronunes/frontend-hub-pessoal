import { getToken } from "@/lib/auth-token";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export async function login(username: string, password: string): Promise<string> {
    const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
        throw new Error("Usuário ou senha inválidos.");
    }

    const data = await response.json();
    return data.token as string;
}

export async function getMe(): Promise<{username: string}>{
    const token = getToken();
    if (!token) {
        throw new Error("Não autenticado");
    }

    const response = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
    });

    return response.json();
}