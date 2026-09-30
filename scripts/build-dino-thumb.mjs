/**
 * Renders the DINO project's two thumbnails:
 *
 *   assets/thumb-portfolio.png   a plain text card: the word "Portfolio"
 *   assets/thumb-dino.png        the claim in English, and under it the SAME sentence
 *                                in Japanese, painted the way DINO's paragraph reader
 *                                paints it
 *
 *   node scripts/build-dino-thumb.mjs
 *
 * The English half of the second card is not decoration: without it a reader who has
 * no Japanese sees coloured squiggles and learns nothing. Reading the claim first, then
 * the same claim coloured word-by-word, is what makes the colours mean something.
 *
 * Text only — no screenshot — so neither card goes stale when the UI does.
 *
 * The reader card's token colours are copied from the app, NOT picked to taste
 * (~/Dino/src/components/translate/translate.css .tok--c0…c5, and --word-new /
 * --bg / --surface / --text / --muted in src/components/common/common.css). If the
 * app's ramp ever changes, change it here too or the thumbnail advertises a UI that
 * no longer exists.
 *
 * Same one-shot Chromium approach as build-og-image.mjs — see the header there for
 * why this site screenshots a local file instead of taking a Playwright dependency.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, writeFileSync, unlinkSync, mkdtempSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { tmpdir, homedir } from "node:os";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WIDTH = 1200;
const HEIGHT = 675; // 16:9 — card thumbnails, not social cards

/** First Chromium-family binary that actually exists on this machine. */
function findBrowser() {
  const fixed = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  ];
  for (const p of fixed) if (existsSync(p)) return p;

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

const BROWSER = findBrowser();

/** Screenshot one standalone HTML document to `out`. */
function shot(html, out) {
  const tmp = mkdtempSync(path.join(tmpdir(), "thumb-"));
  const page = path.join(tmp, "card.html");
  writeFileSync(page, html);
  execFileSync(BROWSER, [
    "--headless",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    `--window-size=${WIDTH},${HEIGHT}`,
    // Lets the Google Fonts request land before the shot; without it the Japanese
    // falls back to a system face and the line metrics drift.
    "--virtual-time-budget=5000",
    `--screenshot=${out}`,
    `file://${page}`,
  ], { stdio: "ignore" });
  unlinkSync(page);
  console.log(`✓ wrote ${path.relative(ROOT, out)} (${WIDTH}x${HEIGHT})`);
}

const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet" />`;

const RESET = `* { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; }`;

// ---------------------------------------------------------------------------
// 1. The generic card — one word, the site's own :root palette so the thumbnail and
//    the page around it read as one thing.
// ---------------------------------------------------------------------------
const portfolio = `<!doctype html>
<meta charset="utf-8" />
${FONTS}
<style>
  ${RESET}
  body {
    background: #0b0f17;
    color: #e6ebf5;
    font-family: 'Inter', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif;
    display: flex; align-items: center; justify-content: center;
  }
  h1 { font-size: 118px; font-weight: 700; letter-spacing: -3.5px; }
</style>
<h1>Portfolio</h1>
`;

// ---------------------------------------------------------------------------
// 2. DINO card — the app's palette and the reader's own token classes.
// ---------------------------------------------------------------------------

// The sentence, tokenized the way kuromoji + the reader would hand it to the DOM:
// particles and punctuation stay plain, content words carry a knowledge state.
//   plain — not a content word / no dictionary entry
//   new   — has an entry, not saved yet (dotted underline, --word-new)
//   c0…c5 — saved, coloured by confidence: red (just added / forgotten) → green
const SENTENCE = [
  { t: "日本語", s: "c5" },
  { t: "を", s: "plain" },
  { t: "学ぶ", s: "c4" },
  { t: "ため", s: "plain" },
  { t: "の", s: "plain" },
  // Broken here on purpose: left to itself the line fills to 使いやすい and drops a
  // lone アプリ。 onto row two. The clause boundary is the natural place to split.
  { t: "、", s: "plain", br: true },
  { t: "シンプル", s: "c2" },
  { t: "で", s: "plain" },
  { t: "使いやすい", s: "new" },
  { t: "アプリ", s: "c0" },
  { t: "。", s: "plain" },
];

