// lib/askGibbsAI.ts
import { OpenAI } from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';

// ✅ 建議用環境變數切換
const PROVIDER = process.env.PROVIDER || 'openai';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const GROQ_API_KEY = process.env.GROQ_API_KEY!;

const groqmodel = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
const gptmodel = process.env.GPT_MODEL || 'gpt-4-1106-preview';


type GptReply = { reply: string; strategyTag: string };

export async function askGibbsAI(
  messages: ChatCompletionMessageParam[],
  fallbackStage: string
): Promise<GptReply> {
  const provider = PROVIDER ?? 'openai';
  let raw: string | null = null;

  if (provider === 'openai') {
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: gptmodel,
      messages,
      temperature: 0.6,
      max_tokens: 500
    });
    raw = completion.choices[0].message.content;
  } else if (provider === 'groq') {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: groqmodel,
        messages,
        temperature: 0.6,
        max_tokens: 500
      })
    });

    const result = await response.json();
    raw = result.choices?.[0]?.message?.content ?? null;
  } else {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  if (!raw) throw new Error('空的回應內容');

  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed !== 'object' ||
      typeof parsed.reply !== 'string' ||
      typeof parsed.strategyTag !== 'string'
    ) {
      throw new Error('JSON 格式錯誤，缺少 reply 或 strategyTag');
    }
    return parsed;
  } catch {
    // fallback 結構
    return {
      reply: raw,
      strategyTag: fallbackStage
    };
  }
}
