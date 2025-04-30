import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { conversationId, messages } = await request.json();
    
    if (!conversationId) {
      return NextResponse.json(
        { error: '缺少對話ID' },
        { status: 400 }
      );
    }
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: '無效的反思訊息格式' },
        { status: 400 }
      );
    }
    
    // 將反思訊息序列化為 JSON 字符串
    const reflectionJson = JSON.stringify(messages);
    
    // 更新對話的反思內容
    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: { reflection: reflectionJson },
    });
    
    return NextResponse.json({
      success: true,
      message: '反思已保存',
      conversationId: updatedConversation.id,
    });
  } catch (error) {
    console.error('保存反思錯誤:', error);
    return NextResponse.json(
      { error: '保存反思失敗' },
      { status: 500 }
    );
  }
} 