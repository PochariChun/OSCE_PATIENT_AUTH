import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: '缺少用戶 ID 參數' },
        { status: 400 }
      );
    }

    console.log(`獲取用戶 ${userId} 的對話歷史`);

    const conversations = await prisma.conversation.findMany({
      where: {
        userId: parseInt(userId),
      },
      orderBy: {
        startedAt: 'desc',
      },
      select: {
        id: true,
        startedAt: true,
        endedAt: true,
        score: true,
        durationSec: true,
        overtime: true,
        scenarioId: true,
        scenario: {
          select: {
            title: true,
          },
        },
      },
    });

    console.log(`找到 ${conversations.length} 條對話記錄`);

    // 轉換為前端需要的格式
    const formattedHistory = conversations.map(conv => ({
      id: conv.id,
      title: conv.scenario ? conv.scenario.title : '未命名對話',
      startedAt: conv.startedAt.toISOString(),
      score: conv.score,
      durationSec: conv.durationSec,
      overtime: conv.overtime,
    }));

    return NextResponse.json(formattedHistory);
  } catch (error) {
    console.error('獲取對話歷史失敗:', error);
    return NextResponse.json(
      { error: '獲取對話歷史失敗', details: (error as Error).message },
      { status: 500 }
    );
  }
} 