// 标准化名称变体
export function normalizeNames(text: string): string {
  // 将所有"小威"的变体统一为"小威"
  return text.replace(/小葳|小薇|曉薇|曉威|筱威|小葳/g, '小威');
} 