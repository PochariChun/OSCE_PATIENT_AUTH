// 標準化名稱變體
export function normalizeNames(text: string): string {
  // 將所有"小威"的變體統一為"小威"
  return text.replace(/小葳|小薇|曉薇|曉威|筱威|小葳/g, '小威');
}

// 可能的其他文本處理函數... 