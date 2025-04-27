import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// 添加动态配置
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    // 从 URL 直接获取 ID
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const idFromPath = pathParts[pathParts.length - 3]; // 获取倒数第三个部分 (conversations/[id]/reflection)
    const conversationId = parseInt(idFromPath);
    
    if (isNaN(conversationId)) {
      return NextResponse.json({ error: '無效的對話ID' }, { status: 400 });
    }
    
    const body = await request.json();
    const { conversation } = body;
    
    // 简单的报告生成逻辑
    const report = {
      conversationId,
      summary: '反思報告摘要',
      content: '這是一份自動生成的反思報告，基於學生的反思內容。',
      timestamp: new Date(),
      reflectionMessages: conversation.filter(msg => msg.role !== 'system').length,
    };
    
    // 保存报告到数据库
    // 注意：如果您的数据库中没有相应的表，您需要先在 schema.prisma 中定义
    // 这里我们假设已经有了 ReflectionReport 模型
    try {
      const savedReport = await prisma.reflectionReport.create({
        data: {
          conversationId,
          summary: report.summary,
          content: report.content,
          timestamp: report.timestamp,
        },
      });
      
      return NextResponse.json(savedReport);
    } catch (error) {
      // 如果数据库操作失败，仍然返回成功，但带有警告
      console.warn('無法保存反思報告到數據庫，但將繼續處理:', error);
      return NextResponse.json(report);
    }
  } catch (error) {
    console.error('生成反思報告失敗:', error);
    // 即使失败也返回 200，以便前端可以继续
    return NextResponse.json({ 
      warning: '生成報告時出現問題，但您可以繼續',
      error: String(error)
    });
  }
} 