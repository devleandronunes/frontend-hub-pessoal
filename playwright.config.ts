import path from "node:path";
import { defineConfig } from "@playwright/test";
import dotenv from "dotenv";

// Credenciais do usuário seed de dev, pra login() nos specs (e2e/helpers.ts) — carregadas de um
// arquivo git-ignorado em vez de exigir E2E_USERNAME/E2E_PASSWORD na linha de comando toda vez.
// Uma variável já definida no ambiente (shell, CI) continua tendo prioridade sobre o arquivo.
dotenv.config({ path: path.resolve(__dirname, ".env.e2e"), quiet: true });

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  // Os specs rodam contra o backend real de dev, sem mock (mesma filosofia do resto do
  // frontend) — compartilham o mesmo banco, então rodar em paralelo criaria corrida entre
  // testes que criam/apagam notas e pastas.
  workers: 1,
  use: {
    baseURL: "http://localhost:3000",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
  },
});
