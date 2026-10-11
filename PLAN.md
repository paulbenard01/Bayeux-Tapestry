# PLAN

Milestones. Tick a box only when its "done when" criterion is met and CI is green.

- [x] **M0 scaffold**: Vite + TypeScript, YAML content, tests, CI, CLAUDE.md, decisions log. Done when `npm test` and `npm run build` pass.
- [ ] **M1 basic version**
  - [x] scroller (drag, wheel, keys, prev/next), mini-map, jump menu, URL state, FR/EN, text view
  - [x] 58 scenes with tituli, translations and a draft narration script (FR/EN), each with sources
  - [x] reading-speed tour, cue editor (`?tool=cues`), calibration tool (`?tool=calibrate`)
  - [x] 13 story pop-ups, 3 sourced hotspots (oath, comet, Harold's death), bibliography, credits
  - [x] Commons panorama tiled (Image tiles workflow) and scene starts calibrated on it; story and hotspot positions adjusted
  - Done when the strip shows the real image with all 58 scenes placed, and screenshots are reviewed.
- [ ] **M2 Paul's review**: every `check:` note resolved, sources confirmed (`status: checked`), texts flipped to `reviewed`.
- [ ] **M3 narration**: FR and EN tracks recorded, cues exported, audio tour tested on phone and desktop.
- [ ] **M4 more depth**: 5-7 more hotspots (Ælfgyva, Edward's deathbed, the fleet, Odo, the borders and fables, the lost ending); a glossary (titulus, hauberk, motte, nasal helmet, laid-and-couched work).
- [ ] **M5 resources**: timeline 1051-1066; map of the places (Bosham, Beaurain, Mont-Saint-Michel, Dol, Rennes, Dinan, Bayeux, Westminster, Pevensey, Hastings/Battle); characters; "myths and debates"; one-hour lesson plans (primaire/KS2, collège/KS3, lycée/A level, university); how to visit (Bayeux, British Museum, Reading replica).
- [ ] **M6 better images**: if the museum agrees, a `layers/bayeux-official.yaml` layer with its credit line; otherwise a sharper public-domain source. Zoom for detail.
- [ ] **M7 launch**: hosting (Netlify while private), social preview, portfolio write-up.
