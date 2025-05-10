// src/app/api/conversations/[id]/reflection/route.ts
// ✅ 整合 GPT 反思小卡片 + 自動判斷 Gibbs 階段 + 顯示未得分項目（Gibbs 第四階段）
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getScoringItemStatus } from '@/lib/scoring';
import type { ChatCompletionMessageParam } from 'openai/resources';
import { askGibbsAI } from '@/lib/askGibbsAI';

export const dynamic = 'force-dynamic';

// 獲取所有反思訊息
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const conversationId = searchParams.get('conversationId');

    const where: any = {};
    if (userId) {
      const conversations = await prisma.conversation.findMany({
        where: { userId: parseInt(userId) },
        select: { id: true },
      });
      const conversationIds = conversations.map(conv => conv.id);
      where.conversationId = { in: conversationIds };
    }
    if (conversationId) {
      where.conversationId = parseInt(conversationId);
    }

    const reflectionMessages = await prisma.reflectionMessage.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      include: {
        conversation: {
          select: {
            userId: true,
            scenario: { select: { title: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: reflectionMessages });
  } catch (error) {
    return NextResponse.json({ success: false, error: '獲取反思訊息失敗', details: (error as Error).message }, { status: 500 });
  }
}

// 建立新的反思訊息
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const conversationId = parseInt(params.id);
    if (isNaN(conversationId)) return NextResponse.json({ error: '無效的 conversation ID' }, { status: 400 });

    let body;
    try {
      body = await req.json();
    } catch (jsonError) {
      return NextResponse.json({ error: '無法解析 JSON', details: (jsonError as Error).message }, { status: 400 });
    }

    const { message, complete, currentStage } = body;
    if (complete) {
      return NextResponse.json({ response: '反思已標記為完成，謝謝你的努力！', gibbsStage: 'completed' });
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: { orderBy: { elapsedSeconds: 'asc' } },
        reflections: { orderBy: { timestamp: 'asc' } },
      }
    });
    if (!conversation) return NextResponse.json({ error: 'Conversation not found' });

    const { scoredItems, missedItems } = await getScoringItemStatus(conversationId);
    const scoredNonRecord = scoredItems.filter(item => item.category !== '紀錄');
    const missedNonRecord = missedItems.filter(item => item.category !== '紀錄');
    const scoredRecord = scoredItems.filter(item => item.category === '紀錄');
    const missedRecord = missedItems.filter(item => item.category === '紀錄');

    const scoredList = [...new Set(scoredNonRecord.map(item => `${item.category}_${item.subcategory}`))];
    const unscoredList = [...new Set(missedNonRecord.map(item => `${item.category}_${item.subcategory}`))];
    const recordedList = [...new Set(scoredRecord.map(item => `${item.category}_${item.subcategory}`))];
    const unrecordedList = [...new Set(missedRecord.map(item => `${item.category}_${item.subcategory}`))];

    const historyMessages: ChatCompletionMessageParam[] = conversation.reflections.map(r => ({
      role: r.sender === 'assistant' ? 'assistant' : 'user',
      content: r.text
    }));
    console.log('$scoredList.length', scoredList.length > 0 ? scoredList.map(i => `- ${i}`).join('\n') : '（無）');
    const systemPrompt = `
    你是一位親切的反思護理教育小幫手，語氣溫暖、輕鬆、有陪伴感。必要時可以用 emoji 增添情緒。
    學生剛完成的「小兒腸道護理評估」對話和活動中病人的觀察紀錄練習。
    請你使用以下四種資料，依照 Gibbs 六階段，逐步引導學生進行反思。

    ✅ 學生口頭提到並得分的項目：
    ${scoredList.length > 0 ? scoredList.map(i => `- ${i}`).join('\n') : '（無）'}

    ⚠️ 未提及且未得分的項目：
    ${unscoredList.length > 0 ? unscoredList.map(i => `- ${i}`).join('\n') : '（無）'}

    📝 書面補充提及的項目：
    ${recordedList.length > 0 ? recordedList.map(i => `- ${i}`).join('\n') : '（無）'}

    ❌ 書面未提及的項目：
    ${unrecordedList.length > 0 ? unrecordedList.map(i => `- ${i}`).join('\n') : '（無）'}

    請使用以下 JSON 格式回覆：
    {
      "reply": "根據學生回答, 寫出你對學生的下一步引導語句（語氣溫暖",
      "strategyTag": "Gibbs.X.階段"
    }`;

    let gptResponse: { reply: string; strategyTag: string } | null = null;
    let retryCount = 0;
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      { role: 'user', content: message }
    ];

    while (!gptResponse && retryCount < 2) {
      try {
        gptResponse = await askGibbsAI(messages, currentStage || 'Gibbs.1.描述');
      } catch (err: any) {
        retryCount++;
        if (retryCount >= 2) return NextResponse.json({ error: 'GPT 回傳出現問題', details: err.message }, { status: 500 });
      }
    }

    if (!gptResponse) return NextResponse.json({ error: 'GPT 回傳為 null，無法處理' }, { status: 500 });

    await prisma.reflectionMessage.createMany({
      data: [
        { conversationId, sender: 'user', text: message, timestamp: new Date(), elapsedSeconds: 0 },
        { conversationId, sender: 'assistant', text: gptResponse.reply, strategyTag: gptResponse.strategyTag, timestamp: new Date(), elapsedSeconds: 0 },
      ]
    });

    const result: any = { response: gptResponse.reply, gibbsStage: gptResponse.strategyTag };
    if (gptResponse.strategyTag === 'Gibbs.4.分析') {
      result.missedItems = missedItems.map(item => ({ id: item.id, category: item.category, subcategory: item.subcategory }));
    }

    return NextResponse.json(result);
  } catch (POSTError) {
    return NextResponse.json({ error: 'POST 失敗', details: (POSTError as Error).message }, { status: 400 });
  }
}
