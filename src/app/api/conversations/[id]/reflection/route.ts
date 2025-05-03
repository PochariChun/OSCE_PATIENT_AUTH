import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 添加動態配置
export const dynamic = 'force-dynamic';

// 獲取對話的反思消息
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // 正確使用動態參數 - 使用 await
    const { params: { id } } = await context;
    const conversationId = parseInt(id);
    console.log('[reflection] conversationId', conversationId);

    if (isNaN(conversationId)) {
      return NextResponse.json(
        { error: '無效的對話 ID' },
        { status: 400 }
      );
    }
    
    // 检查对话是否存在
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    
    if (!conversation) {
      return NextResponse.json(
        { error: '找不到指定的對話' },
        { status: 404 }
      );
    }
    
    // 获取反思消息
    const reflectionMessages = await prisma.reflectionMessage.findMany({
      where: { conversationId },
      orderBy: { id: 'asc' },
    });
    
    if (reflectionMessages.length === 0) {
      return NextResponse.json(
        { error: '此對話尚未有反思記錄' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      conversationId,
      messages: reflectionMessages,
    });
  } catch (error) {
    console.error('獲取反思消息失敗:', error);
    return NextResponse.json(
      { error: '獲取反思消息失敗', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// 添加新的反思消息
export async function POST(
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
    const { userId, message, currentStage } = data;
    
    if (!message) {
      return NextResponse.json(
        { error: '消息內容不能為空' },
        { status: 400 }
      );
    }
    
    // 检查对话是否存在
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    
    if (!conversation) {
      return NextResponse.json(
        { error: '找不到指定的對話' },
        { status: 404 }
      );
    }
    
    // 检查用户权限
    if (userId && conversation.userId !== parseInt(userId)) {
      return NextResponse.json(
        { error: '您無權訪問此對話' },
        { status: 403 }
      );
    }
    
    // 保存用户消息
    await prisma.reflectionMessage.create({
      data: {
        conversationId,
        sender: 'user',
        text: message,
        timestamp: new Date(),
        sourceNodeId: currentStage,
      },
    });
    
    // 这里应该有生成AI回复的逻辑
    // 简化版本：根据当前阶段生成下一个阶段的提示
    let aiResponse = '';
    let nextStage = currentStage;
    
    // 根据当前阶段生成回复和下一阶段
    switch (currentStage) {
      case 'description':
        aiResponse = '感謝您的描述。接下來，請分享您在對話過程中的感受。您感到緊張、自信還是困惑？為什麼會有這些感受？';
        nextStage = 'feelings';
        break;
      case 'feelings':
        aiResponse = '謝謝您分享您的感受。現在，請評價這次對話中哪些方面做得好，哪些方面可以改進？';
        nextStage = 'evaluation';
        break;
      case 'evaluation':
        aiResponse = '很好的評價。接下來，請分析為什麼事情會這樣發展？有哪些因素影響了對話的進行？';
        nextStage = 'analysis';
        break;
      case 'analysis':
        aiResponse = '分析得很深入。根據您的分析，您從這次對話中學到了什麼？您能得出什麼結論？';
        nextStage = 'conclusion';
        break;
      case 'conclusion':
        aiResponse = '很好的總結。最後，如果將來再遇到類似情況，您會如何調整您的做法？請制定一個具體的行動計劃。';
        nextStage = 'action';
        break;
      case 'action':
        aiResponse = '非常感謝您完成了完整的反思過程。您的反思非常有價值，這將幫助您在未來的臨床實踐中不斷進步。您還有其他想法要補充嗎？';
        nextStage = 'completed';
        break;
      default:
        aiResponse = '謝謝您的反思。您還有其他想法嗎？';
        nextStage = 'completed';
    }
    
    // 保存AI回复
    await prisma.reflectionMessage.create({
      data: {
        conversationId,
        sender: 'assistant',
        text: aiResponse,
        timestamp: new Date(),
        strategyTag: nextStage,
      },
    });
    
    return NextResponse.json({
      response: aiResponse,
      gibbsStage: nextStage,
    });
  } catch (error) {
    console.error('處理反思消息失敗:', error);
    return NextResponse.json(
      { error: '處理反思消息失敗', details: (error as Error).message },
      { status: 500 }
    );
  }
} 