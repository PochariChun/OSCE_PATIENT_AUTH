// src/app/api/scenarios/recommended/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userIdParam = url.searchParams.get('userId');

    if (!userIdParam) {
      return NextResponse.json({
        success: false,
        message: '缺少用戶ID參數',
        data: [],
      }, { status: 200 });
    }

    const userId = parseInt(userIdParam);
    if (isNaN(userId)) {
      return NextResponse.json({
        success: false,
        message: '無效的用戶ID',
        data: [],
      }, { status: 200 });
    }

    const completedScenarios = await prisma.conversation.findMany({
      where: {
        userId,
        endedAt: { not: null },
      },
      select: {
        scenarioId: true,
      },
      distinct: ['scenarioId'],
    });

    const completedIds = completedScenarios.map(s => s.scenarioId).filter(Boolean);

    const scenarios = await prisma.scenario.findMany({
      where: {
        isActive: true,
        id: completedIds.length > 0 ? { notIn: completedIds } : undefined,
      },
      orderBy: { id: 'asc' },
      take: 4,
    });

    const formatted = scenarios.map((scenario: typeof scenarios[number]) => ({
      id: scenario.id,
      title: scenario.title,
      description: scenario.description,
      scenarioCode: scenario.scenarioCode,
      difficulty: scenario.difficulty || 'medium',
    }));

    return NextResponse.json({
      success: true,
      message: '取得成功',
      data: formatted,
    }, { status: 200 });

  } catch (error) {
    console.error('獲取推薦場景錯誤:', error);
    return NextResponse.json({
      success: false,
      message: '伺服器錯誤，請稍後再試',
      data: [],
    }, { status: 500 });
  }
}
