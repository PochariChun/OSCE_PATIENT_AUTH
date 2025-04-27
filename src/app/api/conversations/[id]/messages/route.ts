import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = parseInt(params.id);
    const data = await request.json();
    
    // 驗證必要數據
    if (!data.messages || data.messages.length === 0) {
      return NextResponse.json(
        { error: '缺少訊息數據' },
        { status: 400 }
      );
    }
    
    // 批量添加訊息，根據發送者類型處理不同欄位
    const result = await prisma.message.createMany({
      data: data.messages.map((msg: any) => {
        // 基本訊息數據
        const messageData: any = {
          conversationId: conversationId,
          sender: msg.sender,
          text: msg.text,
          timestamp: new Date(msg.timestamp),
          // 為所有訊息提供必填欄位的默認值
          elapsedSeconds: msg.elapsedSeconds || 0,
          delayFromPrev: msg.delayFromPrev || 0,
          isDelayed: msg.isDelayed || false
        };
        
        return messageData;
      })
    });
    
    return NextResponse.json({ 
      success: true, 
      count: result.count
    });
    
  } catch (error) {
    console.error('添加訊息失敗:', error);
    return NextResponse.json(
      { error: '添加訊息失敗', details: (error as Error).message },
      { status: 500 }
    );
  }
} 