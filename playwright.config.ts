import { defineConfig } from "@playwright/test";

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
