// Optional server-side narrative enhancement. Disabled unless ANTHROPIC_API_KEY (or another
// SDK credential) is configured. The game is fully playable without it.
import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { moderate } from '@/engine/ideology';
import { NARRATION_JSON_SCHEMA, type NarrationRequest, validateNarration } from '@/lib/narrativeSchema';

export const runtime = 'nodejs';

const SYSTEM = `You are the deadpan news desk of a fictional alternate world in a satirical strategy game.
A player-invented movement with harmless absurd customs is spreading. Rewrite the given event as a short, dry,
specific news item that references the movement's actual doctrines. Treat ridiculous beliefs with institutional seriousness.
Rules: do not invent numbers or game outcomes; do not mention real living people, real political parties or real religions;
no violence, hate or real-world persuasion advice; keep the same meaning and the same choices (same count, same order).
Avoid repeating any recent headline. Headline under 100 characters, article under 90 words.`;

export async function GET() {
  return NextResponse.json({ enabled: !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) });
}

export async function POST(req: Request) {
  if (!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)) return NextResponse.json({ error: 'AI narration not configured' }, { status: 503 });
  let body: NarrationRequest;
  try {
    body = (await req.json()) as NarrationRequest;
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
  const input = JSON.stringify(body).slice(0, 8000);
  if (!moderate(input).ok) return NextResponse.json({ error: 'rejected' }, { status: 422 });
  try {
    const client = new Anthropic();
    const params = {
      model: 'claude-opus-5-5',
      max_tokens: 2000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: NARRATION_JSON_SCHEMA } },
      system: SYSTEM,
      messages: [{ role: 'user', content: input }],
    };
    // Cast: these newer request fields may be ahead of the installed SDK's type definitions.
    const res = (await client.beta.messages.create(params as unknown as Parameters<typeof client.beta.messages.create>[0])) as Anthropic.Beta.BetaMessage;
    if (res.stop_reason === 'refusal') return NextResponse.json({ error: 'declined' }, { status: 422 });
    const text = res.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')?.text ?? '';
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: 'invalid output' }, { status: 502 });
    }
    const result = validateNarration(parsed, body.event.choices?.length ?? 0);
    if (!result || !moderate(`${result.headline} ${result.article} ${result.quote ?? ''}`).ok) return NextResponse.json({ error: 'invalid output' }, { status: 502 });
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return NextResponse.json({ error: 'rate limited' }, { status: 429 });
    if (e instanceof Anthropic.APIError) return NextResponse.json({ error: `api error ${e.status}` }, { status: 502 });
    return NextResponse.json({ error: 'unavailable' }, { status: 502 });
  }
}
