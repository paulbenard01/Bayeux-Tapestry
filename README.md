# The Bayeux Tapestry, scene by scene / La Tapisserie de Bayeux, scène par scène

**EN** — A bilingual (French/English) web app to read the Bayeux Tapestry from left to right: scroll the whole
embroidery, follow a narrated tour that scrolls for you, and open sourced notes on key scenes (Harold's oath,
Halley's comet, the "arrow in the eye"). Made by Paul Benard for the Tapestry's loan to the British Museum
(10 September 2026 – 11 July 2027). Independent and non-commercial: no ads, cookies or tracking.

- 58 scenes with their Latin captions, translations and a narration script in French and English.
- Guided tour: plays a recorded narration (one track per language, timed with cues), or scrolls at reading
  speed with captions until the recordings exist.
- Story cards pop up as details scroll past; hotspots open longer notes with their sources.
- Text version of every scene, keyboard navigation (arrows, `[` `]`, Space), reduced-motion support.
- Image: public-domain panorama from Wikimedia Commons. The museum's official high-resolution images are not
  used without permission; the About panel links to the official panorama.

```sh
npm ci && npm run dev        # http://localhost:5173/?lang=en
npm test && npm run build
```

Tools: `?tool=cues` (time a recording against the scenes), `?tool=calibrate` (place scene edges on the image).
See `CLAUDE.md` for the rules and `PLAN.md` for what comes next.

---

**FR** — Une application web bilingue (français/anglais) pour lire la Tapisserie de Bayeux de gauche à droite :
faire défiler toute la broderie, suivre une visite commentée qui défile toute seule, et ouvrir des notes
sourcées sur les scènes clés (le serment d'Harold, la comète de Halley, la « flèche dans l'œil »). Conçue par
Paul Benard à l'occasion du prêt de la Tapisserie au British Museum (10 septembre 2026 – 11 juillet 2027).
Projet indépendant et non commercial : ni publicité, ni cookies, ni suivi.

- Les 58 scènes avec leurs légendes latines, une traduction et un texte de narration en français et en anglais.
- Visite guidée : narration enregistrée (une piste par langue, synchronisée par des repères), ou défilement à
  la vitesse de lecture avec sous-titres tant que les enregistrements n'existent pas.
- Des encadrés apparaissent au fil du défilement ; des zones cliquables ouvrent des notes détaillées et sourcées.
- Version texte de toutes les scènes, navigation au clavier, respect du réglage « réduire les animations ».
- Image : panorama du domaine public (Wikimedia Commons). Les images officielles du musée ne sont pas utilisées
  sans autorisation ; le panneau « À propos » renvoie vers la représentation numérique officielle.

Code: MIT. Texts and narration: © Paul Benard (licence to be decided).
