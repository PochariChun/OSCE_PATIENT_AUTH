// src/app/api/conversations/[id]/end/route.ts
// END 會更新score一次
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = parseInt(params.id);

    if (isNaN(conversationId)) {
      return NextResponse.json({ error: '無效的對話 ID' }, { status: 400 });
    }

    const data = await request.json();
    const extraScore = data.extraScore ?? 0;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return NextResponse.json({ error: '找不到指定的對話' }, { status: 404 });
    }

    if (data.userId && conversation.userId !== parseInt(data.userId)) {
      return NextResponse.json({ error: '您無權結束此對話' }, { status: 403 });
    }

    const startedAt = conversation.startedAt;
    const endedAt = new Date();
    const durationSec = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
    const overtime = data.overtime || false;

    // 計算對話中的原始得分
    const messages = await prisma.message.findMany({
      where: { conversationId },
      select: {
        scoringItems: {
          select: { code: true },
        },
      },
    });

    const allCodes = messages.flatMap((msg) =>
      msg.scoringItems.map((item) => item.code)
    );
    const uniqueCodes = Array.from(new Set(allCodes));

    const scoringRecords = await prisma.scoringItem.findMany({
      where: {
        code: { in: uniqueCodes },
      },
      select: {
        code: true,
        score: true,
      },
    });

    const dialogueScore = scoringRecords.reduce(
      (sum, item) => sum + item.score,
      0
    );

    // 計算總分
    let totalScore = dialogueScore + extraScore;
    let fluency = false;

    // 若 totalScore > 57，額外加上 M1 分數（1分）並標記為 fluent
    if (totalScore > 57) {
      totalScore += 1;
      fluency = true;
    }

    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        endedAt,
        durationSec,
        overtime,
        score: totalScore,
        fluency:fluency,
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
      },
    });
  } catch (error) {
    console.error('結束對話失敗:', error);
    return NextResponse.json(
      { error: '結束對話失敗', details: (error as Error).message },
      { status: 500 }
    );
  }
}
