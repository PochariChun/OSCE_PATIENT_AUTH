import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 添加动态配置
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 从 URL 直接获取 ID
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const idFromPath = pathParts[pathParts.length - 2]; // 获取倒数第二个部分，因为最后一个是 "messages"
    const conversationId = parseInt(idFromPath);
    
    if (isNaN(conversationId)) {
      return NextResponse.json({ error: '無效的對話ID' }, { status: 400 });
    }
    
    const data = await request.json();
    
    // 驗證必要數據
    if (!data.messages || !Array.isArray(data.messages)) {
      return NextResponse.json({ error: '無效的訊息格式' }, { status: 400 });
    }
    
    // 批量創建訊息
    const createdMessages = [];
    
    for (const message of data.messages) {
      const { sender, text, timestamp, elapsedSeconds, delayFromPrev, isDelayed } = message;
      
      const createdMessage = await prisma.message.create({
        data: {
          conversationId,
          sender,
          text,
          timestamp: new Date(timestamp),
          elapsedSeconds: elapsedSeconds || 0,
          delayFromPrev: delayFromPrev || 0,
          isDelayed: isDelayed || false
        }
      });
      
      createdMessages.push(createdMessage);
    }
    
    return NextResponse.json({ 
      success: true, 
      count: createdMessages.length,
      messages: createdMessages
    });
    
  } catch (error) {
    console.error('創建訊息失敗:', error);
    return NextResponse.json({ error: '創建訊息失敗', details: error }, { status: 500 });
  }
} 