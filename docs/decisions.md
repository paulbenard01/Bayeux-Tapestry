# Decisions

## 2026-10-11 — Images: Wikimedia Commons first, the museum's panorama only with permission
- **Decision**: build on the public-domain Commons panorama `Tapisserie_de_Bayeux_31109.jpg` (30,000 × 300 px).
  Paul has emailed the Ville de Bayeux (tapisserie@mairie-bayeux.fr, cc documentation.tapisserie@) asking to
  use the official high-resolution images, or failing that to deep-link scenes to the official panorama.
- **Why**: the official panorama's terms allow free non-commercial viewing but forbid extracting images.
- **Rejected**: tiling the official panorama now (breaks its terms); embedding it in an iframe (no control
  over scrolling, so no narration sync).

## 2026-10-14 — Hosting on Cloudflare Workers (static assets)
- **Decision** (Paul connected the repository to Cloudflare Workers Builds): `wrangler.jsonc` deploys `dist/` as
  static assets, with no Worker script. About 4,400 files and no file over 25 MB, within the platform's limits.
- **Why**: free static hosting with a global cache, no server code, nothing added to the browser.

## 2026-10-14 — Name and marks: "Hic" and a ring of woven loops
- **Decision** (Paul, after several rounds of sketches and a reference he drew): the project is called *Hic*
  ("here", the first word of most captions). The wordmark sets "hIC" in heavy uncial letters on a paper panel
  framed by two bands of slanted stripes, after the borders' bars, in muted wool colours (sage green, ochre,
  terracotta, slate blue). The logo is a ring of eight loops, each passing over and under its two neighbours, drawn
  as a green ribbon edged in ochre: the interlace of the trees that divide the scenes, for intertwined histories
  and for needlework. Both are SVG drawn by `scripts/make_brand.py`; the header shows them, the favicon is the ring
  on linen.
- **Why**: the interlace recurs throughout the embroidery; the bands frame the name as the borders frame the story;
  muted colours read as considered rather than playful. Eight loops, each crossing only its neighbours, stay clean
  when small.
- **Rejected**: a whole tree (busy, hard to read small); denser knots with many loops (crossings crowd together);
  bright saturated colours and a thin outlined wordmark (too childish, then too faint); tracing from the photography.

## 2026-10-14 — A plainer, research-project look
- **Decision** (Paul): paper white, ink and hairline rules, one woad-blue accent for everything clickable, madder red
  for the main events; square corners, no cards or pills. Fewer controls on screen: theme filters as a text row,
  main events as ticks under the mini-map (the one in view keeps its label), speed and ambience as small controls,
  the keyboard help moved to About, a footer naming it a student research project. Latin caption words are coloured
  and pulse gently one after another until the reader clicks one (remembered on the device; no motion when the
  system asks for reduced motion).
- **Why**: Paul found the page overloaded and the cream-and-terracotta look too close to a generic AI product; the
  identity should read as university research work.
- **Rejected**: a numbered legend of the main events under the mini-map (crowded the page).

