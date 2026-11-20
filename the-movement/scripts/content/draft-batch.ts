// DEVELOPMENT-TIME ONLY. Drafts a batch of cards with Claude for editorial review.
// The shipped game never calls this; drafts land in content/drafts/ and must be reviewed,
// edited and moved into src/story/content/ by a person before they ship.
//
// Usage:
//   ANTHROPIC_API_KEY=... npx tsx scripts/content/draft-batch.ts --era grassroots --count 12 \
//     --brief "Rolf's commercialisation arc meets Agnes's purism; follow-ups that pay off earlier soup decisions"
import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs';
import path from 'node:path';
import { LIBRARY } from '../../src/story/library';
import { BINDERS, RECALL_TOKENS, RENDER_TOKENS } from '../../src/story/engine';
import { validateLibrary } from '../../src/story/validate';
import type { CardDef } from '../../src/story/types';

const arg = (k: string, d = '') => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 ? process.argv[i + 1] : d;
};
const era = arg('era', 'grassroots');
const count = Number(arg('count', '10'));
const brief = arg('brief', 'Character-driven dilemmas that call back to earlier decisions.');
const root = path.resolve(import.meta.dirname, '../..');
const out = arg('out', path.join(root, 'content/drafts', `${era}-${Date.now()}.json`));

const bible = fs.readFileSync(path.join(root, 'docs/WRITING-BIBLE.md'), 'utf8');
const storyState = fs.readFileSync(path.join(root, 'docs/STORY-STATE.md'), 'utf8');
const types = fs.readFileSync(path.join(root, 'src/story/types.ts'), 'utf8');
const examples = ['grass.principles', 'mem.public_rejection', 'twist.priya_picnic', 'doc.noticed_purist'].map((id) => LIBRARY.cards.find((c) => c.id === id));
const existing = LIBRARY.cards.map((c) => `${c.id} [${typeof c.speaker === 'string' ? c.speaker : 'anon'}]: ${c.text.slice(0, 90)}`).join('\n');
const flags = [...new Set(LIBRARY.cards.flatMap((c) => c.choices.flatMap((ch) => ch.effects.flags ?? [])))].join(', ');

const system = `You are a staff writer on THE MOVEMENT, a comedy strategy game. You write decision cards as strict JSON that a deterministic engine will select at runtime. Follow the writing bible exactly. Output only a JSON array of card objects, nothing else.

${bible}

${storyState}`;

const user = `Write ${count} new cards for the ${era} era.
Brief: ${brief}

Schema (TypeScript; your output must be CardDef[]):
${types}

Valid render tokens: ${RENDER_TOKENS.join(', ')}; with a recall query also ${RECALL_TOKENS.join(', ')}; with an emergent binder also emergentBy; plus {c.<characterId>}, {C.<characterId>}, {role.<characterId>}, {custom.<customId>.<field>}, and any key you bind.
Valid binders for "bind": ${Object.keys(BINDERS).join(', ')} (emergent takes an argument, e.g. emergent:none, emergent:tolerated:grown, emergent:underground).
Characters: ${LIBRARY.characters.map((c) => `${c.id} (${c.name}; agenda ${c.agenda}; ${c.bio})`).join(' | ')}
Customs ids: ${LIBRARY.customs.map((c) => c.id).join(', ')}
Flags already set by existing cards (use them for callbacks): ${flags}

Existing cards (do not repeat these premises):
${existing}

Approved examples:
${JSON.stringify(examples, null, 1)}

Rules: use new unique ids prefixed "${era.slice(0, 5)}.draft."; every card needs exactly two choices with label, hint, reaction and effects; prefer callbacks to existing flags and customs; at least a third of the cards should schedule or be follow-ups; keep gauge changes within ±15 except crises; tag every card with shape, setting and (where it has one) topic; include at least one card where a character is right for the wrong reasons or wrong for reasonable ones (twist); chain follow-ups need maxDelay and a cancelIf for the situation that makes them funny; avoid shapes that already dominate the library.`;

const client = new Anthropic();
const params = {
  model: 'claude-opus-5-5',
  max_tokens: 64000,
  betas: ['server-side-fallback-2026-07-01'],
  fallbacks: 'default',
  thinking: { type: 'adaptive' },
  output_config: { effort: 'high' },
  system,
  messages: [{ role: 'user', content: user }],
};

async function main() {
  // Cast: newer request fields may be ahead of the installed SDK's type definitions.
  const stream = client.beta.messages.stream(params as unknown as Parameters<typeof client.beta.messages.stream>[0]);
  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'refusal') throw new Error('The model declined this brief.');
  const text = msg.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text').map((b) => b.text).join('');
  const json = text.slice(text.indexOf('['), text.lastIndexOf(']') + 1);
  let cards: CardDef[];
  try {
    cards = JSON.parse(json);
  } catch {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(`${out}.raw.txt`, text);
    throw new Error(`Output was not valid JSON; raw text saved to ${out}.raw.txt`);
  }
  const report = validateLibrary({ ...LIBRARY, cards: [...LIBRARY.cards, ...cards] });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(cards, null, 1));
  fs.writeFileSync(`${out}.review.md`, [`# Draft batch review: ${path.basename(out)}`, `Brief: ${brief}`, '', '## Errors (must fix)', ...report.errors.map((e) => `- ${e}`), '', '## Warnings', ...report.warnings.map((w) => `- ${w}`), '', '## Editorial checklist', '- [ ] Each card is funny because of who is speaking and what the player decided before', '- [ ] Characters sound like their bios', '- [ ] No repeated premise', '- [ ] Both choices are tempting', '- [ ] Effects match the fiction'].join('\n'));
  console.log(`${cards.length} drafts → ${out}\n${report.errors.length} errors, ${report.warnings.length} warnings (see ${out}.review.md)`);
}

main().catch((e) => {
  if (e instanceof Anthropic.RateLimitError) console.error('Rate limited; try again shortly.');
  else if (e instanceof Anthropic.APIError) console.error(`API error ${e.status}: ${e.message}`);
  else console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
