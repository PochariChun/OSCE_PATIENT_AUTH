import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 添加动态配置
export const dynamic = 'force-dynamic';

// 結束對話
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const conversationId = parseInt(id);
    
    if (isNaN(conversationId)) {
      return NextResponse.json(
        { error: '無效的對話 ID' },
        { status: 400 }
      );
    }
    
    const data = await request.json();
    
    // 檢查對話是否存在
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    
    if (!conversation) {
      return NextResponse.json(
        { error: '找不到指定的對話' },
        { status: 404 }
      );
    }
    
    // 檢查用戶權限
    if (data.userId && conversation.userId !== parseInt(data.userId)) {
      return NextResponse.json(
        { error: '您無權結束此對話' },
        { status: 403 }
      );
    }
    
    // 計算對話時長
    const startedAt = conversation.startedAt;
    const endedAt = new Date();
    const durationSec = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
    
    // 檢查是否超時
    const overtime = data.overtime || false;
    
    // 更新對話
    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        endedAt,
        durationSec,
        overtime,
        score: data.score || 0,
      },
    });
    
    return NextResponse.json({
      success: true,
      conversation: {
        id: updatedConversation.id,
        startedAt: updatedConversation.startedAt,
        endedAt: updatedConversation.endedAt,
        durationSec: updatedConversation.durationSec,
        overtime: updatedConversation.overtime,
        score: updatedConversation.score,
      }
    });
  } catch (error) {
    console.error('結束對話失敗:', error);
    return NextResponse.json(
      { error: '結束對話失敗', details: (error as Error).message },
      { status: 500 }
    );
  }
} 