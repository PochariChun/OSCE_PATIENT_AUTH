import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const conversationId = id ? parseInt(id) : NaN;
    
    // 其余代码保持不变...
  } catch (error) {
    // 错误处理...
  }
} 