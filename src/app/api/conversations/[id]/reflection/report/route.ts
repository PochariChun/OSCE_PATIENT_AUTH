import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 添加动态配置
export const dynamic = 'force-dynamic';

// 生成反思報告
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const conversationId = parseInt(id);
    
    if (isNaN(conversationId)) {
      return NextResponse.json(
        { error: '無效的對話 ID' },
        { status: 400 }
      );
    }
    
    const data = await request.json();
    
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
    if (data.userId && conversation.userId !== parseInt(data.userId)) {
      return NextResponse.json(
        { error: '您無權為此對話生成報告' },
        { status: 403 }
      );
    }
    
    // 獲取所有反思訊息
    const reflectionMessages = await prisma.reflectionMessage.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'asc' },
    });
    
    if (reflectionMessages.length === 0) {
      return NextResponse.json(
        { error: '此對話尚未有反思記錄，無法生成報告' },
        { status: 400 }
      );
    }
    
    // 生成反思報告
    // 這裡可以添加調用 AI 服務生成報告的邏輯
    const report = generateReflectionReport(reflectionMessages);
    
    return NextResponse.json({
      report
    });
  } catch (error) {
    console.error('生成反思報告失敗:', error);
    return NextResponse.json(
      { error: '生成反思報告失敗', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// 生成反思報告的輔助函數
function generateReflectionReport(messages: any[]): string {
  // 這裡是一個簡單的示例，實際應用中可能需要更複雜的邏輯
  const userMessages = messages.filter(msg => msg.sender === 'user').map(msg => msg.text);
  
  if (userMessages.length === 0) {
    return '未提供足夠的反思內容。';
  }
  
  // 簡單地將用戶的反思訊息組合成報告
  const report = `
# 反思報告

## 描述
${userMessages.filter((_, i) => i % 6 === 0).join('\n\n')}

## 感受
${userMessages.filter((_, i) => i % 6 === 1).join('\n\n')}

## 評估
${userMessages.filter((_, i) => i % 6 === 2).join('\n\n')}

## 分析
${userMessages.filter((_, i) => i % 6 === 3).join('\n\n')}

## 結論
${userMessages.filter((_, i) => i % 6 === 4).join('\n\n')}

## 行動計劃
${userMessages.filter((_, i) => i % 6 === 5).join('\n\n')}
`;
  
  return report;
} 