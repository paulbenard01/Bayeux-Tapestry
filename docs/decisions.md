# Decisions

## 2026-10-14 — A richer soundscape, and a hum that colours with the mood
- **Decision** (Paul): new effects generated with ElevenLabs (`scripts/make_sfx.mjs`): Harold's hawk (rare, scenes
  2, 4, 7, 8), hounds' barks, ships' creaking timbers at sea, a banquet-hall bed and a distant-battle bed (the
  CC0 crowd recording sounded muffled and is dropped), a war horn on arriving at Dinan (19) and the address (51),
  and a sacred shimmer at the hand of God (26), the coronation (30) and the comet (32). Arrival cues play once,
  not again within 30 s. The hum is a touch quieter (0.05 → 0.04) and its low-pass and level glide with the
  mood (time constant 6 s), darker for omen and elegy, lighter for calm and journey.
- **Why**: the hum masked the effects; Paul asked for sounds tied to what is on screen and for the hum to follow
  the emotion gradually rather than abruptly.

## 2026-10-14 — Horses that snort and neigh, generated
- **Decision** (Paul): louder hoofbeats (layer level 0.07 → 0.12, filter opened to 3.8 kHz), and now and then a
  snort or a neigh where horses are on screen, at a slightly different pitch each time and never the same file
  twice in a row. The five calls are generated with ElevenLabs sound effects (`scripts/make_sfx.mjs`, Sound
  effects workflow). About gains a Sound section saying where each part of the audio comes from.
- **Why**: no CC0 horse neigh or snort was found on OpenGameArt, and other sound sites could not be reached or
  checked from the build sandbox. This is an exception to "recorded effects are CC0"; a CC0 recording can
  replace any of the five files, with the same name.

## 2026-10-14 — The tour follows the reader
- **Decision** (Paul): pressing play starts the narration from the scene in view (scene 1 while the view shows
  the start); pause then play goes on from the same word; dragging, scrolling or the scene keys pause it. With the
  recorded narration the strip rests on each scene for the first 40 % of its clip, then eases to the next, so the
  scene being read is the one on screen. The audio track is the clock: if the browser or the system media keys
  pause or resume it, the strip follows, and a network error stops both rather than letting them drift apart.
- **Why**: the tour started on scene 2 (the middle of the first view), always restarted from the scene's start,
  and glided continuously towards the next scene, so the reader saw the next scene while hearing this one.

## 2026-10-14 — Narration voiced with ElevenLabs
- **Decision** (Paul): generate the narration with ElevenLabs text-to-speech rather than recording it, with
  the Multilingual v2 model (Paul asked for the best quality; ~22,400 credits for both languages), first with
  George (EN) and Nicolas (FR); merged with the branch that rewrote the scripts, Paul kept Nicolas for
  French and chose Adam Stone (smooth, relaxed, British) for English, replacing Aurore and George; both tracks
  were regenerated from the rewritten scripts.
  One clip per scene, joined with a 1.2 s pause into one track per language; cues come from the clip lengths.
  The About panel says the voice is synthetic.
- **Why**: a finished narration now, timed exactly, without a recording session; clips are kept so an edited
  scene only costs its own characters. The key stays a GitHub secret used by the Narration workflow, never
  in the browser.
- **Rejected**: Eleven v3 (more expressive but less consistent over 58 clips, and no text stitching between
  requests); Flash v2.5 (half the cost, lower quality). The cue editor stays for a recording of Paul's voice.

## 2026-10-11 — Images: Wikimedia Commons first, the museum's panorama only with permission
- **Decision**: build on the public-domain Commons panorama `Tapisserie_de_Bayeux_31109.jpg` (30,000 × 300 px).
  Paul has emailed the Ville de Bayeux (tapisserie@mairie-bayeux.fr, cc documentation.tapisserie@) asking to
  use the official high-resolution images, or failing that to deep-link scenes to the official panorama.
- **Why**: the official panorama's terms allow free non-commercial viewing but forbid extracting images.
- **Rejected**: tiling the official panorama now (breaks its terms); embedding it in an iframe (no control
  over scrolling, so no narration sync).

