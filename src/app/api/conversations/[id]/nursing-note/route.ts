import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { extractKeyTerms } from '@/lib/noteAnalysis';

const prisma = new PrismaClient();

// 获取护理记录
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = parseInt(params.id);
    
    if (isNaN(conversationId)) {
      return NextResponse.json(
        { error: '无效的对话ID' },
        { status: 400 }
      );
    }
    
    // 查询现有的护理记录
    const nursingNote = await prisma.nursingCaseNote.findUnique({
      where: {
        conversationId: conversationId,
      },
    });
    
    if (!nursingNote) {
      return NextResponse.json(
        { error: '未找到护理记录' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(nursingNote);
  } catch (error) {
    console.error('获取护理记录失败:', error);
    return NextResponse.json(
      { error: '获取护理记录失败' },
      { status: 500 }
    );
  }
}

// 创建或更新护理记录
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conversationId = parseInt(params.id);
    
    if (isNaN(conversationId)) {
      return NextResponse.json(
        { error: '无效的对话ID' },
        { status: 400 }
      );
    }
    
    const { rawText } = await request.json();
    
    if (!rawText || typeof rawText !== 'string') {
      return NextResponse.json(
        { error: '护理记录内容不能为空' },
        { status: 400 }
      );
    }
    
    // 分析文本，提取关键术语
    const matchedCodes = await extractKeyTerms(rawText);
    
    // 查询是否已存在护理记录
    const existingNote = await prisma.nursingCaseNote.findUnique({
      where: {
        conversationId: conversationId,
      },
    });
    
    let nursingNote;
    
    if (existingNote) {
      // 更新现有记录
      nursingNote = await prisma.nursingCaseNote.update({
        where: {
          id: existingNote.id,
        },
        data: {
          rawText: rawText,
          matchedCodes: matchedCodes,
        },
      });
    } else {
      // 创建新记录
      nursingNote = await prisma.nursingCaseNote.create({
        data: {
          conversationId: conversationId,
          rawText: rawText,
          matchedCodes: matchedCodes,
        },
      });
    }
    
    return NextResponse.json(nursingNote);
  } catch (error) {
    console.error('保存护理记录失败:', error);
    return NextResponse.json(
      { error: '保存护理记录失败' },
      { status: 500 }
    );
  }
} 