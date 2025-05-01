import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

export async function POST(request: NextRequest) {
  try {
    const { userId, scenarioId, role } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: '缺少用戶 ID' },
        { status: 400 }
      );
    }
    
    if (!scenarioId) {
      return NextResponse.json(
        { error: '缺少場景 ID' },
        { status: 400 }
      );
    }
    
    console.log(`創建新對話: 用戶ID=${userId}, 場景ID=${scenarioId}, 角色=${role || '未指定'}`);
    
    // 查找場景信息
    const scenario = await prisma.scenario.findUnique({
      where: { id: Number(scenarioId) },
    });
    
    if (!scenario) {
      return NextResponse.json(
        { error: '找不到指定的場景' },
        { status: 404 }
      );
    }
    
    // 查找用戶信息，獲取角色
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: '找不到指定的用戶' },
        { status: 404 }
      );
    }
    
    // 創建新對話，使用傳入的角色或用戶的角色
    const conversation = await prisma.conversation.create({
      data: {
        userId: Number(userId),
        scenarioId: Number(scenarioId),
        startedAt: new Date(),
        role: role || user.role || 'NURSE', // 優先使用傳入的角色，然後是用戶的角色，最後是預設值
        overtime: false,
      },
    });
    
    console.log(`對話創建成功: ID=${conversation.id}`);
    
    return NextResponse.json(conversation);
  } catch (error) {
    console.error('創建對話失敗:', error);
    
    // 更詳細的錯誤處理
    if (error instanceof PrismaClientKnownRequestError) {
      // 處理 Prisma 特定錯誤
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: '創建對話失敗: 唯一性約束衝突', details: error.message },
          { status: 409 }
        );
      } else if (error.code === 'P2003') {
        return NextResponse.json(
          { error: '創建對話失敗: 外鍵約束失敗', details: error.message },
          { status: 400 }
        );
      } else if (error.code === 'P2025') {
        return NextResponse.json(
          { error: '創建對話失敗: 記錄不存在', details: error.message },
          { status: 404 }
        );
      }
    }
    
    return NextResponse.json(
      { error: '創建對話失敗', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // 從查詢參數獲取用戶ID
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: '缺少用戶ID參數' },
        { status: 400 }
      );
    }
    
    // 獲取用戶的所有對話
    const conversations = await prisma.conversation.findMany({
      where: {
        userId: parseInt(userId),
      },
      include: {
        scenario: {
          select: {
            title: true,
            description: true,
          },
        },
      },
      orderBy: {
        startedAt: 'desc',
      },
    });
    
    // 格式化返回數據
    const formattedConversations = conversations.map(conv => ({
      id: conv.id,
      title: conv.scenario?.title || `對話 #${conv.id}`,
      startedAt: conv.startedAt,
      endedAt: conv.endedAt,
      durationSec: conv.durationSec,
      score: conv.score,
      scenarioTitle: conv.scenario?.title || '未知場景',
    }));
    
    return NextResponse.json(formattedConversations);
  } catch (error) {
    console.error('獲取對話列表失敗:', error);
    return NextResponse.json(
      { error: '獲取對話列表失敗', details: (error as Error).message },
      { status: 500 }
    );
  }
}