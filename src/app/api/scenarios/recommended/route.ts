import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';  // 使用共享的 Prisma 實例

export async function GET(request: Request) {
  try {
    // 獲取 URL 參數
    const url = new URL(request.url);
    const userIdParam = url.searchParams.get('userId');
    
    if (!userIdParam) {
      return NextResponse.json(
        { error: '缺少用戶ID參數' },
        { status: 400 }
      );
    }
    
    const userId = parseInt(userIdParam);
    
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: '無效的用戶ID' },
        { status: 400 }
      );
    }
    
    // 獲取用戶已完成的場景
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
    
    const completedScenarioIds = completedScenarios.map(s => s.scenarioId);
    
    // 獲取推薦場景（未完成的場景）
    const recommendedScenarios = await prisma.scenario.findMany({
      where: {
        id: { notIn: completedScenarioIds.length > 0 ? completedScenarioIds : undefined },
      },
      orderBy: {
        id: 'asc',
      },
      take: 4, // 限制返回數量
    });
    
    // 格式化返回數據
    const formattedScenarios = recommendedScenarios.map(scenario => ({
      id: scenario.id,
      title: scenario.title,
      description: scenario.description,
      scenarioCode: scenario.scenarioCode,
    }));
    
    return NextResponse.json(formattedScenarios);
  } catch (error) {
    console.error('獲取推薦場景錯誤:', error);
    return NextResponse.json(
      { error: '獲取推薦場景失敗' },
      { status: 500 }
    );
  }
} 