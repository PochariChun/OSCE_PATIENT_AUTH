// 標準化名稱變體
export function normalizeNames(text: string): string {
  // 將所有"小威"的變體統一為"小威"
  return text.replace(/小葳|小薇|曉薇|曉威|筱威|小葳/g, '小威');
}

// 文本预处理函数 - 组合所有文本处理步骤
export function preprocessText(text: string): string {
  // 应用所有文本处理函数
  let processedText = text;
  processedText = normalizeNames(processedText);
  // 未来可以在这里添加更多处理步骤
  return processedText;
}

// 可能的其他文本处理函數... 