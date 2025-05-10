// src/lib/noteAnalysis.server.ts
// src/lib/noteAnalysis.server.ts

interface MatchedItem {
  code: string;
  subcategory: string;
  matchedWords: string[];
}

type ProviderType = 'openai' | 'groq';

const PROVIDER = (process.env.PROVIDER || 'openai') as ProviderType;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const GROQ_API_KEY = process.env.GROQ_API_KEY!;
const GPT_MODEL = process.env.GPT_MODEL || 'gpt-4-1106-preview';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

const ENDPOINTS: Record<ProviderType, string> = {
  openai: 'https://api.openai.com/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
};

const SYSTEM_PROMPT = `你是一位護理紀錄語意分析專家，請根據提供的完整護理紀錄，從下列項目中找出「有清楚描述」的部分，重點在於：
- 寫出時間（如：8pm、早上）
- 寫出數字條件（如：幾度、幾次、幾量）
- 寫出食物/藥品/液體名稱
- 寫出尿量改變

請比對下列項目清單，找出有明確提到的，並以 JSON 陣列輸出，每項需包含：
- code：代碼（如 E11）
- subcategory：項目名稱（如 嘔吐.量）
- matchedWords：從原文中擷取的關鍵語句，說明為什麼會判斷有提到

項目清單如下：
  { code: 'E11', subcategory: '發燒.開始時間' },
  { code: 'E12', subcategory: '發燒.最高溫度' },
  { code: 'E13', subcategory: '發燒.處理方式' },
  { code: 'E14', subcategory: '發燒.處理結果' },
  { code: 'E21', subcategory: '腹瀉.開始時間' },
  { code: 'E22', subcategory: '腹瀉.頻率' },
  { code: 'E23', subcategory: '腹瀉.量' },
  { code: 'E24', subcategory: '腹瀉.性狀' },
  { code: 'E25', subcategory: '腹瀉.顏色' },
  { code: 'E26', subcategory: '腹瀉.有無血絲' },
  { code: 'E31', subcategory: '嘔吐.開始時間' },
  { code: 'E32', subcategory: '嘔吐.頻率' },
  { code: 'E33', subcategory: '嘔吐.量' },
  { code: 'E34', subcategory: '嘔吐.性狀' },
  { code: 'E35', subcategory: '嘔吐.顏色' },
  { code: 'E41', subcategory: '進食情況' },
  { code: 'E42', subcategory: '尿量變化' }

輸出格式如下（不要包含其他文字）：
[
  {"code": "E11", "subcategory": "發燒.開始時間", "matchedWords": ["8pm開始發燒"]},
  ...
]`;

export async function extractKeyTermsByAI(text: string): Promise<MatchedItem[]> {
  let retries = 3;
  const endpoint = ENDPOINTS[PROVIDER];
  const apiKey = PROVIDER === 'openai' ? OPENAI_API_KEY : GROQ_API_KEY;
  const model = PROVIDER === 'openai' ? GPT_MODEL : GROQ_MODEL;

  while (retries > 0) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: text }
          ]
        }),
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const wait = retryAfter ? parseInt(retryAfter, 10) * 1000 : 1000;
        await new Promise((r) => setTimeout(r, wait));
        retries--;
        continue;
      }

      if (!response.ok) {
        throw new Error(`${PROVIDER} API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const content = result.choices?.[0]?.message?.content;
      if (!content) throw new Error(`No content in ${PROVIDER} response`);

      const parsed = JSON.parse(content);
      return parsed;
    } catch (err) {
      if (retries <= 1) {
        console.error(`[extractKeyTermsByAI] failed after retries (${PROVIDER}):`, err);
        throw err;
      }
      retries--;
    }
  }
  throw new Error('extractKeyTermsByAI: exhausted retries');
}
