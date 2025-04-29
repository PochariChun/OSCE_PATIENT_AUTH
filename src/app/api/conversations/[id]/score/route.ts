import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { evaluateConversationWithRAG } from '@/lib/ragScoringService';

// 添加動態配置
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // 從 URL 路徑獲取對話 ID
    const conversationId = parseInt(context.params.id);
    
    if (isNaN(conversationId)) {
      return NextResponse.json({ error: '無效的對話ID' }, { status: 400 });
    }

    // 獲取對話詳情
    const conversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
      include: {
        messages: {
          orderBy: {
            timestamp: 'asc',
          },
          select: {
            id: true,
            sender: true,
            text: true,
            timestamp: true,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: '對話不存在' }, { status: 404 });
    }

    // 使用 RAG 評分方法評分對話
    const { score, evaluationDetails } = await evaluateConversationWithRAG(conversation);

    // 更新對話的分數
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { score },
    });

    // 返回評分結果
    return NextResponse.json({
      score,
      evaluationDetails,
    });
  } catch (error) {
    console.error('評分對話失敗:', error);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
} 