## 2026-10-14 — The soundscape: an ethereal hum and quiet recorded effects
- **Decision** (Paul, after listening to the first, all-synthesised version): a permanent, light hum of slow chords in
  a high register, with its own reverb, whose harmony follows the mood of each scene (calm, journey, sea, omen,
  solemn, elegy, tension, battle), as in the British Museum's online experience; under it, recorded effects kept
  very quiet: waves, wind, birds, gulls, hooves, distant hounds, axes and hammers, a murmur of voices, fire,
  clashing blades. Hooves are single hoofbeats cut from a recording and sequenced in three gaits (walk, trot,
  gallop) set per scene. Recordings are CC0 from OpenGameArt.org (content/sounds.yaml, credited in About), cut and
  looped by scripts/make_sounds.py. The generated sea swell, which Paul liked, stays.
- **Why**: the synthesised barks, voices, bells and clashes did not read as what they were meant to be, the drone
  was a single bass note, and the hooves always galloped.
- **Rejected**: Wikimedia Commons (almost no sound effects, and its downloads are rate-limited from the build
  sandbox); Freesound and Pixabay (need an account or block scripted downloads); a recorded church bell (CC BY-SA
  on Commons; could be added later through the Media workflow).

## 2026-10-14 — Frames checked by eye, a soundscape that follows the scenes
- **Decision** (Paul): every note has an explicit frame, checked against the image on a grid drawn over each
  scene (several default frames fell on empty linen or the wrong figure). The pulse moves from the Latin in
  the text to the embroidered caption on the image: a blend that tints only the dark letters, until the reader
  opens a translation; a click on the caption opens it below. The top bar stays white in dark mode, framed by
  the wordmark's stripes. Note pictures show a coarse version at once, then the sharp one, at their own
  proportions. The ambience becomes a soundscape tagged per scene (content/soundscape.yaml): sea and wind,
  hoofbeats, hounds, axes and hammers, a feast, a church chord, a funeral bell, battle; layers crossfade as
  the reader moves along. Everything is generated in the browser for now.
- **Why**: the frames are the main way into the notes, so each must sit on its subject; sounds tied to what is
  shown make the walk along the embroidery feel continuous.
- **Next**: recorded sounds (CC0 or public domain from Wikimedia Commons) can replace any generated layer,
  scene tags unchanged.

## 2026-10-14 — A phone layout, icon menus, and notes that open on their detail
- **Decision** (Paul: the phone version was unusable): one bar on top with the marks and icons only (text version,
  after 1066, about, sound, language, each with its name as tooltip and for screen readers); on phones the tour
  (previous, play, next, full tour or highlights) sits in a bar at the bottom within thumb reach, the zoom buttons go
  (pinch instead), the themes scroll sideways on one line, the embroidery takes under half the screen and the
  scene text comes before the notes. A one-time hint says how to use the embroidery. Clicking or tapping a frame
  scrolls down to its note, which opens on a picture of the framed detail, drawn in the browser from the same
  deep-zoom tiles; tapping the picture goes back to it on the embroidery. On phones the slideshow's dates scroll
  sideways and previous / next sit in a bottom bar.
- **Why**: fewer, clearer controls; the reader always sees what a note is about while reading it.
- **Rejected**: a hamburger menu (hides the few items there are); a second deep-zoom viewer for the detail (heavy).

## 2026-10-14 — Frames instead of numbered markers, a lighter top bar, quieter ambience
- **Decision** (Paul): each note is a thin frame in its lens colour around what it is about (its box, or a default
  frame around its old marker); the frames let the mouse through and the viewer opens the smallest frame under a
  click, so the embroidery still drags. Theme filters are multi-select: all on by default, one click turns a lens
  off, "All" clears everything (a clean tapestry) or brings everything back. The play button, the tour choice
  (full narration or highlights), speed and time move to the top bar, with the ambience as a note icon and the
  language as a flag; the scene menu and the controls row under the embroidery go (scenes stay in the text
  version and the reading below). The ambience keeps only the generated drone and drum (the chant was too much).
  Map clips play by themselves, muted, once, when they come into view, and stop on their last frame. Every
  afterlife slide has a visual: new clips for each journey (made, to Paris, the war, the fragment, London) and
  details cropped from our own tiles where no picture fits; the slideshow arrows stay in place.
