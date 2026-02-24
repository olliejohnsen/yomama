/**
 * OllamaService
 * Handles all communication with the /api/generate endpoint (Ollama proxy).
 * Returns an async iterable/stream of text chunks.
 */

export interface GenerateJokeOptions {
  targetRegion: string;
  attackerRegion?: string;
  onChunk: (chunk: string) => void;
}

// Only match phrases at the START of a response, or very specific content phrases
const REFUSAL_STARTS = [
  "i'm sorry, but i can't",
  "i am sorry, but i can't",
  "i'm sorry, i can't",
  "sorry, i can't help with that",
  "i can't help with that",
  "i cannot help with that",
  "i can't assist with that",
  "i cannot assist with that",
  "i'm not able to help",
  "i am not able to help",
  "i won't be able to",
  "i will not help",
  "i don't feel comfortable",
  "as an ai language model",
  "as an ai, i",
];

const REFUSAL_ANYWHERE = [
  "against my guidelines",
  "violates my",
  "not able to fulfill",
  "cannot fulfill this",
];

export function isRefusal(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (REFUSAL_STARTS.some(p => lower.startsWith(p))) return true;
  if (REFUSAL_ANYWHERE.some(p => lower.includes(p))) return true;
  // Catch bare one-liners that are clearly refusals
  if (lower.length < 60 && (lower.includes("can't help") || lower.includes("cannot help"))) return true;
  return false;
}

export async function generateJoke({ targetRegion, attackerRegion, onChunk }: GenerateJokeOptions): Promise<string> {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      region: targetRegion,
      attackerRegion: attackerRegion ?? 'The Internet',
      seed: Math.floor(Math.random() * 1_000_000),
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate joke: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No readable stream available');

  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    fullText += chunk;
    onChunk(fullText);
  }

  return fullText;
}
