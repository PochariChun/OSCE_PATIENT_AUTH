// src/app/api/conversations/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 添加動態配置
export const dynamic = 'force-dynamic';

// 獲取特定對話的詳細資訊
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // 獲取查詢參數
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    // 正確使用動態參數 - 使用 await
    const { params: { id } } = await context;
    const conversationId = parseInt(id);
    
    if (isNaN(conversationId)) {
      return NextResponse.json(
        { error: '無效的對話 ID' },
        { status: 400 }
      );
    }
    

    
    console.log(`獲取對話詳情: ID=${conversationId}, 用户ID=${userId}`);
    

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        scenario: {
          select: {
            title: true,
            description: true,
          },
        },
        messages: {
          orderBy: { elapsedSeconds: 'asc' },
          include: { scoringItems: true },
        },
        reflections: {
          orderBy: { timestamp: 'asc' },
        },
        nursingCaseNote: true, // ✅ 新增這個
      },
    });
    

    if (!conversation) {
      return NextResponse.json(
        { error: '找不到指定的對話' },
        { status: 404 }
      );
    }

    // 检查用户权限
    if (userId && conversation.userId !== parseInt(userId)) {
      console.warn(`用户 ${userId} 尝试访问不属于他的对话 ${conversationId}`);
      return NextResponse.json(
        { error: '您無權訪問此對話' },
        { status: 403 }
      );
    }

    // 格式化消息数据
    const formattedMessages = conversation.messages.map((msg, index, arr) => {
      // 计算与前一条消息的延迟时间
      // let delayFromPrev = null;
      // if (index > 0) {
      //   const prevMsg = arr[index - 1];
      //   delayFromPrev = Math.round((new Date(msg.timestamp).getTime() - new Date(prevMsg.timestamp).getTime()) / 1000);
      // }

      return {
        id: msg.id,
        role: msg.sender === 'patient' ? 'patient' : 'user',
        content: msg.text || '',
        timestamp: msg.timestamp.toISOString(),
        elapsedSeconds: msg.elapsedSeconds,
        delayFromPrev: msg.delayFromPrev,
        scoringItems: msg.scoringItems,
        isDelayed: msg.isDelayed,
        tag: msg.tag,
        audioUrl: msg.audioUrl,
      };
    });

    // 格式化反思数据
    const formattedReflections = conversation.reflections.map(reflection => ({
      id: reflection.id,
      sender: reflection.sender,
      text: reflection.text,
      timestamp: reflection.timestamp.toISOString(),
      sourceNodeId: reflection.sourceNodeId,
      strategyTag: reflection.strategyTag,
    }));

    // 构建响应数据
    // 整理所有得分項目
    const scoredItems = conversation.messages
    .flatMap(msg =>
      msg.scoringItems.map(item => ({
        category: item.category,
        subcategory: item.subcategory,
        code: item.code,
        score: item.score,
        awarded: true,
        hitMessage: msg.text || null,
      }))
    );
    const responseData = {
      id: conversation.id,
      title: conversation.scenario?.title || '未命名对话',
      startedAt: conversation.startedAt.toISOString(),
      endedAt: conversation.endedAt ? conversation.endedAt.toISOString() : null,
      score: conversation.score,
      durationSec: conversation.durationSec,
      overtime: conversation.overtime,
      scenarioTitle: conversation.scenario?.title || '',
      scenarioDescription: conversation.scenario?.description || '',
      messages: formattedMessages,
      feedback: conversation.reflections,
      reflections: formattedReflections,
      scoredItems: scoredItems,
      nursingCaseNote: conversation.nursingCaseNote
      ? { rawText: conversation.nursingCaseNote.rawText, matchedCodes: conversation.nursingCaseNote.matchedCodes }
      : null,
      fluency: conversation.fluency,
      };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('獲取對話詳情失敗:', error);
    return NextResponse.json(
      { error: '獲取對話詳情失敗', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// 更新對話資訊
export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { params: { id } } = await context;
    const conversationId = parseInt(id);
    
    if (isNaN(conversationId)) {
      return NextResponse.json(
        { error: '無效的對話 ID' },
        { status: 400 }
      );
    }
    
    const data = await request.json();
    
    // 檢查對話是否存在
    const existingConversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    
    if (!existingConversation) {
      return NextResponse.json(
        { error: '找不到指定的對話' },
        { status: 404 }
      );
    }
    
    // 更新對話
    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        endedAt: data.endedAt,
        durationSec: data.durationSec,
        score: data.score,
        overtime: data.overtime,
        reflections: data.reflections,
      },
    });
    
    return NextResponse.json(updatedConversation);
  } catch (error) {
    console.error('更新對話失敗:', error);
    return NextResponse.json(
      { error: '更新對話失敗', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// 刪除對話
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { params: { id } } = await context;
    const conversationId = parseInt(id);
    
    if (isNaN(conversationId)) {
      return NextResponse.json(
        { error: '無效的對話 ID' },
        { status: 400 }
      );
    }
    
    // 檢查對話是否存在
    const existingConversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    
    if (!existingConversation) {
      return NextResponse.json(
        { error: '找不到指定的對話' },
        { status: 404 }
      );
    }
    
    // 刪除對話
    await prisma.conversation.delete({
      where: { id: conversationId },
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('刪除對話失敗:', error);
    return NextResponse.json(
      { error: '刪除對話失敗', details: (error as Error).message },
      { status: 500 }
    );
  }
} 