- **Why**: numbered pins said nothing about what they pointed at; the space under the embroidery is the most
  valuable on the page; a play button on a map clip was one click too many.
- **Rejected**: clickable frames (they would block dragging); one combined travel map for all slides (each journey
  reads better on its own).

## 2026-10-14 — Hosting on Cloudflare Workers (static assets)
- **Decision** (Paul connected the repository to Cloudflare Workers Builds): `wrangler.jsonc` deploys `dist/` as
  static assets, with no Worker script. About 4,400 files and no file over 25 MB, within the platform's limits.
- **Why**: free static hosting with a global cache, no server code, nothing added to the browser.

## 2026-10-14 — Name and marks: "Hic", the shield and the knot
- **Decision** (Paul, after several rounds of sketches and references he made): the project is called *Hic*
  ("here", the first word of most captions).
  - Wordmark: "HIC" set in Uncial Antiqua (Astigmatic, SIL Open Font License 1.1), a revival of early medieval
    uncial script, converted to outlines (no web font). The font's capital H is an uncial h that read as "bIC", so
    the H is built from two of its I stems and a crossbar. On a paper panel between two bands repeating one regular
    unit of slanted stripes (green, ochre, terracotta, blue), after the borders' bars.
  - Main mark, in the header: a long Norman kite shield (as on the embroidery) over two crossed grey sewing needles held like swords, threaded
    through their eyes, the thread swooping gently into a small loop above the shield (from Paul's sketch).
  - Favicon: one strand braided round a ring (a torus-knot path: three turns, seven swings), over and under
    alternately, a green ribbon edged in ochre, drawn seamless (each upper pass is laid again over its crossing).
  - All drawn by `scripts/make_brand.py`; muted wool colours throughout.
- **Why**: the shield and needle say "war told in thread"; the interlace recurs throughout the embroidery; a real
  uncial typeface reads as medieval without hand-drawn wobble.
- **Rejected**: hand-drawn letters (uneven); a whole tree; separate interlocking circles (a chain, not one strand);
  looped rosettes (passes blur together); gaps at the crossings (looked broken); bright colours; tracing from the
  photography.

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

## 2026-10-14 — Views and tools apart in the top bar
- **Decision**: the three views (embroidery, text, after 1066) form one segmented pill with the current one filled;
  about, sound and language are round buttons after a thin rule.
- **Why**: views are places, the others are actions; Paul found them too alike side by side.

## 2026-10-14 — Plain letters in the header
- **Decision**: the header shows the shield and the plain "HIC" letters in one framed white box that interrupts the
  bar's stripes; the banded wordmark stays the standalone logo (thumbnails, documents).
- **Why**: stripes around the letters inside a striped bar looked repetitive.

## 2026-10-14 — Narration from per-scene clips
- **Decision**: `scripts/narration.py` joins one clip per scene into the narration track and writes the cues from
  the clip lengths; the cue editor stays for one continuous recording.
- **Why**: Paul will use a text-to-speech voice rather than record; per-scene clips are what those tools produce,
  and cues computed from them need no manual tapping. This revises "one continuous track" above.

## 2026-10-14 — Synthetic narration, academic register
- **Decision**: the narration is read by ElevenLabs voices chosen by Paul (Adam Stone in English, Aurore in French, later Nicolas;
  model eleven_multilingual_v2), generated scene by scene by `scripts/narration.py generate`. The scene scripts were
  rewritten in a plainer academic register (no rhetorical questions or dramatic turns; same facts and sources).
- **Why**: Paul prefers not to record; the earlier scripts read as too dramatic for a research-style reading.
- **Rejected**: free neural voices (Azure/Edge), which sounded less suited to the tone.
