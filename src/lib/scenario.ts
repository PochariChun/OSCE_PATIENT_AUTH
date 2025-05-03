// src/app/api/scenarios/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Scenario } from '@prisma/client'; // ✅ 加上這一行

export async function GET() {
  try {
    const scenarios = await prisma.scenario.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' }
    });

    const formatted = scenarios.map((scenario: Scenario) => ({
      id: scenario.id,
      title: scenario.title,
      description: scenario.description,
      scenarioCode: scenario.scenarioCode,
      difficulty: scenario.difficulty || 'medium',
    }));

    return NextResponse.json({ data: formatted }, { status: 200 });

  } catch (error) {
    console.error('取得場景列表失敗:', error);
    return NextResponse.json({ error: '取得場景列表失敗' }, { status: 500 });
  }
}
