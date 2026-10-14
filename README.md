# Hic — The Bayeux Tapestry, scene by scene / La Tapisserie de Bayeux, scène par scène

**EN** — A bilingual (French/English) web app to read the Bayeux Tapestry from left to right: scroll the whole
embroidery, follow a narrated tour that scrolls for you, and open sourced notes on key scenes (Harold's oath,
Halley's comet, the "arrow in the eye"). Made by Paul Benard for the Tapestry's loan to the British Museum
(10 September 2026 – 11 July 2027). Independent and non-commercial: no ads, cookies or tracking.

- 58 scenes with their Latin captions, translations and a narration script in French and English.
- Guided tour: plays a recorded narration (one track per language, timed with cues), or scrolls at reading
  speed with captions until the recordings exist. A shorter highlights tour stops on 15 key moments
  (`?tour=highlights`).
- Click any word of a Latin caption for its meaning and grammar.
- Story cards pop up as details scroll past; hotspots open longer notes with their sources.
- Deep zoom: drag, pinch, wheel or `+`/`−` to look at single stitches (up to 3,000 px high).
- About 60 notes in seven lenses (history, material & technique, art & narrative, society & daily life, animals &
  nature, Latin & inscriptions, afterlife),
  shown under the embroidery with pictures from Wikimedia Commons and animated maps; main events marked under the
  mini-map; an afterlife slideshow from the 1070s to the 2026 loan; optional ambient sound (public-domain chant).
- Text version of every scene, keyboard navigation (arrows, `[` `]`, Space), reduced-motion support.
- Image: the 2017 high-resolution photography of the Tapestry (Université de Caen Normandie, CNRS, ENSICAEN,
  after La Fabrique de patrimoines en Normandie), public domain on Wikimedia Commons; `?image=commons` shows
  an older scan. The About panel links to the museum's official panorama.

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
  la vitesse de lecture avec sous-titres tant que les enregistrements n'existent pas. Une visite plus courte
  s'arrête sur 15 temps forts (`?tour=highlights`).
- Un clic sur un mot d'une légende latine en donne le sens et la grammaire.
- Des encadrés apparaissent au fil du défilement ; des zones cliquables ouvrent des notes détaillées et sourcées.
- Zoom profond : glisser, pincer, molette ou `+`/`−` pour voir les points un par un (jusqu'à 3 000 px de haut).
- Une soixantaine de notes selon sept regards (histoire, matière et technique, art et récit, société et vie
  quotidienne, animaux et nature, latin et inscriptions, postérité), affichées sous la broderie avec des images de Wikimedia Commons et des cartes animées ;
  grands moments repérés sous la mini-carte ; diaporama de la postérité, des années 1070 au prêt de 2026 ; ambiance
  sonore facultative (chant du domaine public).
- Version texte de toutes les scènes, navigation au clavier, respect du réglage « réduire les animations ».
- Image : la campagne photographique haute définition de 2017 (Université de Caen Normandie, CNRS, ENSICAEN,
  d'après La Fabrique de patrimoines en Normandie), dans le domaine public sur Wikimedia Commons ;
  `?image=commons` affiche une numérisation plus ancienne. Le panneau « À propos » renvoie vers la
  représentation numérique officielle du musée.

Code: MIT. Texts and narration: © Paul Benard (licence to be decided).
