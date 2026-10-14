# CLAUDE.md

Bayeux Tapestry: a bilingual (FR/EN), narrated, scene-by-scene reading of the Bayeux Tapestry as a web app,
made for its loan to the British Museum (10 Sept 2026 – 11 July 2027). Independent, non-commercial
portfolio project by Paul Benard, companion to PCI Map and Héritle.

## Hard rules

1. **Never extract, scrape or tile images from the Bayeux Museum's online panorama ourselves**: its terms
   forbid extraction. Images come only from Wikimedia Commons files marked public domain. This includes the
   2017 high-resolution photography (`layers/bayeux2017.yaml`), which a Commons contributor took from that
   panorama: Paul decided on 2026-10-11 to use it (faithful reproductions of a 2D public-domain work are
   not protected in France or the EU) and to tell the museum. If the museum objects, switch the default back
   to `layers/commons.yaml` and record it in docs/decisions.md.
2. Every image is credited (`credit` in `layers/<id>.yaml`, shown in About). The 2017 photography always
   carries its full credit (Université de Caen Normandie, CNRS, ENSICAEN, after La Fabrique de patrimoines
   en Normandie's 2017 campaign; moral rights apply). Self-host processed images; never hotlink.
3. Every factual claim in scenes, stories and hotspots cites keys from `content/sources.yaml`. Show contested
   points as debates. Separate what the embroidery shows, what medieval texts say and what historians argue.
4. Never invent references, page numbers, quotations or URLs. A source stays `status: to_check` until its
   details are confirmed; add `pages` only after reading the passage. Put doubts in a `check:` note.
5. Own words only; quotations of at most 25 words, attributed. The Latin tituli are public domain.
6. New texts start as `review_status: unreviewed` / `lang_review: draft`; only Paul sets `reviewed`.
   Run `npm run review` after any content change (a test checks `docs/review.md` is current).
7. No analytics, cookies, trackers, third-party requests or API keys in the browser. Fonts are self-hosted
   (@fontsource). The cue editor reads audio locally and never uploads it.
8. No personal data: no names of private individuals, emails or phone numbers in content (a test checks).

## Layout

```
content/scenes.yaml       58 scenes: latin titulus, gloss, title, narration script (FR/EN), sources, review status
content/stories.yaml      pop-up cards: {scene, at (0-1 within the scene)}
content/hotspots.yaml     in-depth panels: {scene, box (x/w scene-relative, y/h within the layer's embroidery band)}
content/sources.yaml      bibliography by key (kind, citation, url, status)
content/narration/        cues.{fr,en}.json: [{t, scene, x?}] for Paul's recorded tracks (empty until recorded)
layers/<id>.yaml          image layers: source_url, size, tile width, scene_starts (source px), credit, available/calibrated
                          bayeux2017 (default, 2017 photography scaled to 1,000 px high), commons (older 300 px scan)
public/tiles/<id>/        NN.jpg tiles + overview.jpg, written by scripts/make_tiles.py (or the Image tiles workflow)
public/audio/             narration.{fr,en}.mp3 once recorded (one continuous track per language)
src/layout.ts             strip geometry (pure)      src/narration.ts  cue timing, reading-speed tour (pure)
src/state.ts              URL state (pure)           src/strip.ts      scroller, tiles, placeholder, hotspots
src/player.ts             guided tour (audio or text) src/minimap.ts   overview bar
src/tools.ts              ?tool=cues (cue editor), ?tool=calibrate (scene starts)
src/main.ts               rendering and wiring       src/i18n/{fr,en}.ts  every UI string
scripts/                  make_tiles.py, review.mjs, screenshots.mjs
docs/decisions.md         decision log            docs/review.md  generated review checklist
```

Content is placed relative to scenes, so swapping the image (e.g. the museum's, if allowed) only needs a new
layer file with its own `scene_starts`.

## Commands

```sh
npm ci
npm run dev
npm test               # vitest: logic + content validation + review.md current
npm run build          # tsc + vite build
npm run review         # regenerate docs/review.md
npm run screenshots    # needs `npm run preview` running; docs/screenshots/ + keyboard smoke test
python scripts/make_tiles.py bayeux2017   # deep-zoom tiles; needs libvips (the Image tiles workflow runs it)
```

URL: `?lang=fr|en`, `?scene=n`, `?view=text`, `?tool=cues`, `?tool=calibrate`, `?image=<layer id>`.

## Narration workflow

1. Paul reviews `script` texts, then records one continuous track per language.
2. Open `?tool=cues`, load the recording, press Space as each scene begins, export `cues.<lang>.json` into
   `content/narration/`; put the audio at `public/audio/narration.<lang>.mp3` (mono, ~96 kbps).
3. Without cues the tour scrolls at reading speed (2.5 words/s) and shows the script as captions.

## Conventions

- Code, comments, commits and docs in English; README bilingual (EN then FR); UI strings only in `src/i18n`.
- Pinned dependency versions; minimal dependencies; small tested pure functions.
- YAML prose uses `>-` block scalars (a French " : " breaks plain scalars).
- Record non-trivial decisions in `docs/decisions.md`.
