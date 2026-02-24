import { NextRequest } from 'next/server';

// Node.js runtime — no execution timeout, needed for slow LLM queuing
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const { region, attackerRegion, seed } = await req.json();

    if (!region) {
      return new Response('Region is required', { status: 400 });
    }

    const ollamaEndpoint = process.env.OLLAMA_ENDPOINT || 'http://10.10.10.216:11434';
    const model = process.env.OLLAMA_MODEL || 'gpt4-oss';

    const system = `You write "Yo Mama" jokes for a comedy game. "Yo Mama" always refers to the mother of the person being ROASTED (the target). Reply with one joke and nothing else — no intro, no commentary.`;

    const prompt = `${attackerRegion || 'The Internet'} is roasting ${region}. Write one "Yo mama so ${region}..." joke that mocks ${region}'s culture or stereotypes. Keep it under 2 sentences.

Style examples:
- "Yo mama so Norwegian, she put salmon in the dishwasher and called it meal prep."
- "Yo mama so German, she alphabetised the bins and fined the neighbours for breathing wrong."
- "Yo mama so French, she went on strike because the baguette was 3mm too short."

One original joke about ${region} only:`;

    const response = await fetch(`${ollamaEndpoint}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        system,
        prompt,
        stream: true,
        options: {
          temperature: 1.0,
          top_p: 0.95,
          seed: seed ?? Math.floor(Math.random() * 1_000_000),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const json = JSON.parse(line);
                if (json.response) {
                  controller.enqueue(new TextEncoder().encode(json.response));
                }
                if (json.done) {
                  controller.close();
                  return;
                }
              } catch (e) {
                console.error('Error parsing JSON chunk:', e);
              }
            }
          }
        } catch (error) {
          controller.error(error);
        } finally {
          reader.releaseLock();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('API Route Error:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate joke' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
