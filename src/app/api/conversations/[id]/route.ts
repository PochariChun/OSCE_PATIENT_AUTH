import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/jwt';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 驗證用戶身份
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: '未授權訪問' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: '無效的令牌' }, { status: 401 });
    }

    const conversationId = parseInt(params.id);
    if (isNaN(conversationId)) {
      return NextResponse.json({ error: '無效的對話ID' }, { status: 400 });
    }

    // 獲取對話詳情
    const conversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
        userId: payload.id, // 確保只能查看自己的對話
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
            createdAt: 'asc',
          },
          select: {
            id: true,
            role: true,
            content: true,
            createdAt: true,
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
      title: conversation.title,
      startedAt: conversation.createdAt,
      endedAt: conversation.endedAt,
      score: conversation.score,
      durationSec: conversation.durationSec,
      overtime: conversation.overtime,
      scenarioTitle: conversation.scenario.title,
      scenarioDescription: conversation.scenario.description,
      messages: conversation.messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.createdAt,
      })),
      feedback: conversation.feedback,
    });
  } catch (error) {
    console.error('獲取對話詳情失敗:', error);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
} 