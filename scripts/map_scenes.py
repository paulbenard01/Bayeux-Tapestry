"""Writes the Map-clip-render scene files for the map clips, in French and English (maps/<id>.<lang>.json).

Render them with Map-clip-render (https://github.com/paulbenard01/Map-clip-render):
  node render.js --scene ../bayeux-tapestry/maps/<id>.<lang>.json --width 1280 \
      --out ../bayeux-tapestry/public/media/maps/<id>.<lang>.mp4
Coordinates are [longitude, latitude]. Dates and places follow the notes' sources; uncertain places are
labelled as such.
"""

import json
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "maps"

P = {
    "bosham": [-0.859, 50.828],
    "ponthieu": [1.65, 50.2],
    "beaurain": [1.896, 50.424],
    "eu": [1.4205, 50.0465],
    "rouen": [1.0993, 49.4431],
    "msm": [-1.5115, 48.6361],
    "dol": [-1.7547, 48.5497],
    "rennes": [-1.6778, 48.1173],
    "dinan": [-2.0475, 48.4555],
    "bayeux": [-0.702, 49.2765],
    "norway": [5.0, 60.9],
    "orkney": [-2.96, 58.98],
    "riccall": [-1.06, 53.83],
    "stamford": [-0.913, 53.99],
    "london": [-0.1276, 51.5072],
    "dives": [-0.101, 49.2869],
    "valery": [1.634, 50.184],
    "pevensey": [0.334, 50.819],
    "hastings": [0.573, 50.8543],
    "battle": [0.4847, 50.9157],
    "paris": [2.3376, 48.8606],
    "sourches": [0.07, 48.14],
    "bm": [-0.127, 51.5194],
    "canterbury": [1.0789, 51.2802],
    "schleswig": [9.5653, 54.5153],
}

RED, BLUE, GOLD = "#9b2d20", "#2f4a6d", "#8a6510"


def pin(key, label, at, until=None):
    return {"id": key, "center": P[key], "at": at, "until": until, "label": label, "style": "badge", "size": 90}


def route(a, b, start, draw, label=None, color=None, curve="arc", dashed=False, via=None):
    r = {"from": P[a], "to": P[b], "startAt": start, "drawDuration": draw, "until": None, "width": 4,
         "curve": curve, "bulge": 0.12, "arrowEnd": True, "dashed": dashed}
    if label:
        r["label"] = label
    if color:
        r["color"] = color
    if via:
        r["via"] = via
    return r


def scene(duration, camera, pins, routes, title):
    return {"schemaVersion": 2, "aspect": "16:9", "style": "bayeux-linen", "fps": 30, "duration": duration,
            "camera": camera, "pins": pins, "routes": routes,
            "titles": [{"text": title, "position": "bottom-left", "at": 0.3, "until": None}]}


def harold_1064(fr):
    return scene(
        19,
        [{"t": 0, "center": [0.45, 50.05], "zoom": 5.9}, {"t": 15, "center": [0.6, 49.95], "zoom": 6.1, "transition": "smooth"}],
        [pin("bosham", "Bosham", 0.6),
         pin("ponthieu", "Ponthieu (lieu incertain)" if fr else "Ponthieu (place uncertain)", 4.2),
         pin("beaurain", "Beaurain", 7.4), pin("eu", "Eu", 10.6), pin("rouen", "Rouen", 13.8)],
        [route("bosham", "ponthieu", 1.6, 2.6, "1064 ?", RED, dashed=True),
         route("ponthieu", "beaurain", 5.0, 2.0, color=RED),
         route("beaurain", "eu", 8.2, 2.0, color=RED),
         route("eu", "rouen", 11.4, 2.2, color=RED)],
        "Le voyage d'Harold, 1064-1065" if fr else "Harold's journey, 1064-1065",
    )


def brittany(fr):
    return scene(
        19,
        [{"t": 0, "center": [-1.65, 48.45], "zoom": 7.6}, {"t": 15, "center": [-1.25, 48.7], "zoom": 7.0, "transition": "smooth"}],
        [pin("msm", "Mont-Saint-Michel", 0.6), pin("dol", "Dol", 3.4), pin("rennes", "Rennes", 6.2),
         pin("dinan", "Dinan", 9.2), pin("bayeux", "Bayeux", 13.2)],
        [route("msm", "dol", 1.4, 1.8, color=BLUE),
         route("dol", "rennes", 4.4, 1.8, "Conan s'enfuit" if fr else "Conan flees", RED, dashed=True),
         route("dol", "dinan", 7.4, 1.8, color=BLUE),
         route("dinan", "bayeux", 10.4, 2.8, color=BLUE)],
        "La campagne de Bretagne" if fr else "The Breton campaign",
    )


def two_invasions(fr):
    return scene(
        24,
        [{"t": 0, "center": [1.0, 57.0], "zoom": 4.9},
         {"t": 13, "center": [0.3, 53.2], "zoom": 5.4, "transition": "smooth"},
         {"t": 20, "center": [0.3, 52.5], "zoom": 5.5, "transition": "smooth"}],
        [pin("norway", "Norvège" if fr else "Norway", 0.5), pin("riccall", "Riccall", 3.6),
         pin("stamford", "Stamford Bridge, 25/09" if fr else "Stamford Bridge, 25 Sep", 7.6),
         pin("valery", "Saint-Valery", 10.6), pin("pevensey", "Pevensey, 28/09" if fr else "Pevensey, 28 Sep", 12.6),
         pin("london", "Londres" if fr else "London", 14.6), pin("battle", "Hastings, 14/10" if fr else "Hastings, 14 Oct", 19.0)],
        [route("norway", "orkney", 1.0, 1.4, color=GOLD),
         route("orkney", "riccall", 2.4, 1.6, "Harald Hardrada", GOLD),
         route("london", "stamford", 5.4, 2.0, "Harold", RED),
         route("valery", "pevensey", 10.8, 1.8, "Guillaume" if fr else "William", BLUE),
         route("stamford", "london", 14.8, 2.0, color=RED, curve="straight"),
         route("london", "battle", 17.2, 1.8, color=RED, curve="straight")],
        "Deux invasions, septembre-octobre 1066" if fr else "Two invasions, September-October 1066",
    )


