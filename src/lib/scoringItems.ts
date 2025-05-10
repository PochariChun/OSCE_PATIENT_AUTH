// src/lib/scoringItems.ts
export interface ScoringItem {
  category: string;
  subcategory: string;
  score: number;
  code: string;
}

export const allScoringItems: ScoringItem[] = [
  { category: "病人辨識", subcategory: "確認床號", score: 2, code: "A11" },
  { category: "病人辨識", subcategory: "詢問病人姓名", score: 2, code: "A12" },
  { category: "病人辨識", subcategory: "核對病人手圈或腳圈", score: 2, code: "A13" },
  { category: "病人辨識", subcategory: "自我介紹與說明目的", score: 2, code: "A14" },

  { category: "病人情況", subcategory: "開始不舒服的時間", score: 2, code: "B10" },

  { category: "病人情況", subcategory: "大便情況.次數", score: 2, code: "C1" },
  { category: "病人情況", subcategory: "大便情況.性狀", score: 3, code: "C2" },
  { category: "病人情況", subcategory: "大便情況.量", score: 3, code: "C3" },
  { category: "病人情況", subcategory: "大便情況.有無血絲", score: 2, code: "C4" },

  { category: "病人情況", subcategory: "嘔吐情況.次數", score: 2, code: "D1" },
  { category: "病人情況", subcategory: "嘔吐情況.內容", score: 3, code: "D2" },
  { category: "病人情況", subcategory: "嘔吐情況.顏色", score: 3, code: "D3" },
  { category: "病人情況", subcategory: "嘔吐情況.量", score: 2, code: "D4" },

  { category: "病人情況", subcategory: "食慾.減少", score: 2, code: "E1" },
  { category: "病人情況", subcategory: "食慾.吃什麼", score: 2, code: "E2" },
  { category: "病人情況", subcategory: "食慾.量", score: 2, code: "E3" },

  { category: "病人情況", subcategory: "進食與症狀的關聯", score: 2, code: "F0" },

  { category: "病人情況", subcategory: "發燒史評估.開始時間", score: 2, code: "G1" },
  { category: "病人情況", subcategory: "發燒史評估.最高體溫", score: 2, code: "G2" },
  { category: "病人情況", subcategory: "發燒史評估.處置及方式", score: 2, code: "G3" },
  { category: "病人情況", subcategory: "發燒史評估.退燒情形", score: 2, code: "G4" },

  { category: "病人情況", subcategory: "小便情況.量", score: 2, code: "H8" },
  { category: "病人情況", subcategory: "小便情況.濃度", score: 2, code: "H9" },

  { category: "病人情況", subcategory: "就醫過程.診所", score: 2, code: "I1" },
  { category: "病人情況", subcategory: "就醫過程.診斷", score: 2, code: "I2" },
  { category: "病人情況", subcategory: "就醫過程.醫師處置", score: 2, code: "I3" },

  { category: "評估檢查", subcategory: "一般護理評估", score: 2, code: "J1" },
  { category: "評估檢查", subcategory: "測量生命徵象", score: 2, code: "J2" },
  { category: "評估檢查", subcategory: "腹部評估", score: 2, code: "J3" },
  { category: "評估檢查", subcategory: "腹痛評估", score: 3, code: "J4" },

  { category: "護理指導", subcategory: "腹瀉護理指導.記錄顏色", score: 2, code: "K1" },
  { category: "護理指導", subcategory: "腹瀉護理指導.記錄性質", score: 2, code: "K2" },
  { category: "護理指導", subcategory: "腹瀉護理指導.必要時禁食", score: 2, code: "K3" },
  { category: "護理指導", subcategory: "腹瀉護理指導.皮膚護理", score: 2, code: "K4" },
  { category: "護理指導", subcategory: "腹瀉護理指導.飲食選擇BART", score: 2, code: "K5" },

  { category: "記錄", subcategory: "發燒.開始時間", score: 1, code: "L11" },
  { category: "記錄", subcategory: "發燒.最高溫度", score: 1, code: "L12" },
  { category: "記錄", subcategory: "發燒.處理方式", score: 1, code: "L13" },
  { category: "記錄", subcategory: "發燒.處理結果", score: 1, code: "L14" },

  { category: "記錄", subcategory: "腹瀉.開始時間", score: 1, code: "L21" },
  { category: "記錄", subcategory: "腹瀉.頻率", score: 1, code: "L22" },
  { category: "記錄", subcategory: "腹瀉.量", score: 1, code: "L23" },
  { category: "記錄", subcategory: "腹瀉.性狀", score: 1, code: "L24" },
  { category: "記錄", subcategory: "腹瀉.顏色", score: 1, code: "L25" },
  { category: "記錄", subcategory: "腹瀉.有無血絲", score: 1, code: "L26" },

  { category: "記錄", subcategory: "嘔吐.開始時間", score: 1, code: "L31" },
  { category: "記錄", subcategory: "嘔吐.頻率", score: 1, code: "L32" },
  { category: "記錄", subcategory: "嘔吐.量", score: 1, code: "L33" },
  { category: "記錄", subcategory: "嘔吐.性狀", score: 1, code: "L34" },
  { category: "記錄", subcategory: "嘔吐.顏色", score: 1, code: "L35" },

  { category: "綜合性表現", subcategory: "全程關心病童及家屬反應 ", score: 1, code: "M2" },
  { category: "綜合性表現", subcategory: "態度及語調表現親切", score: 1, code: "M3" }
];


interface ScoredItem {
  code: string;
  category: string;
  subcategory: string;
  score: number;
  awarded: boolean;
  hitMessages: string[];
}

/**
 * 將得分代碼轉換為完整的評分項目陣列
 * @param awardedMap - 來自訊息的評分項目與命中訊息內容
 * @param noteMatchedCodes - 護理紀錄中 matchedCodes 陣列（僅代碼）
 * @returns 每項包含是否得分與命中來源的評分資料
 */
export function generateScoredItems(
  awardedMap: Record<string, { hitMessages: string[] }> = {},
  noteMatchedCodes: string[] = []
): ScoredItem[] {
  const noteSet = new Set(noteMatchedCodes);

  return allScoringItems.map((item) => {
    const fromMessage = awardedMap[item.code];
    const fromNote = noteSet.has(item.code);

    const awarded = !!fromMessage || fromNote;
    const hitMessages: string[] = [];

    if (fromMessage) hitMessages.push(...fromMessage.hitMessages);
    if (fromNote) hitMessages.push('紀錄中命中');

    return {
      ...item,
      awarded,
      hitMessages,
    };
  });
}
