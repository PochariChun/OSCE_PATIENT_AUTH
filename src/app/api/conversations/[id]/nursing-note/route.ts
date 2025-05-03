// src/app/api/conversations/[id]/nursing-note/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { extractKeyTerms } from '@/lib/noteAnalysis';
import { getCurrentUser } from '@/lib/auth';



// 獲取護理紀錄
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: '未登入或權限不足' }, { status: 401 });
    }

    const { id } = params;
    const conversationId = parseInt(id);

    if (isNaN(conversationId)) {
      return NextResponse.json(
        { error: '無效的 conversation ID' },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || conversation.userId !== currentUser.userId) {
      return NextResponse.json({ error: '無權限存取該對話' }, { status: 403 });
    }

    const nursingNote = await prisma.nursingCaseNote.findUnique({
      where: { conversationId },
    });

    if (!nursingNote) {
      return NextResponse.json({ exists: false }, { status: 200 });
    }

    return NextResponse.json(nursingNote);
  } catch (error) {
    console.error('獲取護理紀錄失敗:', error);
    return NextResponse.json(
      { error: '獲取護理紀錄失敗' },
      { status: 500 }
    );
  }
}
  

// 建立或更新護理紀錄
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: '未登入或權限不足' }, { status: 401 });
    }

    const conversationId = parseInt(params.id);
    
    if (isNaN(conversationId)) {
      return NextResponse.json(
        { error: '無效的 conversation ID' },
        { status: 400 }
      );
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation || conversation.userId !== currentUser.userId) {
      return NextResponse.json({ error: '無權限存取該對話' }, { status: 403 });
    }

    const { rawText } = await request.json();
    
    if (!rawText || typeof rawText !== 'string') {
      return NextResponse.json(
        { error: '護理紀錄内容不能是空的' },
        { status: 400 }
      );
    }

    const matchedCodes = await extractKeyTerms(rawText);

    const existingNote = await prisma.nursingCaseNote.findUnique({
      where: { conversationId },
    });

    const nursingNote = existingNote
      ? await prisma.nursingCaseNote.update({
          where: { id: existingNote.id },
          data: { rawText, matchedCodes },
        })
      : await prisma.nursingCaseNote.create({
          data: { conversationId, rawText, matchedCodes },
        });

    return NextResponse.json(nursingNote);
  } catch (error) {
    console.error('保存護理紀錄失敗:', error);
    return NextResponse.json(
      { error: '保存護理紀錄失敗' },
      { status: 500 }
    );
  }
}
