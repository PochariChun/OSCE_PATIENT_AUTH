import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/jwt';

export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // 临时禁用身份验证，仅用于测试
    // const token = request.cookies.get('auth_token')?.value;
    // if (!token) {
    //   return NextResponse.json({ error: '未授權訪問' }, { status: 401 });
    // }
    
    // const payload = await verifyJWT(token);
    // if (!payload) {
    //   return NextResponse.json({ error: '無效的令牌' }, { status: 401 });
    // }
    
    // 临时使用请求参数中的用户ID
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    // 正確獲取 id 參數
    const conversationId = parseInt(context.params.id);
    if (isNaN(conversationId)) {
      return NextResponse.json({ error: '無效的對話ID' }, { status: 400 });
    }

    // 获取对话详情
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