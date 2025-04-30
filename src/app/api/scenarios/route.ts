import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';  // 使用共享的 Prisma 實例

export async function GET(request: Request) {
  try {
    // 獲取所有場景
    const scenarios = await prisma.scenario.findMany({
      orderBy: {
        id: 'asc',
      },
    });
    
    // 格式化返回數據
    const formattedScenarios = scenarios.map(scenario => ({
      id: scenario.id,
      title: scenario.title,
      description: scenario.description,
      scenarioCode: scenario.scenarioCode,
      difficulty: scenario.difficulty || 'medium',
    }));
    
    return NextResponse.json(formattedScenarios);
  } catch (error) {
    console.error('獲取場景列表錯誤:', error);
    return NextResponse.json(
      { error: '獲取場景列表失敗' },
      { status: 500 }
    );
  }
} 