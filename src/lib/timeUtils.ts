/**
 * 將秒數格式化為 "MM:SS" 格式
 * @param seconds 秒數
 * @returns 格式化後的時間字符串
 */
export function formatElapsedTime(seconds: number | undefined): string {
  if (seconds === undefined) return '00:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
} 