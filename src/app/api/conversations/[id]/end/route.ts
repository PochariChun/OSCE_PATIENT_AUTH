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
    
    // 取得所有訊息中的 scoringItems
    const messages = await prisma.message.findMany({
      where: { conversationId },
      select: { scoringItems: true },
    });

    // 去重後收集所有 scoringItem code
    const uniqueCodes = new Set<string>();
    for (const msg of messages) {
      for (const code of msg.scoringItems) {
        uniqueCodes.add(code);
      }
    }

    // 從資料庫查詢這些 code 的分數
    const scoringRecords = await prisma.scoringItem.findMany({
      where: {
        code: { in: Array.from(uniqueCodes) }
      },
      select: {
        code: true,
        score: true
      }
    });

    // 計算總分
    const totalScore = scoringRecords.reduce((sum, record) => sum + record.score, 0);

    // 更新對話
    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        endedAt,
        durationSec,
        overtime,
        score: totalScore,
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