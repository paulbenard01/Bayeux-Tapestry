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
  await page.waitForTimeout(600);
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

await shot("desktop-fr-scene1", "?lang=fr", desktop);
await shot("desktop-en-comet", "?lang=en&scene=32", desktop);
await shot("desktop-fr-hotspot", "?lang=fr&scene=57", desktop, (p) => p.click(".hotspot"));
await shot("desktop-en-text", "?lang=en&view=text&scene=23", desktop);
await shot("desktop-fr-cues", "?lang=fr&tool=cues", desktop);
await shot("phone-fr-scene23", "?lang=fr&scene=23", phone);
await shot("phone-en-about", "?lang=en&scene=15", phone, (p) => p.getByRole("button", { name: "About" }).click());

// Keyboard: ] moves to the next scene, Space starts and stops the tour.
const page = await open("?lang=en&scene=10", desktop);
await page.focus(".viewport");
await page.keyboard.press("]");
await page.waitForTimeout(900);
const after = await page.evaluate(() => new URL(location.href).searchParams.get("scene"));
if (after !== "11") {
  failures += 1;
  console.error(`keyboard: expected scene 11 after ], got ${after}`);
}
await page.keyboard.press(" ");
await page.waitForTimeout(1500);
const playing = await page.locator(".play").textContent();
if (!playing?.includes("Pause")) {
  failures += 1;
  console.error(`keyboard: Space did not start the tour (${playing})`);
}
await page.close();

await browser.close();
if (failures) {
  console.error(`${failures} problem(s)`);
  process.exit(1);
}
console.log("keyboard smoke test passed");
