const keyTermKeywords = [
  { code: 'L11', category: '記錄', subcategory: '發燒.開始時間', keywords: ['開始', '發燒'] },
  { code: 'L12', category: '記錄', subcategory: '發燒.最高溫度', keywords: ['最高', '體溫'] },
  { code: 'L13', category: '記錄', subcategory: '發燒.處理方式', keywords: ['發燒', '處理'] },
  { code: 'L14', category: '記錄', subcategory: '發燒.處理結果', keywords: ['體溫', '改善', '降溫', '降到'] },
  { code: 'L21', category: '記錄', subcategory: '腹瀉.開始時間', keywords: ['腹瀉', '開始', '時間'] },
  { code: 'L22', category: '記錄', subcategory: '腹瀉.頻率', keywords: ['次','5','五','五次'] },
  { code: 'L23', category: '記錄', subcategory: '腹瀉.量', keywords: ['腹瀉', '量'] },
  { code: 'L24', category: '記錄', subcategory: '腹瀉.性狀', keywords: ['腹瀉', '糊'] },
  { code: 'L25', category: '記錄', subcategory: '腹瀉.顏色', keywords: ['黃色','色'] },
  { code: 'L26', category: '記錄', subcategory: '腹瀉.有無血絲', keywords: ['血絲'] },
  { code: 'L31', category: '記錄', subcategory: '嘔吐.開始時間', keywords: ['嘔吐'] },
  { code: 'L32', category: '記錄', subcategory: '嘔吐.頻率', keywords: ['次','2','兩','兩次'] },
  { code: 'L33', category: '記錄', subcategory: '嘔吐.量', keywords: ['嘔吐', '量'] },
  { code: 'L34', category: '記錄', subcategory: '嘔吐.性狀', keywords: ['稀飯','嘔吐',] },
  { code: 'L35', category: '記錄', subcategory: '嘔吐.顏色', keywords: ['白色','色'] },
];

function containsTime(text: string): boolean {
  return /([上下]午)?\s*\d{1,2}[:：點]?\d{0,2}\s*(pm|am|點)?/i.test(text);
}

function containsTemperature(text: string): boolean {
  return /\b(3[6-9](\.\d)?|4[0-1](\.\d)?)\s*(°C|度|度C|℃)?\b/.test(text);
}

function containsCountTimes(text: string): boolean {
  return /\b\d+\s*(次|回)\b/.test(text);
}

function containsEitherTimes(text: string, times: string[]): boolean {
  return times.some(t => text.includes(t));
}

function containsFood(text: string): boolean {
  const foodKeywords = ['粥', '稀飯', '飯', '牛奶', '蛋', '餅乾', '湯', '水', '藥'];
  return foodKeywords.some(food => text.includes(food));
}

// 🔁 呼叫你的 FastAPI 服務（本地開發時）
async function fetchCutWords(text: string): Promise<string[]> {
  const res = await fetch(`http://localhost:8000/cut?text=${encodeURIComponent(text)}`);
  if (!res.ok) throw new Error("Failed to call jieba API");
  const json = await res.json();
  return json.words;
}

export async function extractKeyTermsBySegmentation(text: string): Promise<
  { code: string; category: string; subcategory: string; matchedWords: string[] }[]
> {
  const words = await fetchCutWords(text);
  const wordSet = new Set(words);

  const matchedItems = keyTermKeywords
    .filter(({ keywords }) => keywords.some(k => wordSet.has(k)))
    .map(({ code, category, subcategory, keywords }) => {
      const baseMatched = keywords.filter(k => wordSet.has(k));
      let passesExtra = true;

      switch (code) {
        case 'L11':
        case 'L21':
        case 'L31':
          passesExtra = containsTime(text);
          break;
        case 'L12':
          passesExtra = containsTemperature(text);
          break;
        case 'L22':
        case 'L32':
          passesExtra = containsCountTimes(text);
          break;
        case 'L31':
          passesExtra = containsEitherTimes(text, ['8:00', '8點', '11:00', '11點','8pm','11am','8p.m',]);
          break;
        case 'L35':
          passesExtra = containsFood(text);
          break;
      }

      if (!passesExtra) return null;

      return {
        code,
        category,
        subcategory,
        matchedWords: baseMatched,
      };
    })
    .filter(Boolean) as { code: string; category: string; subcategory: string; matchedWords: string[] }[];

  return matchedItems;
}
