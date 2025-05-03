// src/app/api/conversations/[id]/reflection/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 獲取所有反思訊息
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const conversationId = searchParams.get('conversationId');

    const where: any = {};

    if (userId) {
      const conversations = await prisma.conversation.findMany({
        where: { userId: parseInt(userId) },
        select: { id: true },
      });
      const conversationIds = conversations.map(conv => conv.id);
      where.conversationId = { in: conversationIds };
    }

    if (conversationId) {
      where.conversationId = parseInt(conversationId);
    }

    const reflectionMessages = await prisma.reflectionMessage.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      include: {
        conversation: {
          select: {
            userId: true,
            scenario: { select: { title: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: reflectionMessages });
  } catch (error) {
    console.error('獲取反思訊息失敗:', error);
    return NextResponse.json(
      { success: false, error: '獲取反思訊息失敗', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// 創建新的反思訊息
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const data = await request.json();
  const conversationId = parseInt(params.id);

  if (data.complete) {
    try {
      await prisma.conversation.update({
        where: { id: conversationId, userId: data.userId },
        data: {
          reflectionCompleted: true,
          updatedAt: new Date()
        }
      });
      return NextResponse.json({ success: true });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  // 其餘欄位檢查
  if (!conversationId || !data.sender || !data.text) {
    return NextResponse.json(
      { success: false, error: '缺少必要的數據' },
      { status: 400 }
    );
  }

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId }
  });

  if (!conversation) {
    return NextResponse.json(
      { success: false, error: '找不到指定的對話' },
      { status: 404 }
    );
  }

  try {
    const reflectionMessage = await prisma.reflectionMessage.create({
      data: {
        conversationId,
        sender: data.sender,
        text: data.text,
        timestamp: new Date(),
        sourceNodeId: data.sourceNodeId || null,
        strategyTag: data.strategyTag || null,
      },
    });

    return NextResponse.json({ success: true, data: reflectionMessage });
  } catch (error) {
    console.error('創建反思訊息失敗:', error);
    return NextResponse.json(
      { success: false, error: '創建反思訊息失敗', details: (error as Error).message },
      { status: 500 }
    );
  }
}
