// Browser playthrough of THE MOVEMENT v2. Usage: BASE_URL=... PAGE_PATH=/ node e2e/story.mjs
import fs from 'node:fs';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const PAGE = process.env.PAGE_PATH ?? '/';
const OUT = process.env.SHOTS ?? 'e2e/screenshots';
fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log('•', ...a);
const assert = (c, m) => { if (!c) throw new Error(`Assertion failed: ${m}`); };

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.emulateMedia({ reducedMotion: 'reduce' });

await page.goto(`${BASE}${PAGE}`);
await page.getByRole('button', { name: /Begin the Movement/ }).click();
await page.getByLabel('What is your name?').fill('Jeff');
await page.getByLabel('Your hometown (optional)').fill('Hartf');
await page.getByRole('option', { name: /Hartford, United States/ }).click();
await page.getByRole('button', { name: 'Open the garage' }).click();
await page.getByText('is this the book club?').waitFor();
await page.screenshot({ path: `${OUT}/s1-gary.png` });
log('opening card from Gary');

await page.getByRole('button', { name: /Sort of\. Bring the book/ }).click();
await page.getByText('The movement responds').waitFor();
await page.screenshot({ path: `${OUT}/s2-response.png` });
log('reaction shown');
await page.getByRole('button', { name: /Next|Call a meeting/ }).click();
await page.getByText('four of them thought it was a book club').waitFor();
await page.getByRole('button', { name: /Every Tuesday/ }).hover();
await page.screenshot({ path: `${OUT}/s3-martin.png` });
await page.getByRole('button', { name: /Every Tuesday/ }).click();
await page.getByText(/Martin approves|Martin is delighted/).waitFor();
log('Martin’s meeting decision; Martin approves');

// keep deciding until the naming card, then name it ourselves
let named = false;
for (let i = 0; i < 80 && !named; i++) {
  const next = page.getByRole('button', { name: /^Next|^Call a meeting/ });
  if (await next.count()) { await next.first().click(); continue; }
  if (await page.getByRole('button', { name: /I have a better name/ }).count()) {
    await page.getByRole('button', { name: /I have a better name/ }).click();
    await page.getByLabel('Your words').fill('The Lentil Fellowship');
    await page.screenshot({ path: `${OUT}/s4-naming.png` });
    await page.getByRole('button', { name: 'Decide' }).click();
    named = true;
    break;
  }
  const choices = page.locator('main button.rounded-xl');
  await choices.nth(i % 2).click();
}
assert(named, 'the movement was named by the player');
await page.getByText('The Lentil Fellowship').first().waitFor();
log('named in the player’s own words');

for (const [label, heading] of [['People', 'The membership'], ['Customs', 'Central belief'], ['Map', 'organizer'], ['History', 'Your recent decisions']]) {
  await page.getByRole('navigation', { name: 'Movement' }).getByRole('button', { name: new RegExp(label) }).click();
  await page.getByText(heading).first().waitFor();
  await page.screenshot({ path: `${OUT}/s5-${label.toLowerCase()}.png` });
  await page.getByRole('button', { name: 'Close' }).click();
}
log('people, customs, map and history sheets');

// persistence + return report: move the save's clock back two days
await page.waitForTimeout(1200);
await page.evaluate(async () => {
  const req = indexedDB.open('the-movement-story');
  const db = await new Promise((r) => (req.onsuccess = () => r(req.result)));
  const tx = db.transaction('saves', 'readwrite');
  const st = tx.objectStore('saves');
  const g = await new Promise((r) => { const q = st.get('current'); q.onsuccess = () => r(q.result); });
  const obj = JSON.parse(g);
  obj.state.lastRealTime -= 2 * 24 * 3600 * 1000;
  st.put(JSON.stringify(obj), 'current');
  await new Promise((r) => (tx.oncomplete = r));
});
await page.reload();
await page.getByRole('button', { name: /Continue the Movement/ }).click();
await page.getByText('While You Were Away').waitFor();
await page.screenshot({ path: `${OUT}/s6-away.png` });
await page.getByRole('button', { name: 'Back to work' }).click();
log('return report after time away');

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/s7-mobile.png` });
assert(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), 'no horizontal overflow on mobile');
assert(errors.length === 0, `no page errors: ${errors.join(' | ')}`);
await browser.close();
log('STORY E2E PASSED');
