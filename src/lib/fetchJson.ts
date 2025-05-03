// src/lib/fetchJson.ts
export async function fetchJson<T = any>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);

  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new Error(`❌ 無法解析 JSON：${response.status} ${response.statusText}`);
  }

  if (data?.success === false) {
    throw new Error(`🚨 錯誤：${data.error || '未知錯誤'}`);
  }

  return data;
}
