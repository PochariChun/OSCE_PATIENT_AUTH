import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';  // 使用共享的 Prisma 實例

export async function GET(request: NextRequest) {
  try {
    // 從數據庫獲取所有場景
    const scenarios = await prisma.scenario.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        difficulty: 'asc'
      }
    });
    
    console.log('獲取到的場景數量:', scenarios.length);
    
    return NextResponse.json(scenarios);
  } catch (error) {
    console.error('獲取場景數據失敗', error);
    // 返回空數組，不使用假數據
    return NextResponse.json([]);
  }
} 