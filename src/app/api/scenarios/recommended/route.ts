import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';  // 使用共享的 Prisma 实例

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 });
    }
    
    console.log('正在获取推荐场景，用户ID:', userId);
    
    // 从数据库获取推荐场景
    const recommendedScenarios = await prisma.scenario.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        difficulty: 'asc'
      },
      take: 4 // 只获取4个场景
    });
    
    console.log('获取到的场景数量:', recommendedScenarios.length);
    
    // 转换为前端需要的格式
    const scenarios = recommendedScenarios.map((scenario: any) => ({
      id: scenario.id,
      title: scenario.title,
      description: scenario.description,
      scenarioCode: scenario.scenarioCode
    }));
    
    return NextResponse.json(scenarios);
  } catch (error) {
    console.error('获取推荐场景失败', error);
    // 返回更详细的错误信息
    return NextResponse.json({ 
      error: '获取推荐场景失败', 
      message: error instanceof Error ? error.message : String(error),
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 