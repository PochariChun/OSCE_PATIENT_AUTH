import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';  // 使用共享的 Prisma 实例

export async function GET(request: NextRequest) {
  try {
    // 从数据库获取所有场景
    const scenarios = await prisma.scenario.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        difficulty: 'asc'
      }
    });
    
    console.log('获取到的场景数量:', scenarios.length);
    
    return NextResponse.json(scenarios);
  } catch (error) {
    console.error('获取场景数据失败', error);
    // 返回空数组，不使用假数据
    return NextResponse.json([]);
  }
} 