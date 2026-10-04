import { expect, test } from "@playwright/test";
import { login } from "./helpers";

// Snapshots only of the screens where the hub's own visual identity (RetroUI theme + hub palette)
// shows the most. The goal is not full screen coverage, only catching a badly broken theme.
// The baseline was generated locally (there is no CI): it depends on the OS and fonts, so it is
// not reliable on another machine until it is regenerated there.
//
// Fixed viewport, only in this file: the global config uses `viewport: null` + `--start-maximized`
// (to watch the other specs full screen in --headed mode), which would make the screenshot size
// depend on the real screen resolution -- exactly the non-determinism visual regression cannot
// have. Here it is overridden with a fixed size, the same on any machine or mode.
test.use({ viewport: { width: 1280, height: 800 } });

// Small tolerance for antialiasing noise between headless (where the baseline was generated) and
// headed runs -- same viewport, but the rasterizer can differ by a few pixels around fonts and
// icons. 2% of the pixels still catches a broken theme without failing on sub-pixel noise.
const SCREENSHOT_OPTIONS = { maxDiffPixelRatio: 0.02 };

//========================================
// LOGIN SCREEN SNAPSHOT
//========================================
// Compares the login screen with the
// baseline in visual.spec.ts-snapshots.
//========================================

test("login screen visual snapshot", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveScreenshot("login.png", SCREENSHOT_OPTIONS);
});

//========================================
// NOTES SHELL SNAPSHOT
//========================================
// Compares the authenticated shell with
// the baseline. The tree and the sync
// button are masked (see inside).
//========================================

test("notes shell visual snapshot", async ({ page }) => {
  await login(page);

  // The notes tree (aside) and the sync button change content/color with the real state of the
  // dev database and repository (other specs create notes without deleting them, and the sync
  // state varies) -- masked so only the chrome/theme (header, borders, spacing) is compared.
  await expect(page).toHaveScreenshot("notes-shell.png", {
    ...SCREENSHOT_OPTIONS,
    mask: [
      page.locator("aside"),
      page.getByRole("button", { name: /Synced|Sync|Local changes|Remote changes|Diverged/ }),
    ],
  });
});
