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
8a. Notes and their pictures are shown under the embroidery, never over it; on the image only thin outline frames
   (and a title on hover) mark what a note is about.
8b. Context pictures: only public domain, CC0, CC BY or CC BY-SA files from Wikimedia Commons, or details cropped from
   our own tiles (`scripts/make_details.py`), credited in `content/media.yaml` (a test checks the licences).
   Geography and journeys are shown with Map-clip-render clips, which play by themselves. Every afterlife slide has
   at least one visual (a test checks).
8. No personal data: no names of private individuals, emails or phone numbers in content (a test checks).

## Layout

```
content/scenes.yaml       58 scenes: latin titulus, gloss, title, narration script (FR/EN), sources, review status
content/notes.yaml        ~60 notes in seven lenses (history, material, art, society, nature, latin, afterlife): a frame
                          on the image, either box (x/w scene-relative, y/h within the band) or a default frame around
                          {scene, at, y?} (layout.ts noteBox), summary, sections, media
content/media.yaml        pictures (Commons), details of the embroidery (local: true) and map clips, with credit and licence
content/milestones.yaml   main events marked under the mini-map
content/highlights.yaml   the highlights tour (?tour=highlights): 15 stops {scene, at, title, text, note?, sources}
content/soundscape.yaml   per scene: a mood for the ethereal hum, quiet effect layers, and the horses' gait
content/sounds.yaml       recorded effects (CC0, OpenGameArt.org) with author and page; scripts/make_sounds.py cuts
                          and loops them into public/audio/sfx/*.mp3 (needs ffmpeg, numpy)
content/latin.yaml        word-by-word glossary of the captions {lemma, gram codes, gloss}; a test keeps it complete
content/afterlife.yaml    slides of the afterlife slideshow (?view=afterlife)
content/sources.yaml      bibliography by key (kind, citation, url, status)
content/narration/        cues.{fr,en}.json: [{t, scene, x?}] for the narration tracks
assets/narration/<lang>/  ElevenLabs clips per scene + manifest.json (text hash, model, voice), joined by narrate.mjs
layers/<id>.yaml          image layers: source_url, size, tile width, scene_starts (source px), credit, available/calibrated
                          bayeux2017 (default, 2017 photography scaled to 1,000 px high), commons (older 300 px scan)
public/tiles/<id>/        image.dzi + image_files/ (deep zoom) + overview.jpg, written by scripts/make_tiles.py
                          (Image tiles workflow); bayeux2017 is 3,000 px high (~236 MB)
public/media/             Commons pictures (Media workflow), details/ (scripts/make_details.py) and
                          maps/<name>.<lang>.mp4 map clips + posters
public/brand/             the marks, drawn by scripts/make_brand.py (needs fonttools): hic-wordmark.svg ("HIC" in
                          Uncial Antiqua, OFL, outlined; font in scripts/fonts/; framed by striped bands, the standalone
                          logo), hic-letters.svg (the letters alone; in the header, boxed with the shield, since the top
                          bar carries the stripes), hic-shield.svg (kite shield over crossed threaded needles),
                          hic-knot.svg (one braided strand; the favicon). docs/brand/linkedin-thumbnail.png: 1200x627
maps/                     Map-clip-render scenes, written by scripts/map_scenes.py
public/audio/             narration.{fr,en}.mp3 (one continuous track per language)
src/layout.ts             strip geometry (pure)      src/narration.ts  cue timing, reading-speed tour (pure)
src/state.ts              URL state (pure)           src/strip.ts      OpenSeadragon viewer, note frames, click hit-test
src/player.ts             guided tour (audio or text) src/minimap.ts   overview bar + milestones
src/notes-panel.ts        multi-select lens filter, cards in view, open note (always under the embroidery)
src/media.ts              picture / autoplaying map clip    src/soundscape.ts  hum + effects that follow the scene
src/afterlife.ts          the afterlife slideshow
src/latin.ts              caption words and their expansions, grammar labels (pure)
src/thumb.ts              a note's detail drawn from the deep-zoom tiles (tile maths pure)
src/icons.ts              line icons for the menus (no words in the bars)
src/tools.ts              ?tool=cues (cue editor), ?tool=calibrate (scene starts)
src/main.ts               rendering and wiring       src/i18n/{fr,en}.ts  every UI string
scripts/                  make_tiles.py, fetch_media.mjs, narrate.mjs, make_details.py, make_sounds.py, map_scenes.py, make_brand.py, narration.py, review.mjs,
                          screenshots.mjs
docs/decisions.md         decision log            docs/review.md  generated review checklist
wrangler.jsonc            Cloudflare Workers Builds: deploys dist/ as static assets
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

URL: `?lang=fr|en`, `?scene=n`, `?lens=<lens>,<lens>|none` (all when absent), `?tour=highlights`, `?view=text|afterlife` (+ `#n` slide), `?tool=cues|calibrate`,
`?image=<layer id>`.

Map clips: edit `scripts/map_scenes.py`, run it, then render each `maps/<name>.<lang>.json` with Map-clip-render
(`node render.js --scene ... --width 1280 --out public/media/maps/<name>.<lang>.mp4`) and take the last frame as
the poster (`ffmpeg -sseof -0.3 -i clip.mp4 -frames:v 1 clip.jpg`).

## Narration workflow

1. Paul reviews `script` texts; `python scripts/narration.py export` writes them to `docs/narration-script.{fr,en}.md`.
2. The Narration workflow (Actions tab, by hand; `scripts/narrate.mjs`, repository secret `ELEVENLABS_API_KEY`) voices
   each scene with ElevenLabs (Multilingual v2; Adam Stone in English, Nicolas in French), keeps the clips in
   `assets/narration/<lang>/`, joins them into `public/audio/narration.<lang>.mp3` and writes
   `content/narration/cues.<lang>.json` (1.5 s of silence first; `node scripts/narrate.mjs --join` rebuilds the
   tracks from the kept clips without the key). Only scenes whose text, model or voice changed are regenerated (1 credit
   per character; ~23,000 for both languages); it refuses to start without enough credits.
   The voice is synthetic, so About says so and credits the tool.
   For clips made elsewhere or recorded: `python scripts/narration.py assemble <lang> <folder>`
   (`scene-01.mp3` ... `scene-58.mp3`). For one continuous recording, open `?tool=cues`, press Space as each scene
   begins and export the cues.
3. Without cues the tour scrolls at reading speed (2.5 words/s) and shows the script as captions.
4. The highlights tour runs at reading speed only (its texts are in `content/highlights.yaml`).

## Conventions

- Code, comments, commits and docs in English; README bilingual (EN then FR); UI strings only in `src/i18n`.
- Pinned dependency versions; minimal dependencies; small tested pure functions.
- YAML prose uses `>-` block scalars (a French " : " breaks plain scalars).
- Record non-trivial decisions in `docs/decisions.md`.
