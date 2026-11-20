// End-to-end check of the Card Edition. Usage: BASE_URL=http://localhost:3000 node e2e/cards.mjs
import fs from 'node:fs';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const PAGE = process.env.PAGE_PATH ?? '/';
const OUT = process.env.SHOTS ?? 'e2e/screenshots';
fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log('•', ...a);
const assert = (c, m) => {
  if (!c) throw new Error(`Assertion failed: ${m}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.emulateMedia({ reducedMotion: 'reduce' });

await page.goto(`${BASE}${PAGE}`);
await page.getByRole('button', { name: /Card Edition/ }).click();
await page.getByLabel('What is your name?').fill('Jeff');
await page.getByRole('button', { name: 'Have an idea' }).click();
await page.getByText('It comes to you in the bath').waitFor();
await page.screenshot({ path: `${OUT}/c1-first-card.png` });
log('first card shown');

// the choice previews which meters move
await page.getByRole('button', { name: /^Swipe right/ }).hover();
await page.screenshot({ path: `${OUT}/c2-preview.png` });
await page.getByRole('button', { name: /^Swipe right/ }).click();
await page.getByText(/what she is supposed to call you/).waitFor();
log('idea chosen; title card follows');

// drag-swipe the next card
const card = page.locator('div.touch-none').first();
const box = await card.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.mouse.move(box.x + box.width / 2 - 160, box.y + box.height / 2, { steps: 8 });
await page.mouse.up();
await page.getByText(/headquarters/).first().waitFor();
log('drag swipe works');

// keyboard through the rest of the founding
for (let i = 0; i < 6; i++) {
  await page.keyboard.press(i % 2 ? 'ArrowLeft' : 'ArrowRight');
  await page.waitForTimeout(60);
}
const footer = await page.locator('footer').innerText();
assert(/ism/.test(footer), `movement is founded and named: ${footer}`);
log('founded:', footer.split('\n')[0]);

// play until a leader falls: always pick the side that moves meters the most
let ended = false;
for (let i = 0; i < 400 && !ended; i++) {
  if (await page.getByRole('button', { name: 'Appoint a successor' }).count()) {
    ended = true;
    break;
  }
  await page.keyboard.press(i % 3 === 0 ? 'ArrowLeft' : 'ArrowRight');
  await page.waitForTimeout(20);
}
assert(ended, 'a leader eventually falls');
await page.screenshot({ path: `${OUT}/c3-ending.png` });
log('leader ending:', (await page.locator('h2').first().innerText()).trim());
await page.getByRole('button', { name: 'Appoint a successor' }).click();
await page.getByText(/has been chosen as the new leader|How shall we honor/).waitFor();
log('successor appointed');

for (const [btn, text] of [['Map', 'The Known World'], ['Beliefs', 'Beliefs of'], ['History', 'The Official History']]) {
  await page.getByRole('button', { name: btn, exact: true }).click();
  await page.getByText(text).first().waitFor();
  await page.screenshot({ path: `${OUT}/c4-${btn.toLowerCase()}.png` });
  await page.getByRole('button', { name: 'Close' }).click();
}
log('map, beliefs and history sheets open');

// persistence
const before = await page.locator('footer').innerText();
await page.reload();
await page.getByRole('button', { name: /Continue: Card Edition/ }).click();
await page.locator('footer').waitFor();
const after = await page.locator('footer').innerText();
assert(before.split('\n')[0] === after.split('\n')[0], 'game restored after reload');
log('restored after reload');

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/c5-mobile.png` });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
assert(!overflow, 'no horizontal overflow on mobile');

assert(errors.length === 0, `no page errors: ${errors.join(' | ')}`);
await browser.close();
log('CARDS E2E PASSED');
