import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 指定使用 Node.js 運行時
export const runtime = 'nodejs';

// 添加动态配置
export const dynamic = 'force-dynamic';

// 定义 Props 类型
type Props = {
  params: {
    id: string
  }
};

// 獲取特定對話的所有訊息
export async function GET(
  request: NextRequest,
  context: any
) {
  try {
    // 终极解决方案：使用 await 直接获取 id
    const id = context.params.id;
    const conversationId = parseInt(id);
    
    if (isNaN(conversationId)) {
      return NextResponse.json(
        { error: '無效的對話 ID' },
        { status: 400 }
      );
    }
    
    // 檢查對話是否存在
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    
    if (!conversation) {
      return NextResponse.json(
        { error: '找不到指定的對話' },
        { status: 404 }
      );
    }
    
    // 獲取對話訊息
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'asc' },
      select: {
        id: true,
        sender: true,
        text: true,
        timestamp: true,
        elapsedSeconds: true,
        delayFromPrev: true,
        isDelayed: true,
        tag: true,
        audioUrl: true,
      }
    });
    
    return NextResponse.json(messages);
  } catch (error) {
    console.error('獲取對話訊息失敗:', error);
    return NextResponse.json(
      { error: '獲取對話訊息失敗', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// 為特定對話添加新訊息
// 規避警告
export async function POST(
  req: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = context.params;
  const conversationId = parseInt(id);
  
  if (isNaN(conversationId)) {
    return NextResponse.json(
      { error: '無效的對話 ID' },
      { status: 400 }
    );
  }
  
  const data = await req.json();
  
  // 檢查對話是否存在
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });
  
  if (!conversation) {
    return NextResponse.json(
      { error: '找不到指定的對話' },
      { status: 404 }
    );
  }
  try {
    // 🔍 解析 scoring codes，如 'A15,F10'
    let scoringItemRecords: { id: number }[] = [];
    if (data.scoringItem) {
      const scoringCodes = data.scoringItem.split(',').map((s: string) => s.trim());
      scoringItemRecords = await prisma.scoringItem.findMany({
        where: {
          code: {
            in: scoringCodes,
          },
        },
      });
    }
  
    // 建立新訊息 + 關聯 scoringItems
    const message = await prisma.message.create({
      data: {
        conversationId,
        sender: data.sender,
        text: data.content,
        timestamp: new Date(data.timestamp || Date.now()),
        elapsedSeconds: data.elapsedSeconds || 0,
        delayFromPrev: data.delayFromPrev || 0,
        isDelayed: data.isDelayed || false,
        tag: data.tag,
        audioUrl: data.audioUrl,
        scoringItems: {
          connect: scoringItemRecords.map(item => ({ id: item.id })),
        },
      },
      include: {
        scoringItems: true,
      },
    });
  
  return NextResponse.json({ success: true });
} catch (error) {
  console.error('新增訊息失敗:', error);
  return NextResponse.json(
    { error: '新增訊息失敗', details: (error as Error).message },
    { status: 500 }
  );
}
}