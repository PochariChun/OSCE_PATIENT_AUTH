import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 添加动态配置
export const dynamic = 'force-dynamic';

// 獲取所有反思訊息
export async function GET(request: NextRequest) {
  try {
    // 從查詢參數獲取用戶ID（可選）
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const conversationId = searchParams.get('conversationId');
    
    // 構建查詢條件
    const where: any = {};
    
    if (userId) {
      // 如果提供了用戶ID，先獲取該用戶的所有對話
      const conversations = await prisma.conversation.findMany({
        where: { userId: parseInt(userId) },
        select: { id: true },
      });
      
      const conversationIds = conversations.map(conv => conv.id);
      where.conversationId = { in: conversationIds };
    }
    
    if (conversationId) {
      where.conversationId = parseInt(conversationId);
    }
    
    // 獲取反思訊息
    const reflectionMessages = await prisma.reflectionMessage.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      include: {
        conversation: {
          select: {
            userId: true,
            scenario: {
              select: {
                title: true,
              },
            },
          },
        },
      },
    });
    
    return NextResponse.json(reflectionMessages);
  } catch (error) {
    console.error('獲取反思訊息失敗:', error);
    return NextResponse.json(
      { error: '獲取反思訊息失敗', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// 創建新的反思訊息
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // 驗證必要數據
    if (!data.conversationId || !data.sender || !data.text) {
      return NextResponse.json(
        { error: '缺少必要的數據' },
        { status: 400 }
      );
    }
    
    // 檢查對話是否存在
    const conversation = await prisma.conversation.findUnique({
      where: { id: parseInt(data.conversationId) },
    });
    
    if (!conversation) {
      return NextResponse.json(
        { error: '找不到指定的對話' },
        { status: 404 }
      );
    }
    
    // 創建反思訊息
    const reflectionMessage = await prisma.reflectionMessage.create({
      data: {
        conversationId: parseInt(data.conversationId),
        sender: data.sender,
        text: data.text,
        timestamp: new Date(),
        sourceNodeId: data.sourceNodeId || null,
        strategyTag: data.strategyTag || null,
      },
    });
    
    return NextResponse.json(reflectionMessage);
  } catch (error) {
    console.error('創建反思訊息失敗:', error);
    return NextResponse.json(
      { error: '創建反思訊息失敗', details: (error as Error).message },
      { status: 500 }
    );
  }
} 