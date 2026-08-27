import type { Page } from "@playwright/test";

// Sem mock no frontend (mesma filosofia do resto do projeto) — os specs logam contra o backend
// real de dev, então as credenciais são as do usuário seed que você já configurou localmente via
// `dotnet user-secrets` (Auth:SeedUsername/Auth:SeedPassword), passadas por variável de ambiente
// pra não ficarem chumbadas no código.
export const E2E_USERNAME = process.env.E2E_USERNAME ?? "";
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "";

export async function login(page: Page) {
  if (!E2E_USERNAME || !E2E_PASSWORD) {
    throw new Error(
      "Defina E2E_USERNAME e E2E_PASSWORD com as credenciais do usuário seed de dev antes de rodar os testes E2E."
    );
  }

  await page.goto("/login");
  await page.getByLabel("Username").fill(E2E_USERNAME);
  await page.getByLabel("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForURL("/");
  await page.getByRole("link", { name: "Open" }).click();
  await page.waitForURL("/notes");
}

export function uniqueTitle(prefix: string) {
  return `${prefix} ${Date.now()}`;
}
