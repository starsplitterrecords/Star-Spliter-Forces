// Browser playthrough of THE MOVEMENT (weekly dispatch). Usage: BASE_URL=... PAGE_PATH=/ node e2e/story.mjs
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
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
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
await page.getByText('Your people this week').waitFor();
assert(await page.locator('svg g[role=button]').count() >= 5, 'the map shows real towns to send people to');
assert(!(await page.getByRole('button', { name: /Call a meeting/ }).count()), 'no Call a meeting button');
await page.screenshot({ path: `${OUT}/w1-map.png` });
log('week one: the map, your people, real towns');

// the garage problem, on the map
await page.locator('section:has-text("Waiting for you") li button').first().click();
await page.getByText('is this the book club?').waitFor();
await page.getByRole('button', { name: /Sort of\. Bring the book/ }).click();
await page.getByText('the movement responds').waitFor();
await page.getByRole('button', { name: 'Back to the map' }).click();
log('answered Gary’s problem in the garage');

// send Priya to another town
await page.getByRole('button', { name: /Priya/ }).first().click();
await page.getByText('Tap a town to send Priya').waitFor();
await page.locator('svg g[role=button]').nth(2).locator('circle').first().click({ force: true });
await page.getByText(/Priya will spend next week in/).waitFor();
const where = (await page.getByText(/Priya will spend next week in/).innerText()).replace(/.*in (.*)\./, '$1');
log(`sent Priya to ${where}`);

// answer the rest, naming the movement in our own words if asked
for (let k = 0; k < 6; k++) {
  const items = page.locator('section:has-text("Waiting for you") li button');
  if (!(await items.count())) break;
  await items.first().click();
  const named = page.getByRole('button', { name: /own name|Something else|our own/i });
  if (await named.count()) {
    await named.first().click();
    await page.locator('#choice-input').fill('The Lentil Fellowship');
    await page.getByRole('button', { name: 'Decide' }).click();
  } else await page.locator('[role=dialog] .grid button').first().click();
  await page.getByRole('button', { name: 'Back to the map' }).click();
}

await page.getByRole('button', { name: /End the week/ }).click();
await page.getByRole('dialog', { name: 'Week 1' }).waitFor();
const report = await page.getByRole('dialog', { name: 'Week 1' }).innerText();
assert(report.includes(`Priya spent the week in ${where}`), 'the week report says where Priya went');
await page.screenshot({ path: `${OUT}/w1-report.png` });
await page.getByRole('button', { name: 'To the map' }).click();
assert((await page.locator('header').innerText()).includes('week 2'), 'it is week 2');
log('ended the week; report shows the dispatch');

// play a few more weeks quickly
for (let w = 0; w < 4; w++) {
  for (let k = 0; k < 8; k++) {
    const items = page.locator('section:has-text("Waiting for you") li button');
    if (!(await items.count())) break;
    await items.first().click();
    await page.locator('[role=dialog] .grid button').first().click();
    const input = page.locator('#choice-input');
    if (await input.count()) await page.getByRole('button', { name: 'Decide' }).click();
    await page.getByRole('button', { name: 'Back to the map' }).click();
  }
  const end = page.getByRole('button', { name: /End the week/ });
  if (await end.isDisabled()) continue;
  await end.click();
  await page.getByRole('button', { name: 'To the map' }).click();
}
log('played five weeks');

// a town, then the sheets
await page.locator('svg g[role=button]').first().locator('circle').first().click({ force: true });
const townDialog = page.locator('[role=dialog]').first();
await townDialog.waitFor();
await page.keyboard.press('Escape');
await page.mouse.click(5, 5);
for (const [tab, text] of [['People', 'Martin'], ['Customs', 'Name'], ['History', 'Day']]) {
  await page.getByRole('navigation').getByRole('button', { name: tab }).click();
  await page.getByRole('dialog').getByText(text).first().waitFor();
  await page.getByRole('button', { name: 'Close' }).click();
}
log('town panel, people, customs and history');

// it persists
await page.waitForTimeout(800);
await page.reload();
await page.getByRole('button', { name: /Continue the Movement/ }).click();
await page.getByText('Your people this week').waitFor();
assert((await page.locator('header').innerText()).includes('week 6'), 'reload keeps the week');
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: `${OUT}/w6-mobile.png`, fullPage: true });
log('reload keeps the game; mobile layout');

assert(!errors.length, `page errors: ${errors.join(' | ')}`);
await browser.close();
log('STORY E2E PASSED');
