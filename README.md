# gta6-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/benigusman1997/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/benigusman1997/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Vice City Poster Studio** — a static, offline web app that turns your photo and a caption into GTA 6-style multi-panel poster cover art, exported as a PNG to share.

Pick a template (2×2 grid, 3 vertical strips, or hero + 2 small), drop in your own photos (or use the built-in samples), click a panel and drag to frame the shot, choose a colour grade per panel (sunset, natural, neon, noir), type a caption, and export in 1080×1080, 1080×1350 or 1920×1080. The poster is drawn on canvas with an original sunset sky, procedural skyline and palm silhouettes, thick white gutters with black keylines, halftone dots, film grain and a vignette — all original art. No Rockstar Games logo, artwork or font is used anywhere; the display type is Anton under the SIL Open Font License (see `app/fonts/OFL.txt`). Photos are read on your own machine and never uploaded.

## Run

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. Or serve `app/` with any static file server and open `app/index.html`.

## How it works

- `app/index.html` — editor layout: templates and sizes on the left, live preview in the centre, selected-panel controls on the right.
- `app/src/render.js` — the poster renderer: sunset sky, skyline, palms, panel collage, caption lettering, halftone/grain/vignette. The preview and the export call the same function, so what you see is what the PNG holds.
- `app/src/editor.js` — poster state, photo loading, panel selection and drag-to-pan, all toolbar controls, PNG export.
- `app/src/main.js` — bootstrap.
- `app/fonts/Anton-Regular.ttf` — condensed display font (SIL OFL).
- `app/samples/` — two built-in sample photos, made with an image model for make.fun and free to use.

---

Built for the make.fun bounty [gta6-cover-art-01](https://make.fun/c/gta6-cover-art-01). If you build with make.fun, use my referral code `9s0rhqbz` when you sign up — it supports this entry at no cost to you.
