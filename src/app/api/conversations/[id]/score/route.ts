import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 确保使用正确的 HTTP 方法函数声明
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const conversationId = parseInt(id as string);
    
    if (isNaN(conversationId)) {
      return NextResponse.json({ error: '無效的對話 ID' }, { status: 400 });
    }
    
    const requestData = await req.json();
    const { score } = requestData;
    
    if (typeof score !== 'number' || score < 0 || score > 100) {
      return NextResponse.json({ error: '分數必須是 0-100 之間的數字' }, { status: 400 });
    }
    
    // 更新對話分數
    const updatedConversation = await prisma.conversation.update({
      where: {
        id: conversationId
      },
      data: { score }
    });
    
    return NextResponse.json(updatedConversation);
  } catch (error) {
    console.error('更新對話分數時發生錯誤:', error);
    return NextResponse.json({ error: '更新分數失敗' }, { status: 500 });
  }
} 