## 2026-10-14 — Highlights tour, two more lenses, click-to-translate Latin
- **Decision** (Paul, after looking at the British Museum's online experience): a second guided tour,
  `?tour=highlights`, of 15 key moments (about five minutes at reading speed), chosen from the play bar; the strip
  holds still on each moment while its text is read, then glides to the next. Two more lenses: animals & nature,
  and Latin & inscriptions. Every caption word can be clicked for its dictionary form, meaning and grammar, from a
  hand-written glossary (`content/latin.yaml`) that a test keeps complete.
- **Why**: the British Museum offers a short highlights tour beside a full scene-by-scene mode and themed
  hotspots including animals and Latin; a short tour is an easier way in, and the captions are the one text
  every visitor sees but few can read.
- **Rejected**: a separate recording for the highlights for now (the tour runs at reading speed; a track can be
  added later with its own cues); placing a marker on every caption (positions would need calibrating on the
  image, while the caption is already shown under it); a build-your-own themed tour (later, if wanted).

## 2026-10-14 — Deep zoom with OpenSeadragon, notes under the embroidery, five lenses
- **Decision** (Paul): zoom up to 3,000 px high (a DZI pyramid of the 2017 photography, ~236 MB in the repo) with
  OpenSeadragon 5.0.1; pan and zoom anywhere. Notes appear under the embroidery, never over it; small numbered
  markers coloured by lens sit in the upper border or on the edge of the region discussed. About 50 notes in five
  lenses (history, material & technique, art & narrative, society & daily life, afterlife & reception), main events
  numbered under the mini-map, an afterlife slideshow as a separate view.
- **Why**: Paul asked for free movement and zoom, a "polyphonic" reading beyond historical context, and overlays that
  do not hide details. OpenSeadragon is the standard museum deep-zoom viewer (BSD-3), mature and small.
- **Rejected**: full 5,550 px resolution (400-600 MB, would need separate hosting); a custom zoom on top of the
  old horizontal scroller (re-implements what OpenSeadragon does well).

## 2026-10-14 — Ambient sound and map clips
- **Decision** (Paul): ambient sound from public-domain chant recordings on Commons over a drone and distant drum
  generated with the Web Audio API; off by default, lowered under the narration. Places and movements are shown
  with map clips rendered with Paul's Map-clip-render, in French and English, rather than with pictures.
- **Rejected**: CC BY "medieval-style" library music (Paul chose public domain or CC0 only).

## 2026-10-11 — Use the 2017 high-resolution photography from Commons now
- **Decision** (Paul): make the 2017 photography (`File:Tapisserie de Bayeux.png`, 482,096 × 5,550 px) the
  default image, scaled to 1,000 px high, with its full credit; keep the older Commons scan as `?image=commons`.
  Update the email to the museum to tell them, rather than ask.
- **Why**: about 18 times sharper than the 300 px scan. Commons marks it public domain (PD-Art, PD-France):
  faithful reproductions of a 2D public-domain work are not protected in France or the EU (DSM Directive,
  art. 14). We do not extract anything from the museum's viewer ourselves.
- **Caveat**: the Commons contributor took it from the museum's online panorama, whose terms forbid
  extraction. If the museum objects, switch the default back to `layers/commons.yaml`.
- **Rejected**: the per-scene files of the same campaign (they overlap, summing to about twice the strip);
  waiting for the museum's reply (Paul's call).

## 2026-10-11 — Content positioned relative to scenes, not pixels
- **Decision**: stories and hotspots use `{scene, at}` and scene-relative boxes; each image layer maps scenes to
  pixels (`scene_starts`).
- **Why**: swapping to a better image only needs a new layer file, not new coordinates for every note.

## 2026-10-11 — One continuous narration track per language, with cues
- **Decision**: Paul records one track per language; a cue file maps times to scenes and the strip glides
  between cue targets. A browser cue editor (`?tool=cues`) produces the file.
- **Why**: Paul's choice (more natural to record). Before any recording, the same engine runs at reading speed.
- **Rejected**: one clip per scene (easier to fix one scene, but choppier to record and to listen to).

## 2026-10-11 — Tiles generated on GitHub Actions
- **Decision**: the Image tiles workflow downloads the Commons file and commits the tiles.
- **Why**: Wikimedia rate-limited (HTTP 429) the cloud sandbox used for development; GitHub runners are not
  affected, and the script stays reproducible locally.

## 2026-10-11 — No framework, YAML content parsed at build time
- **Decision**: Vite + TypeScript without a UI framework; a small Vite plugin turns YAML into modules.
- **Why**: same stack as PCI Map, few dependencies, prose stays easy to edit and review.

## 2026-10-11 — Code licence
- **Decision**: the repository's MIT licence covers the code. Texts and narration are Paul's own; their licence
  is to be decided before the repository goes public.
