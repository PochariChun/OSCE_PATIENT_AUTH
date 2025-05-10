// src/app/api/conversations/[id]/nursing-note/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { extractKeyTermsBySegmentation } from '@/lib/noteAnalysis';
// import { extractKeyTermsByAI } from '@/lib/noteAnalysisai';

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

    // 辨識 matchedCodes
    const matchedResults = await extractKeyTermsBySegmentation(rawText);
    const matchedCodes = matchedResults.map((item: { code: string }) => item.code);
    console.log('[matchedCodes]', matchedCodes);
    const subcategory = matchedResults.map((item: { subcategory: string }) => item.subcategory);
    
    // 查詢每個 code 的對應分數
    const scoringItems = await prisma.scoringItem.findMany({
      where: { code: { in: matchedCodes } },
      select: { code: true, score: true },
    });

    console.log('[scoringItems]', scoringItems);

    const totalScore = scoringItems.reduce((sum, item) => sum + item.score, 0);

    // 建立或更新護理紀錄
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

    // 查詢原始對話分數（避免覆蓋）
    const currentConversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { score: true },
    });

    console.log('[現在分數]currentConversation', currentConversation);
    const currentScore = currentConversation?.score ?? 0;
    const updatedTotalScore = currentScore + totalScore; // ← 原有 + 護理紀錄得分
    console.log('[更新後分數]updatedTotalScore', updatedTotalScore);


    // 👉 同步更新 conversation.score 欄位
    const updatedConversation = await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        score: updatedTotalScore,
      },
    });


    // 回傳 matchedCodes 與總得分
    return NextResponse.json({
      subcategory,
      // matchedCodes,
      totalScore,
      noteId: nursingNote.id,
      conversation: {
        id: updatedConversation.id,
        score: updatedConversation.score,
      },
    });


  } catch (error) {
    console.error('保存護理紀錄失敗:', error);
    return NextResponse.json(
      { error: '保存護理紀錄失敗', details: (error as Error).message },
      { status: 500 }
    );
  }
}