const tokens = SENTENCE.map(({ t, s, br }) => {
  const tok =
    s === "plain"
      ? `<span class="tok tok--plain">${t}</span>`
      : s === "new"
        ? `<span class="tok tok--new">${t}</span>`
        : `<span class="tok tok--known tok--${s}">${t}</span>`;
  return br ? `${tok}<br />` : tok;
}).join("");

const dino = `<!doctype html>
<meta charset="utf-8" />
${FONTS}
<style>
  ${RESET}
  /* DINO's own tokens — see the header note. */
  :root {
    --bg: #0f1115;
    --surface: #1a1d24;
    --border: #2c313c;
    --text: #e8eaed;
    --muted: #9aa0ab;
    --word-new: #5b9dff;
    --c0: #ff6b6b; --c1: #ff9f5a; --c2: #ffd166;
    --c3: #c9d65a; --c4: #7fce6f; --c5: #3ecb6c;
  }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'Inter', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif;
    display: grid;
    grid-template-rows: 1fr 1fr;   /* the claim, then the same claim through the reader */
  }

  /* ---- top: the claim, in English ---- */
  .top { display: flex; align-items: center; padding: 0 84px; }
  .top h1 {
    font-size: 56px; line-height: 1.2; font-weight: 700;
    letter-spacing: -1.5px; max-width: 1032px;
  }
  .top h1 .hl { color: var(--c5); }

  /* ---- bottom: the same sentence, tokenized and coloured ---- */
  .bottom {
    background: var(--surface);
    border-top: 1px solid var(--border);
    padding: 0 84px;
    display: flex; flex-direction: column; justify-content: center; gap: 30px;
  }
  .jp {
    position: relative;
    font-family: 'Noto Sans JP', "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif;
    font-size: 58px; line-height: 1.6; font-weight: 500;
    letter-spacing: 0.5px;
  }
  /* Japanese wraps mid-word by default, which would split a token across two lines and
     cut its underline in half — the underline IS the affordance, so keep each token whole. */
  .tok { border-radius: 5px; padding: 0 1px; display: inline-block; white-space: nowrap; }
  .tok--plain { color: var(--text); }
  /* addable: has a dictionary entry, not in the vocabulary yet */
  .tok--new { color: var(--word-new); border-bottom: 3px dotted var(--word-new); }
  /* known: coloured by confidence, red (just added / forgotten) → green (mastered) */
  .tok--known { border-bottom: 3px solid currentColor; }
  .tok--c0 { color: var(--c0); } .tok--c1 { color: var(--c1); } .tok--c2 { color: var(--c2); }
  .tok--c3 { color: var(--c3); } .tok--c4 { color: var(--c4); } .tok--c5 { color: var(--c5); }

  /* Sized for the thumbnail's DISPLAYED width (~430px in a project card), not for the
     1200px source — at 20px this legend rendered as unreadable mush on the card. */
  .legend { display: flex; align-items: center; gap: 38px; font-size: 24px; color: var(--muted); }
  .legend .item { display: flex; align-items: center; gap: 12px; }
  .swatch--new { width: 34px; border-bottom: 5px dotted var(--word-new); height: 5px; }
  .ramp { display: flex; gap: 4px; }
  .ramp span { width: 19px; height: 6px; border-radius: 3px; }
</style>

<div class="top">
  <h1>Easy and simple to use application for <span class="hl">learning Japanese</span></h1>
</div>

<div class="bottom">
  <div class="jp">${tokens}</div>
  <div class="legend">
    <div class="item"><span class="swatch--new"></span> Not saved yet</div>
    <div class="item">
      <span class="ramp">
        <span style="background:var(--c0)"></span><span style="background:var(--c1)"></span>
        <span style="background:var(--c2)"></span><span style="background:var(--c3)"></span>
        <span style="background:var(--c4)"></span><span style="background:var(--c5)"></span>
      </span>
      Learning &rarr; mastered
    </div>
  </div>
</div>
`;

shot(portfolio, path.join(ROOT, "assets", "thumb-portfolio.png"));
shot(dino, path.join(ROOT, "assets", "thumb-dino.png"));
