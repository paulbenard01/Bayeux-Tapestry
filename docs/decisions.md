# Decisions

## 2026-10-11 — Images: Wikimedia Commons first, the museum's panorama only with permission
- **Decision**: build on the public-domain Commons panorama `Tapisserie_de_Bayeux_31109.jpg` (30,000 × 300 px).
  Paul has emailed the Ville de Bayeux (tapisserie@mairie-bayeux.fr, cc documentation.tapisserie@) asking to
  use the official high-resolution images, or failing that to deep-link scenes to the official panorama.
- **Why**: the official panorama's terms allow free non-commercial viewing but forbid extracting images.
- **Rejected**: tiling the official panorama now (breaks its terms); embedding it in an iframe (no control
  over scrolling, so no narration sync).

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
