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
    // 正確使用動態參數
    const id = context.params.id;
    const conversationId = parseInt(id);
    
    if (isNaN(conversationId)) {
      return NextResponse.json(
        { error: '無效的對話 ID' },
        { status: 400 }
      );
    }
    
    // 獲取用戶 ID 參數
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: '缺少用戶 ID 參數' },
        { status: 400 }
      );
    }
    
    console.log(`獲取對話詳情: ID=${conversationId}, 用戶ID=${userId}`);
    
    // 查詢對話詳情
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: { 
          orderBy: {
            // 使用正確的欄位名稱進行排序，例如 timestamp 或 id
            timestamp: 'asc'
          }
        },
        scenario: true
      }
    });
    
    if (!conversation) {
      return NextResponse.json(
        { error: '找不到對話記錄' },
        { status: 404 }
      );
    }
    
    // 檢查用戶是否有權限訪問此對話
    if (conversation.userId !== parseInt(userId)) {
      return NextResponse.json(
        { error: '無權訪問此對話記錄' },
        { status: 403 }
      );
    }
    
    // 格式化返回數據
    const formattedConversation = {
      id: conversation.id,
      title: conversation.scenario ? conversation.scenario.title : '未命名對話',
      startedAt: conversation.startedAt.toISOString(),
      endedAt: conversation.endedAt ? conversation.endedAt.toISOString() : null,
      score: conversation.score,
      durationSec: conversation.durationSec,
      overtime: conversation.overtime,
      scenarioTitle: conversation.scenario ? conversation.scenario.title : '',
      scenarioDescription: conversation.scenario ? conversation.scenario.description : '',
      messages: conversation.messages.map(msg => ({
        id: msg.id,
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text,
        timestamp: msg.timestamp.toISOString(),
        elapsedSeconds: msg.elapsedSeconds,
        delayFromPrev: msg.delayFromPrev
      })),
      reflection: conversation.reflection,
      reflections: [], // 如果有反思對話，可以在這裡添加
      feedback: conversation.feedback
    };
    
    return NextResponse.json(formattedConversation);
  } catch (error) {
    console.error('獲取對話詳情時發生錯誤:', error);
    return NextResponse.json(
      { error: '獲取對話詳情失敗', details: (error as Error).message },
      { status: 500 }
    );
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