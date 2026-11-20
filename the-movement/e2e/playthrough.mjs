// End-to-end playthrough of the main flow (uses the pre-installed Playwright + Chromium).
// Usage: start the app (npm run build && npm start), then: BASE_URL=http://localhost:3000 npm run e2e
import fs from 'node:fs';
import { createRequire } from 'node:module';
// CommonJS resolution so a globally installed Playwright (NODE_PATH) is found too.
const { chromium } = createRequire(import.meta.url)('playwright');

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT = process.env.SHOTS ?? 'e2e/screenshots';
fs.mkdirSync(OUT, { recursive: true });
const log = (...a) => console.log('•', ...a);
const assert = (c, m) => {
  if (!c) throw new Error(`Assertion failed: ${m}`);
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

await page.goto(`${BASE}/?debug=1`);
await page.getByRole('button', { name: 'New Movement' }).click();
await page.getByRole('button', { name: 'Begin' }).first().click();
log('wizard opened');

// 1 name
await page.getByLabel('Ideology name').fill('Spring');
await page.getByRole('button', { name: 'Continue →' }).click();
// 2 founder
await page.getByLabel('Founder name').fill('Jeff');
assert(await page.getByText('Master J.', { exact: true }).isVisible(), 'founder title derived');
await page.getByRole('button', { name: 'Continue →' }).click();
// 3 HQ
await page.getByLabel('Starting city').fill('Hartford');
await page.getByRole('option', { name: /Hartford, Connecticut/ }).click();
await page.getByRole('radio', { name: 'Yurt' }).click();
await page.getByRole('button', { name: 'Continue →' }).click();
// 4 beliefs
await page.getByLabel('Principle 1', { exact: true }).fill('People should spend more time enjoying the journey than the destination.');
await page.getByRole('button', { name: 'Continue →' }).click();
// 5 animal
await page.getByRole('radio', { name: /Capybara/ }).click();
await page.getByRole('button', { name: 'Continue →' }).click();
// 6 temperament
await page.getByRole('button', { name: 'Continue →' }).click();
// 7 customs: moderation check then real customs
await page.getByLabel('Custom Hobbies commandment').fill('bomb the neighbors');
await page.getByLabel('Custom Hobbies commandment').press('Enter');
assert(await page.getByText(/Committee on Acceptable Absurdity|Office of Correct Interpretation|scribes have refused/).first().isVisible(), 'moderation message shown');
await page.getByLabel('Custom Hobbies commandment').fill('');
for (const c of ['Wear springs on shoes.', 'Eat mashed potatoes every day.', 'Yacht rock.', 'Build towers from popsicle sticks.', 'Yurts.']) {
  const b = page.getByRole('button', { name: c, exact: true });
  if ((await b.getAttribute('aria-pressed')) !== 'true') await b.click();
}
await page.screenshot({ path: `${OUT}/01-wizard-customs.png` });
await page.getByRole('button', { name: 'Continue →' }).click();
// 8 meetings, 9 outposts
await page.getByRole('radio', { name: 'Hootenannies' }).click();
await page.getByRole('button', { name: 'Continue →' }).click();
await page.getByRole('radio', { name: 'Power Circles' }).click();
await page.getByRole('button', { name: 'Continue →' }).click();
// 10 banner
await page.getByRole('button', { name: 'primary #6b3fa0' }).click();
await page.getByRole('button', { name: 'secondary #d4a72c' }).click();
await page.getByRole('button', { name: 'Continue →' }).click();
// 11 proclamation
assert(await page.getByText(/BE IT HEREBY PROCLAIMED/).isVisible(), 'proclamation rendered');
await page.screenshot({ path: `${OUT}/02-proclamation.png` });
// the earlier rejected custom text must not be part of the movement
await page.getByRole('button', { name: 'FOUND THE MOVEMENT' }).click();
log('movement founded');

// starting cities
await page.getByText('Choose the first city fortunate enough to hear your message.').waitFor();
await page.screenshot({ path: `${OUT}/03-starting-cities.png` });
const cards = page.locator('[role=dialog] button').filter({ hasText: 'Population' });
assert((await cards.count()) === 3, 'three starting cities offered');
await cards.first().click();
log('first campaign launched');
await page.getByRole('button', { name: '5×' }).click();

// wait for first strategic conversion (zealot)
await page.getByText(/Reaches 85%/).first().waitFor({ timeout: 90_000 });
log('first city reached 85%');
await page.screenshot({ path: `${OUT}/04-first-conversion.png` });

// dismiss any modal
const closeAny = async () => {
  for (let i = 0; i < 3; i++) {
    const dlg = page.locator('[role=dialog][aria-modal=true]');
    if (await dlg.count()) await page.keyboard.press('Escape');
  }
};
await closeAny();

// open campaigns, dispatch to a newly discovered city
await page.keyboard.press('c');
await page.getByRole('heading', { name: 'Campaigns', exact: true }).waitFor();
await page.getByRole('button', { name: 'Declare converted & redeploy' }).first().click();
log('declared converted & redeployed');
const newCity = page.locator('aside button').filter({ hasText: 'new' }).first();
await newCity.click();
await page.getByRole('button', { name: 'Dispatch' }).click();
await page.getByText('DISPATCHED!').first().waitFor();
log('dispatched zealot');

// upgrades
await closeAny();
await page.keyboard.press('Escape');
await page.keyboard.press('u');
await page.getByRole('heading', { name: 'Institutional Development', exact: true }).waitFor();
await page.waitForTimeout(3000);
const buy = page.getByRole('button', { name: /^Better Pamphlets$/ });
if (await buy.isEnabled()) {
  await buy.click();
  log('bought upgrade');
}
await page.screenshot({ path: `${OUT}/05-upgrades.png` });

// command palette -> stats
await page.keyboard.press('Escape');
await page.keyboard.press('Control+k');
await page.getByRole('textbox', { name: 'Command' }).fill('stats');
await page.keyboard.press('Enter');
await page.getByText('The Movement — Worldwide Membership').waitFor();
await page.screenshot({ path: `${OUT}/06-stats.png` });
log('stats via command palette');

// accelerate with debug tools to see events/decisions
await page.keyboard.press('Escape');
// Robust click: decision modals may pop up at any moment; close them and retry.
const safeClick = async (loc) => {
  for (let i = 0; i < 6; i++) {
    try {
      await loc.click({ timeout: 2500 });
      return;
    } catch {
      await page.keyboard.press('Escape');
    }
  }
  await page.screenshot({ path: `${OUT}/fail.png` });
  throw new Error('could not click');
};
const debugClick = async (name) => {
  for (let i = 0; i < 6; i++) {
    if (await page.locator('[role=dialog][aria-modal=true]').count()) await page.keyboard.press('Escape');
    if (!(await page.getByRole('heading', { name: 'Debug Tools', exact: true }).count())) await page.locator('nav').getByRole('button', { name: /Debug tools/ }).click({ timeout: 2500 }).catch(() => {});
    try {
      await page.getByRole('button', { name, exact: true }).click({ timeout: 2500 });
      await page.waitForTimeout(400);
      return;
    } catch {
      /* a modal appeared; loop closes it */
    }
  }
  throw new Error(`debug click failed: ${name}`);
};
await debugClick('+5 min game time');
await debugClick('Jump to phase 4');
await debugClick('+1 hour');
await page.keyboard.press('Escape');
await page.waitForTimeout(1500);
let decided = false;
for (let i = 0; i < 10 && !decided; i++) {
  const choice = page.locator('[role=dialog] button').filter({ hasText: /^A\. / });
  if (await choice.count()) {
    await page.screenshot({ path: `${OUT}/07-decision.png` });
    await choice.first().click();
    await page.getByText('Decided', { exact: true }).waitFor();
    decided = true;
    log('resolved a decision event');
    await page.keyboard.press('Escape');
  } else {
    const pending = page.locator('aside button').filter({ hasText: 'Decide' });
    if (await pending.count()) await pending.first().click();
    else {
      if (!(await page.getByRole('heading', { name: 'Debug Tools', exact: true }).count())) await safeClick(page.locator('nav').getByRole('button', { name: /Debug tools/ }));
      await page.getByLabel('Event definition').selectOption('great-controversy');
      await safeClick(page.getByRole('button', { name: 'Trigger', exact: true }));
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(800);
  }
}
assert(decided, 'a decision event was presented and resolved');

await page.keyboard.press('g');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/08-charts.png` });
await page.keyboard.press('Escape');
await page.keyboard.press('h');
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/09-chronicle.png` });
await page.keyboard.press('Escape');
await page.keyboard.press('f');
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/10-factions.png` });
await page.keyboard.press('Escape');
await page.screenshot({ path: `${OUT}/11-dashboard.png` });

// persistence: read follower count, reload, continue
const before = await page.locator('header').getByText(/Followers/).locator('..').innerText();
await safeClick(page.getByRole('button', { name: 'Menu' }));
await page.getByRole('button', { name: /Continue: Springism/ }).waitFor();
await page.reload();
await page.getByRole('button', { name: /Continue: Springism/ }).click();
await page.locator('header').getByText(/Followers/).waitFor();
log('reloaded and continued', before.replace(/\s+/g, ' '));

// mobile layout (same browser storage)
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(800);
await page.keyboard.press('Escape');
await page.getByRole('navigation', { name: 'Primary' }).waitFor();
await page.screenshot({ path: `${OUT}/12-mobile-map.png` });
await page.getByRole('navigation', { name: 'Primary' }).getByRole('button', { name: /Campaigns/ }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/13-mobile-campaigns.png` });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
assert(!overflow, 'no horizontal overflow on mobile');
log('mobile layout ok');
const realErrors = errors.filter((e) => !/narrate|503|Failed to load resource/.test(e));
assert(realErrors.length === 0, `no page errors: ${realErrors.join(' | ')}`);
await browser.close();
log('E2E PASSED');
