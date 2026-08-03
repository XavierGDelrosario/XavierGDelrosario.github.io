/**
 * Renders the social-share card (Open Graph / Twitter) to assets/og.png.
 *
 * Regenerate after changing the card copy or the palette:
 *   node scripts/build-og-image.mjs
 *
 * The output IS committed. LinkedIn, Slack and X fetch this site with a crawler
 * that never runs JS, so the image has to exist at the deployed origin as a plain
 * static file that index.html's absolute og:image points at. 1200x630 is the size
 * all of them crop cleanly.
 *
 * This site has no build step and no package.json, so rather than add a Playwright
 * dependency for one asset, we drive whatever Chromium is already on the machine
 * (a real Chrome install, or the one Playwright downloaded for another project).
 * macOS-shaped by design — it is a one-shot asset build, not part of a deploy.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, writeFileSync, unlinkSync, mkdtempSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tmpdir, homedir } from "node:os";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// BUMP THIS whenever the card art changes, and update the og:image / twitter:image
// URLs in index.html to match. LinkedIn caches the image by URL and re-scraping the
// page via Post Inspector does NOT invalidate it — a filename it has never fetched
// before is the only thing that reliably shows the new card.
const VERSION = 2;
const OUT = path.join(ROOT, "assets", `og-v${VERSION}.png`);

/** First Chromium-family binary that actually exists on this machine. */
function findBrowser() {
  const fixed = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ];
  for (const p of fixed) if (existsSync(p)) return p;

  // Playwright's cache, whose directories carry a build number that changes.
  const cache = path.join(homedir(), "Library", "Caches", "ms-playwright");
  if (existsSync(cache)) {
    for (const dir of readdirSync(cache)) {
      for (const rel of [
        ["chrome-headless-shell-mac-x64", "chrome-headless-shell"],
        ["chrome-headless-shell-mac-arm64", "chrome-headless-shell"],
        ["chrome-mac-x64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing"],
        ["chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"],
      ]) {
        const p = path.join(cache, dir, ...rel);
        if (existsSync(p)) return p;
      }
    }
  }
  throw new Error("No Chromium-family browser found. Install Google Chrome and re-run.");
}

// The site's own dark palette (the :root block in index.html) so the card and the
// page a click-through lands on read as the same thing.
const html = `<!doctype html>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; }
  body {
    background: #0b0f17;
    color: #e6ebf5;
    font-family: 'Inter', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 68px 76px;
    position: relative;
    overflow: hidden;
  }
  /* Accent glow, bottom-right — keeps a flat dark field from reading as a broken
     image on LinkedIn's white feed. */
  .glow {
    position: absolute; right: -200px; bottom: -280px;
    width: 800px; height: 800px; border-radius: 50%;
    background: radial-gradient(circle, rgba(143,186,255,0.18) 0%, rgba(143,186,255,0) 68%);
  }
  .top { display: flex; align-items: center; gap: 22px; position: relative; }
  .mark {
    width: 72px; height: 72px; border-radius: 20px;
    background: #8fbaff; color: #0b0f17;
    font-size: 34px; font-weight: 800; letter-spacing: -1px;
    display: flex; align-items: center; justify-content: center;
  }
  .name { font-size: 38px; font-weight: 800; letter-spacing: -0.8px; }
  .role { font-size: 21px; color: #97a3bd; margin-top: 4px; }
  h1 {
    font-size: 54px; line-height: 1.16; font-weight: 700;
    letter-spacing: -1.5px; max-width: 1000px; position: relative;
  }
  h1 .hl { color: #8fbaff; }
  p.sub {
    margin-top: 20px; font-size: 23px; line-height: 1.45;
    color: #97a3bd; max-width: 880px; position: relative;
  }
  .chips { display: flex; gap: 12px; flex-wrap: wrap; position: relative; }
  .chip {
    background: #161d2c; border: 1px solid #243049; border-radius: 999px;
    padding: 11px 20px; font-size: 19px; color: #e6ebf5;
  }
  .url {
    position: relative; font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace;
    font-size: 20px; color: #8fbaff; margin-top: 26px;
  }
</style>
<div class="glow"></div>

<div class="top">
  <div class="mark">XD</div>
  <div>
    <div class="name">Xavier Del Rosario</div>
    <div class="role">Software Developer &middot; B.Sc. Computer Science, UBC</div>
  </div>
</div>

<div>
  <h1>Projects you can <span class="hl">try in the browser</span>,<br />not just read about.</h1>
  <p class="sub">A language-learning app on web and iOS, a course query engine, a normalized
  legal database, and a chess engine &mdash; several running live in the browser, no setup.</p>
</div>

<div>
  <div class="chips">
    <span class="chip">TypeScript</span><span class="chip">React</span><span class="chip">PostgreSQL</span><span class="chip">Java</span><span class="chip">Supabase</span><span class="chip">PHP</span>
  </div>
  <div class="url">xaviergdelrosario.github.io</div>
</div>
`;

const browser = findBrowser();
const tmp = mkdtempSync(path.join(tmpdir(), "og-"));
const page = path.join(tmp, "card.html");
writeFileSync(page, html);

execFileSync(browser, [
  "--headless",
  "--disable-gpu",
  "--hide-scrollbars",
  "--force-device-scale-factor=1",
  "--window-size=1200,630",
  // Lets the Google Fonts request land before the shot is taken; without it the
  // card falls back to the system sans and the weights drift.
  "--virtual-time-budget=4000",
  `--screenshot=${OUT}`,
  `file://${page}`,
], { stdio: "ignore" });

unlinkSync(page);
console.log(`✓ wrote ${path.relative(ROOT, OUT)} (1200x630) via ${path.basename(browser)}`);
