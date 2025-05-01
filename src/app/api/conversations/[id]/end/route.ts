import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = parseInt(params.id);
    const { userId, durationSec } = await request.json();

    if (!conversationId || isNaN(conversationId)) {
      return NextResponse.json(
        { error: '無效的對話 ID' },
        { status: 400 }
      );
    }

    console.log(`處理對話結束請求: ID=${conversationId}, 用戶ID=${userId}, 持續時間=${durationSec}秒`);

    // 1. 更新對話結束時間和持續時間
    const endedAt = new Date();
    const overtime = durationSec > 600; // 10分鐘 = 600秒

    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        endedAt,
        durationSec,
        overtime,
      },
    });

    console.log(`對話已更新: ${JSON.stringify(updatedConversation)}`);

    // 2. 對對話進行評分
    try {
      console.log('開始對對話進行評分...');
      
      // 這裡可以添加評分邏輯，或者調用另一個 API
      const scoreResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/conversations/${conversationId}/score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (scoreResponse.ok) {
        const scoreResult = await scoreResponse.json();
        console.log('對話評分成功，分數:', scoreResult.score);
      } else {
        console.error('對話評分失敗:', scoreResponse.status, scoreResponse.statusText);
      }
    } catch (scoreError) {
      console.error('評分過程中發生錯誤:', scoreError);
      // 評分失敗不應該影響整個流程
    }

    return NextResponse.json({
      success: true,
      message: '對話已成功結束',
      conversation: updatedConversation
    });
  } catch (error) {
    console.error('結束對話時發生錯誤:', error);
    return NextResponse.json(
      { error: '結束對話時發生錯誤', details: (error as Error).message },
      { status: 500 }
    );
  }
} 