import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.log('收到創建對話請求:', data);
    
    // 驗證必要數據
    if (!data.userId || !data.scenarioId) {
      return NextResponse.json(
        { error: '缺少必要參數 (userId 或 scenarioId)' },
        { status: 400 }
      );
    }
    
    // 創建新對話
    const conversation = await prisma.conversation.create({
      data: {
        userId: data.userId,
        scenarioId: data.scenarioId,
        role: data.role || '考生',
        prompt: data.prompt || '開始對話',
        response: data.response || '請開始與虛擬病人對話',
        topic: data.topic || '一般對話',
        triggerType: data.triggerType || '系統',
        orderIndex: data.orderIndex || 0,
        startedAt: new Date(),
      },
    });
    
    console.log('對話創建成功:', conversation.id);
    
    return NextResponse.json({
      success: true,
      id: conversation.id,
      startedAt: conversation.startedAt
    });
  } catch (error) {
    console.error('創建對話失敗:', error);
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