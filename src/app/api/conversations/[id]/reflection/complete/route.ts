import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 添加動態配置
export const dynamic = 'force-dynamic';

// 完成反思
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
    const { userId } = data;
    
    // 檢查對話是否存在
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    
    if (!conversation) {
      return NextResponse.json(
        { error: '找不到指定的對話' },
        { status: 404 }
      );
    }
    
    // 檢查用戶權限
    if (userId && conversation.userId !== parseInt(userId)) {
      return NextResponse.json(
        { error: '您無權完成此對話的反思' },
        { status: 403 }
      );
    }
    
    // 獲取所有反思訊息
    const reflectionMessages = await prisma.reflectionMessage.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'asc' },
    });
    
    // 生成反思總結
    let reflectionSummary = '反思總結：\n\n';
    
    // 按阶段组织反思内容
    const stageMessages: Record<string, string[]> = {
      description: [],
      feelings: [],
      evaluation: [],
      analysis: [],
      conclusion: [],
      action: []
    };
    
    // 分类消息
    reflectionMessages.forEach(msg => {
      const stage = msg.sourceNodeId || msg.strategyTag;
      if (stage && Object.prototype.hasOwnProperty.call(stageMessages, stage) && msg.sender === 'user') {
        stageMessages[stage as keyof typeof stageMessages].push(msg.text);
      }
    });
    
    // 构建总结
    if (stageMessages.description.length > 0) {
      reflectionSummary += '描述階段：\n' + stageMessages.description.join('\n') + '\n\n';
    }
    
    if (stageMessages.feelings.length > 0) {
      reflectionSummary += '感受階段：\n' + stageMessages.feelings.join('\n') + '\n\n';
    }
    
    if (stageMessages.evaluation.length > 0) {
      reflectionSummary += '評價階段：\n' + stageMessages.evaluation.join('\n') + '\n\n';
    }
    
    if (stageMessages.analysis.length > 0) {
      reflectionSummary += '分析階段：\n' + stageMessages.analysis.join('\n') + '\n\n';
    }
    
    if (stageMessages.conclusion.length > 0) {
      reflectionSummary += '結論階段：\n' + stageMessages.conclusion.join('\n') + '\n\n';
    }
    
    if (stageMessages.action.length > 0) {
      reflectionSummary += '行動計劃：\n' + stageMessages.action.join('\n') + '\n\n';
    }
    
    // 更新對話的反思欄位
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { reflection: reflectionSummary },
    });
    
    return NextResponse.json({
      success: true,
      message: '反思已完成並保存',
      summary: reflectionSummary,
    });
  } catch (error) {
    console.error('完成反思失敗:', error);
    return NextResponse.json(
      { error: '完成反思失敗', details: (error as Error).message },
      { status: 500 }
    );
  }
} 