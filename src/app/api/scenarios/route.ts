// src/app/api/scenarios/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest) {
  try {
    const scenarios = await prisma.scenario.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });

    const formattedScenarios = scenarios.map((scenario: typeof scenarios[number]) => ({
      id: scenario.id,
      title: scenario.title,
      description: scenario.description,
      scenarioCode: scenario.scenarioCode,
      difficulty: scenario.difficulty || 'medium',
    }));
    
    return NextResponse.json({ data: formattedScenarios }, { status: 200 });
  } catch (error) {
    console.error('獲取場景列表錯誤:', error);
    return NextResponse.json({ error: '獲取場景列表失敗' }, { status: 500 });
  }
}
