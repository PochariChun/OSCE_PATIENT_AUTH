import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';  // 使用共享的 Prisma 實例

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: '缺少用戶ID' }, { status: 400 });
    }
    
    console.log('正在獲取推薦場景，用戶ID:', userId);
    
    // 從數據庫獲取推薦場景
    const recommendedScenarios = await prisma.scenario.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        difficulty: 'asc'
      },
      take: 4 // 只獲取4個場景
    });
    
    console.log('獲取到的場景數量:', recommendedScenarios.length);
    
    // 轉換為前端需要的格式
    const scenarios = recommendedScenarios.map((scenario: any) => ({
      id: scenario.id,
      title: scenario.title,
      description: scenario.description,
      scenarioCode: scenario.scenarioCode
    }));
    
    return NextResponse.json(scenarios);
  } catch (error) {
    console.error('獲取推薦場景失敗', error);
    // 返回更詳細的錯誤信息
    return NextResponse.json({ 
      error: '獲取推薦場景失敗', 
      message: error instanceof Error ? error.message : String(error),
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 