def crossing(fr):
    return scene(
        19,
        [{"t": 0, "center": [0.75, 49.9], "zoom": 6.6}, {"t": 15, "center": [0.75, 50.15], "zoom": 6.8, "transition": "smooth"}],
        [pin("dives", "Dives-sur-Mer, août" if fr else "Dives-sur-Mer, August", 0.6),
         pin("valery", "Saint-Valery-sur-Somme", 4.0),
         pin("pevensey", "Pevensey, 28/09" if fr else "Pevensey, 28 Sep", 8.6),
         pin("hastings", "Hastings", 11.6), pin("battle", "Battle, 14/10" if fr else "Battle, 14 Oct", 14.0)],
        [route("dives", "valery", 1.6, 2.2, color=BLUE, via=[0.7, 49.95]),
         route("valery", "pevensey", 5.0, 3.0, "Nuit du 27 au 28/09" if fr else "Night of 27-28 Sep", BLUE),
         route("pevensey", "hastings", 9.6, 1.6, color=BLUE, curve="straight"),
         route("hastings", "battle", 12.4, 1.4, color=RED, curve="straight")],
        "La traversée de Guillaume, 1066" if fr else "William's crossing, 1066",
    )


def made(fr):
    return scene(
        14,
        [{"t": 0, "center": [0.2, 50.3], "zoom": 6.4}, {"t": 10, "center": [0.1, 50.1], "zoom": 6.6, "transition": "smooth"}],
        [pin("canterbury", "Cantorbéry ? (hypothèse)" if fr else "Canterbury? (likely)", 0.6),
         pin("bayeux", "Bayeux", 5.0)],
        [route("canterbury", "bayeux", 2.0, 3.0, "années 1070 ?" if fr else "1070s?", GOLD, dashed=True)],
        "Brodée en Angleterre, pour Bayeux ?" if fr else "Made in England, for Bayeux?",
    )


def to_paris(fr):
    return scene(
        14,
        [{"t": 0, "center": [0.85, 49.1], "zoom": 6.7}, {"t": 10, "center": [0.85, 49.05], "zoom": 6.8, "transition": "smooth"}],
        [pin("bayeux", "Bayeux", 0.5), pin("paris", "Paris, Louvre" if fr else "Paris, the Louvre", 3.2)],
        [route("bayeux", "paris", 1.4, 2.2, "1803", GOLD),
         route("paris", "bayeux", 6.0, 2.2, "1804", GOLD)],
        "À Paris pour Bonaparte, 1803-1804" if fr else "To Paris for Bonaparte, 1803-1804",
    )


def war(fr):
    return scene(
        17,
        [{"t": 0, "center": [0.6, 48.7], "zoom": 6.7}, {"t": 13, "center": [0.75, 48.75], "zoom": 6.6, "transition": "smooth"}],
        [pin("bayeux", "Bayeux", 0.5), pin("sourches", "Sourches", 3.0), pin("paris", "Paris, Louvre" if fr else "Paris, the Louvre", 6.4)],
        [route("bayeux", "sourches", 1.4, 1.8, "1941", RED),
         route("sourches", "paris", 4.6, 1.8, "1944", RED),
         route("paris", "bayeux", 8.6, 2.0, "1945", BLUE)],
        "La broderie dans la guerre, 1939-1945" if fr else "The embroidery at war, 1939-1945",
    )


def fragment(fr):
    return scene(
        14,
        [{"t": 0, "center": [4.6, 52.0], "zoom": 5.0}, {"t": 10, "center": [4.2, 51.8], "zoom": 5.1, "transition": "smooth"}],
        [pin("schleswig", "Schleswig, archives" if fr else "Schleswig, State Archives", 0.6), pin("bayeux", "Bayeux", 5.4)],
        [route("schleswig", "bayeux", 2.0, 3.2, "retour prévu" if fr else "due back", BLUE, dashed=True)],
        "Un fragment retrouvé, 2025" if fr else "A fragment found, 2025",
    )


def london(fr):
    return scene(
        14,
        [{"t": 0, "center": [-0.4, 50.4], "zoom": 6.5}, {"t": 10, "center": [-0.4, 50.45], "zoom": 6.6, "transition": "smooth"}],
        [pin("bayeux", "Bayeux", 0.5), pin("bm", "Londres, British Museum" if fr else "London, British Museum", 3.4)],
        [route("bayeux", "bm", 1.4, 2.4, "2026", BLUE),
         route("bm", "bayeux", 6.4, 2.4, "2027", BLUE, dashed=True)],
        "Au British Museum, 2026-2027" if fr else "At the British Museum, 2026-2027",
    )


CLIPS = {"harold-1064": harold_1064, "brittany": brittany, "two-invasions": two_invasions,
         "crossing": crossing, "made": made, "to-paris": to_paris, "war": war,
         "fragment": fragment, "london": london}

if __name__ == "__main__":
    OUT.mkdir(exist_ok=True)
    for name, build in CLIPS.items():
        for lang in ("fr", "en"):
            (OUT / f"{name}.{lang}.json").write_text(json.dumps(build(lang == "fr"), ensure_ascii=False, indent=2) + "\n")
    print(sorted(p.name for p in OUT.glob("*.json")))
