import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 添加动态配置
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // 从 URL 直接获取 ID
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const idFromPath = pathParts[pathParts.length - 2]; // 获取倒数第二个部分
    const conversationId = parseInt(idFromPath);
    
    if (isNaN(conversationId)) {
      return NextResponse.json({ error: '無效的對話ID' }, { status: 400 });
    }
    
    const body = await request.json();
    const { userMessage, aiResponse, stage, timestamp } = body;
    
    // 保存反思訊息
    const reflectionMessage = await prisma.reflectionMessage.create({
      data: {
        conversationId,
        userMessage,
        aiResponse,
        stage,
        timestamp: new Date(timestamp),
        sender: 'user', // 添加缺少的 sender 字段
      },
    });
    
    return NextResponse.json(reflectionMessage);
  } catch (error) {
    console.error('保存反思訊息失敗:', error);
    return NextResponse.json({ error: '保存反思訊息失敗', details: error }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // 从 URL 直接获取 ID
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const idFromPath = pathParts[pathParts.length - 2];
    const conversationId = parseInt(idFromPath);
    
    if (isNaN(conversationId)) {
      return NextResponse.json({ error: '無效的對話ID' }, { status: 400 });
    }
    
    // 獲取反思訊息
    const reflectionMessages = await prisma.reflectionMessage.findMany({
      where: {
        conversationId,
      },
      orderBy: {
        timestamp: 'asc',
      },
    });
    
    return NextResponse.json(reflectionMessages);
  } catch (error) {
    console.error('獲取反思訊息失敗:', error);
    return NextResponse.json({ error: '獲取反思訊息失敗' }, { status: 500 });
  }
} 