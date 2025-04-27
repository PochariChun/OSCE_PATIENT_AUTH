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
    // 臨時禁用身份驗證，僅用於測試
    // const token = request.cookies.get('auth_token')?.value;
    // if (!token) {
    //   return NextResponse.json({ error: '未授權訪問' }, { status: 401 });
    // }
    
    // const payload = await verifyJWT(token);
    // if (!payload) {
    //   return NextResponse.json({ error: '無效的令牌' }, { status: 401 });
    // }
    
    // 臨時使用請求參數中的用戶ID
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    // 從 URL 路徑直接獲取 ID
    const pathParts = request.nextUrl.pathname.split('/');
    const idFromPath = pathParts[pathParts.length - 1];
    const conversationId = parseInt(idFromPath);
    
    if (isNaN(conversationId)) {
      return NextResponse.json({ error: '無效的對話ID' }, { status: 400 });
    }

    // 獲取對話詳情
    const conversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
        userId: userId ? parseInt(userId) : undefined,
      },
      include: {
        scenario: {
          select: {
            title: true,
            description: true,
          },
        },
        messages: {
          orderBy: {
            timestamp: 'asc',
          },
          select: {
            id: true,
            sender: true,
            text: true,
            timestamp: true,
            elapsedSeconds: true,
            delayFromPrev: true,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: '對話不存在' }, { status: 404 });
    }

    // 格式化返回數據
    return NextResponse.json({
      id: conversation.id,
      title: conversation.scenario?.title || `對話 #${conversation.id}`,
      startedAt: conversation.startedAt,
      endedAt: conversation.endedAt,
      score: conversation.score,
      durationSec: conversation.durationSec,
      overtime: conversation.overtime,
      scenarioTitle: conversation.scenario?.title || '未知場景',
      scenarioDescription: conversation.scenario?.description || '',
      messages: conversation.messages.map(msg => ({
        id: msg.id,
        role: msg.sender,
        content: msg.text,
        timestamp: msg.timestamp,
        elapsedSeconds: msg.elapsedSeconds,
        delayFromPrev: msg.delayFromPrev,
      })),
      feedback: conversation.reflection || null,
    });
  } catch (error) {
    console.error('獲取對話詳情失敗:', error);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
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