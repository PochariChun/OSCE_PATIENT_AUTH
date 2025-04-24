import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: '缺少用戶ID' }, { status: 400 });
    }
    
    // 查詢數據庫獲取對話歷史
    const conversations = await prisma.conversation.findMany({
      where: {
        userId: parseInt(userId)
      },
      orderBy: {
        startedAt: 'desc'
      },
      take: 10 // 只獲取最近的10條記錄
    });
    
    // 將數據庫記錄轉換為前端需要的格式
    const history = conversations.map((conv: any) => {
      // 從消息中提取標題（如果有的話）
      let title = `對話 ${new Date(conv.startedAt).toLocaleDateString('zh-TW')}`;
      
      // 如果有反思內容，可以用作標題
      if (conv.reflection) {
        // 取反思內容的前20個字符作為標題
        title = conv.reflection.substring(0, 20) + (conv.reflection.length > 20 ? '...' : '');
      }
      
      return {
        id: conv.id,
        title: title,
        startedAt: conv.startedAt.toISOString(),
        score: conv.score,
        durationSec: conv.durationSec,
        overtime: conv.overtime
      };
    });
    
    return NextResponse.json(history);
  } catch (error) {
    console.error('獲取對話歷史失敗', error);
    return NextResponse.json({ error: '獲取對話歷史失敗' }, { status: 500 });
  }
} 