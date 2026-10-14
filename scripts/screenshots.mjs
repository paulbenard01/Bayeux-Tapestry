// Screenshots (desktop + 390 px phone) and a keyboard smoke test.
// Usage: npm run build && npm run preview  (other terminal)  then  npm run screenshots
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE_URL ?? "http://localhost:4173/";
const OUT = new URL("../docs/screenshots/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

// Behind an HTTPS-only egress proxy, proxy https:// only so the local preview is reached directly.
const proxyArgs = process.env.HTTPS_PROXY ? [`--proxy-server=https=${new URL(process.env.HTTPS_PROXY).host}`] : [];
const browser = await chromium.launch({ args: proxyArgs });
let failures = 0;

async function open(query, viewport) {
  const page = await browser.newPage({ viewport });
  page.on("pageerror", (e) => {
    failures += 1;
    console.error(`[${query}] page error:`, e.message);
  });
  await page.goto(`${BASE}${query}`, { waitUntil: "load" });
  await page.waitForSelector(".topbar");
  // Let the deep-zoom tiles load.
  await page.waitForTimeout(2500);
  return page;
}

async function shot(name, query, viewport, before) {
  const page = await open(query, viewport);
  if (before) await before(page);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}${name}.png` });
  console.log("saved", name);
  await page.close();
}

const desktop = { width: 1440, height: 900 };
const phone = { width: 390, height: 844 };

// Frames let the mouse through; a click inside one opens its note.
async function clickFrame(page, id) {
  const box = await page.locator(`.note-frame[data-note=${id}]`).boundingBox();
  if (!box) throw new Error(`no frame for ${id}`);
  await page.mouse.click(box.x + box.width / 2, box.y + Math.min(box.height / 2, 60));
}
const clickNote = (id) => (p) => clickFrame(p, id);
await shot("desktop-fr-scene1", "?lang=fr", desktop);
await shot("desktop-en-comet", "?lang=en&scene=32", desktop);
await shot("desktop-fr-arrow-note", "?lang=fr&scene=57", { width: 1440, height: 1300 }, clickNote("harold-death"));
await shot("desktop-en-map-note", "?lang=en&scene=5", { width: 1440, height: 1300 }, clickNote("harold-journey-map"));
await shot("desktop-en-zoomed", "?lang=en&scene=23", desktop, async (p) => {
  for (let i = 0; i < 3; i++) await p.getByRole("button", { name: "Zoom in" }).click();
  await p.waitForTimeout(1500);
});
await shot("desktop-en-lens-material", "?lang=en&scene=38&lens=material", desktop);
await shot("desktop-en-lens-latin", "?lang=en&scene=22&lens=latin", { width: 1440, height: 1100 }, (p) =>
  p.locator(".scene-info .word", { hasText: "BAGIAS" }).click(),
);
await shot("desktop-fr-lens-nature", "?lang=fr&scene=39&lens=nature", desktop);
await shot("desktop-en-highlights", "?lang=en&tour=highlights&scene=17", { width: 1440, height: 1100 });
await shot("desktop-en-afterlife", "?lang=en&view=afterlife#5", desktop);
await shot("desktop-en-text", "?lang=en&view=text&scene=23", desktop);
await shot("desktop-fr-cues", "?lang=fr&tool=cues", desktop);
await shot("phone-fr-scene23", "?lang=fr&scene=23", phone);
await shot("phone-en-afterlife", "?lang=en&view=afterlife#9", phone);
await shot("phone-en-about", "?lang=en&scene=15", phone, (p) => p.getByRole("button", { name: "About", exact: true }).click());

// Keyboard: ] moves to the next scene, Space starts and stops the tour.
const page = await open("?lang=en&scene=10", desktop);
await page.waitForTimeout(1500);
await page.keyboard.press("]");
await page.waitForTimeout(900);
const after = await page.evaluate(() => new URL(location.href).searchParams.get("scene"));
if (after !== "11") {
  failures += 1;
  console.error(`keyboard: expected scene 11 after ], got ${after}`);
}
await page.keyboard.press(" ");
await page.waitForTimeout(1500);
const playing = await page.locator(".play").getAttribute("aria-label");
if (!playing?.includes("Pause")) {
  failures += 1;
  console.error(`keyboard: Space did not start the tour (${playing})`);
}
await page.keyboard.press(" ");
// The ambient sound starts and stops without errors.
await page.locator(".ambient").click();
await page.waitForTimeout(800);
if ((await page.locator(".ambient").getAttribute("aria-pressed")) !== "true") {
  failures += 1;
  console.error("ambient: the button did not switch on");
}
await page.locator(".ambient").click();
// Escape closes an open note.
await clickFrame(page, "backwards");
await page.waitForTimeout(300);
if (!(await page.locator(".note-detail").count())) {
  failures += 1;
  console.error("frames: clicking inside a frame did not open its note");
}
await page.keyboard.press("Escape");
if (await page.locator(".note-detail").count()) {
  failures += 1;
  console.error("keyboard: Escape did not close the note");
}
await page.close();

// Highlights tour: ] moves to the next moment, and a caption word shows its translation.
const tour = await open("?lang=en&tour=highlights", desktop);
await tour.waitForTimeout(1500);
await tour.keyboard.press("]");
await tour.waitForTimeout(900);
const kicker = await tour.locator(".scene-info .scene-kicker").textContent();
if (!kicker?.startsWith("Highlight 2 / 15")) {
  failures += 1;
  console.error(`highlights: expected moment 2 after ], got ${kicker}`);
}
await tour.locator(".scene-info .word").first().click();
const gloss = await tour.locator(".scene-info .word-gloss").textContent();
if (!gloss?.includes("here")) {
  failures += 1;
  console.error(`latin: clicking HIC did not show its gloss (${gloss})`);
}
await tour.close();

await browser.close();
if (failures) {
  console.error(`${failures} problem(s)`);
  process.exit(1);
}
console.log("keyboard smoke test passed");
