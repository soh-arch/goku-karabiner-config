#!/usr/bin/env python3
"""Render the README screenshots from docs/index.html.

Both images in the README are captures of the published manual, so they go
stale whenever docs/index.html changes. This re-shoots them in place:

    python3 scripts/shoot-readme-images.py

Needs a Chrome/Chromium binary — set CHROME=/path/to/chrome to point at one
that isn't in the list below.

Two things are patched into a throwaway copy of the page before capture:

  * `.reveal` sections start at opacity 0 and are faded in by an
    IntersectionObserver on scroll. Headless never scrolls, so without this
    they photograph as blank space.
  * For the Act shot, every other section is removed so the one we want sits
    at the top of the viewport — headless Chrome only captures the viewport,
    and `#act` in the URL doesn't reliably scroll it.

  * The page's own theme script overrides `data-theme` on load from
    localStorage, falling back to the OS `prefers-color-scheme`. Rewriting the
    attribute is therefore not enough: the theme is pinned by stubbing the
    localStorage read the page makes, so the shot is identical on any machine.

Heights are hand-tuned to end on a clean boundary (the end of a card, not the
middle of one). Re-check them after a layout change.
"""

import os
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = os.path.join(ROOT, "docs", "index.html")
ASSETS = os.path.join(ROOT, "assets")

WIDTH = 1280
SCALE = 1.5

CHROME_CANDIDATES = [
    os.environ.get("CHROME"),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    shutil.which("chromium"),
    shutil.which("chromium-browser"),
    shutil.which("google-chrome"),
]

NO_ANIMATION = """
<style>
  .reveal { opacity: 1 !important; transform: none !important; visibility: visible !important; }
  * { animation: none !important; transition: none !important; }
</style>
"""

FORCE_THEME = """
<script>
(function () {
  var theme = '%s';
  var real = Storage.prototype.getItem;
  Storage.prototype.getItem = function (key) {
    return key === 'abcact-theme' ? theme : real.call(this, key);
  };
})();
</script>
"""

KEEP_ONLY = """
<script>
window.addEventListener('load', function () {
  setTimeout(function () {
    var keep = document.getElementById('%s');
    document.querySelectorAll('header, .chapter-nav, .progress, .hero, .search-status, .no-results, footer')
      .forEach(function (e) { e.remove(); });
    document.querySelectorAll('main section').forEach(function (s) { if (s !== keep) s.remove(); });
    window.scrollTo(0, 0);
  }, 300);
});
</script>
"""

# (output name, theme, section to isolate — None keeps the whole page top, height in CSS px)
SHOTS = [
    ("manual-hero.png", "dark", None, 1140),
    ("act-tiers.png", "dark", "act", 1190),
]


def find_chrome():
    for path in CHROME_CANDIDATES:
        if path and os.path.exists(path):
            return path
    sys.exit("No Chrome/Chromium found. Set CHROME=/path/to/chrome and retry.")


def main():
    chrome = find_chrome()
    source = open(PAGE, encoding="utf-8").read()
    os.makedirs(ASSETS, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        for name, theme, section, height in SHOTS:
            head = NO_ANIMATION + (FORCE_THEME % theme) + (KEEP_ONLY % section if section else "")
            html = source.replace('data-theme="light"', 'data-theme="%s"' % theme)
            html = html.replace("</head>", head + "</head>", 1)

            page = os.path.join(tmp, name + ".html")
            open(page, "w", encoding="utf-8").write(html)

            out = os.path.join(ASSETS, name)
            subprocess.run([
                chrome, "--headless=new", "--no-sandbox", "--disable-gpu",
                "--hide-scrollbars", "--virtual-time-budget=6000",
                "--force-device-scale-factor=%s" % SCALE,
                "--window-size=%d,%d" % (WIDTH, height),
                "--screenshot=" + out,
                "file://" + page,
            ], check=True, capture_output=True)

            print("%s  %d KB" % (out, os.path.getsize(out) // 1024))


if __name__ == "__main__":
    main()
