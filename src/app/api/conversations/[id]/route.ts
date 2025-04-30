import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/jwt';

// 使用 dynamic 配置来解决参数问题
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params;
    const conversationId = parseInt(id as string);
    
    if (isNaN(conversationId)) {
      return NextResponse.json({ error: '無效的對話 ID' }, { status: 400 });
    }
    
    // 獲取 URL 參數中的用戶 ID
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');
    
    if (!userIdParam) {
      return NextResponse.json({ error: '缺少用戶 ID 參數' }, { status: 400 });
    }
    
    const userId = parseInt(userIdParam);
    
    if (isNaN(userId)) {
      return NextResponse.json({ error: '無效的用戶 ID' }, { status: 400 });
    }
    
    // 查詢對話詳情
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { orderIndex: 'asc' }
        },
        scenario: true
      }
    });
    
    if (!conversation) {
      return NextResponse.json({ error: '找不到指定的對話' }, { status: 404 });
    }
    
    // 檢查對話是否屬於請求的用戶
    if (conversation.userId !== userId) {
      return NextResponse.json({ error: '無權訪問此對話' }, { status: 403 });
    }
    
    // 返回對話詳情
    return NextResponse.json(conversation);
  } catch (error) {
    console.error('獲取對話詳情時發生錯誤:', error);
    return NextResponse.json({ error: '獲取對話詳情失敗' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    // 從 URL 路徑直接獲取 ID
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const idFromPath = pathParts[pathParts.length - 1];
    const conversationId = parseInt(idFromPath);
    
    if (isNaN(conversationId)) {
      return NextResponse.json({ error: '無效的對話ID' }, { status: 400 });
    }
    
    const body = await request.json();
    const { endedAt, durationSec, overtime } = body;
    
    // 更新會話
    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        endedAt: endedAt ? new Date(endedAt) : undefined,
        durationSec,
        overtime,
      },
    });
    
    return NextResponse.json(updatedConversation);
  } catch (error) {
    console.error('更新會話失敗:', error);
    return NextResponse.json({ error: '更新會話失敗', details: error }, { status: 500 });
  }
} 