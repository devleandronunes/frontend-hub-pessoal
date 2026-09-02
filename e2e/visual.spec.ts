import { test, expect } from "@playwright/test";
import { login } from "./helpers";

// Snapshots só das telas onde a identidade visual própria (tema RetroUI + paleta do hub) mais
// aparece — não é objetivo perseguir 100% de cobertura de tela, só pegar quebra grosseira do
// tema (mesma filosofia de "vocabulário pequeno" das outras categorias de teste desta frente).
// Baseline gerada localmente (sem CI, ver decisão 4 da Frente 14): sensível a SO/fontes, por
// isso não deve ser tratada como confiável se rodada fora desta máquina sem regenerar.
//
// Viewport fixo, só neste arquivo: a config global usa `viewport: null` + `--start-maximized`
// (pra ver os outros specs rodando em tela cheia no modo --headed), o que faz o tamanho do
// screenshot depender da resolução real da tela de quem roda o teste -- exatamente o tipo de
// não-determinismo que regressão visual não pode ter. Aqui a gente sobrescreve pra um tamanho
// fixo, igual em qualquer máquina/modo (headless ou headed).
test.use({ viewport: { width: 1280, height: 800 } });

// Tolerância pequena pra ruído de antialiasing entre headless (onde a baseline foi gerada) e
// headed (como você roda de verdade) -- mesmo viewport, mas o rasterizador pode diferir em
// poucos pixels na borda das fontes/ícones. 2% do total de pixels ainda pega qualquer quebra
// grosseira de tema, só não falha por ruído sub-pixel.
const SCREENSHOT_OPTIONS = { maxDiffPixelRatio: 0.02 };

test("login screen visual snapshot", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveScreenshot("login.png", SCREENSHOT_OPTIONS);
});

test("notes shell visual snapshot", async ({ page }) => {
  await login(page);

  // A árvore de notas (aside) e o botão de sync mudam de conteúdo/cor com o estado real do
  // banco/repositório de dev (outros specs criam notas sem apagar, e o estado de sync varia) --
  // mascarados pra comparar só o chrome/tema (header, bordas, espaçamento), que é o que essa
  // categoria de teste realmente quer pegar (ver comentário no topo do arquivo).
  await expect(page).toHaveScreenshot("notes-shell.png", {
    ...SCREENSHOT_OPTIONS,
    mask: [
      page.locator("aside"),
      page.getByRole("button", { name: /Synced|Sync|Local changes|Remote changes|Diverged/ }),
    ],
  });
});
