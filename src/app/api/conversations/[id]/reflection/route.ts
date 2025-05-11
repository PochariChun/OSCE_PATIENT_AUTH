// src/app/api/conversations/[id]/reflection/route.ts
// ✅ 整合 GPT 反思小卡片 + 自動判斷 Gibbs 階段 + 顯示未得分項目（Gibbs 第四階段）
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { ChatCompletionMessageParam } from 'openai/resources';
import { askGibbsAI } from '@/lib/askGibbsAI';
import { generateScoredItems } from '@/lib/scoringItems';

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


export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // ✅ 先取得資料
    const conversationId = parseInt(params.id);
    if (isNaN(conversationId)) return NextResponse.json({ error: '無效的 conversation ID' }, { status: 400 });

    const body = await req.json();
    let {
      message,
      complete,
      currentStage,
      userId,
      scoredList = [],
      unscoredList = [],
      recordedList = [],
      unrecordedList = []
    } = body;


    // 如果學生已經完成所有階段，則進行總結
    if (complete) {
      const historyMessages = await prisma.reflectionMessage.findMany({
        where: { conversationId },
        orderBy: { timestamp: 'asc' }
      });

      const feedbackPrompt = `你是一位護理反思的輔導者，請根據學生的整體反思歷程對其給出一段溫暖、鼓勵、具體的總結性評價，幫助學生記住這次經驗學到的事。請用口語化語氣，結尾可以加一句鼓勵話語。以下是學生的反思紀錄：\n${historyMessages.map(m => `${m.sender === 'user' ? '👩‍⚕️學生：' : '🤖AI：'}${m.text}`).join('\n')}`;

      const finalReply = await askGibbsAI([
        { role: 'system', content: feedbackPrompt }
      ], 'Gibbs.7.總結');

      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          feedback: finalReply.reply,
          reflectionCompleted: true,
          endedAt: new Date()
        }
      });

      return NextResponse.json({
        response: '反思已完成，感謝你的努力！',
        gibbsStage: 'completed',
        nextStage: 'completed', // ✅ 加這行！
        feedback: finalReply.reply
      });
      


    }


    // 新增這段：自動判斷四組清單（僅在 analysis 階段）
    let autoScoredList: string[] = [], autoUnscoredList: string[] = [], autoRecordedList: string[] = [], autoUnrecordedList: string[] = [];



    // 如果學生未完成所有階段，則進行下一階段
    const conversation = await prisma.conversation.findUnique({
      where: { id: parseInt(params.id) },
      include: {
        user: true,
        nursingCaseNote: true,
        reflections: { orderBy: { timestamp: 'asc' } },
        messages: {
          orderBy: { elapsedSeconds: 'asc' },
          include: { scoringItems: true } // ✅ 保留 scoringItems
        }
      },
    });

    if (!conversation) return NextResponse.json({ error: 'Conversation not found' });

    const historyMessages: ChatCompletionMessageParam[] = conversation.reflections.map(r => ({
      role: r.sender === 'assistant' ? 'assistant' : 'user',
      content: r.text
    }));

    // ✅ 再取得下一個反思階段
    const stageOrder = ['description', 'feelings', 'evaluation', 'analysis', 'conclusion', 'action'];
    function getNextGibbsStage(current: string): string {
      const idx = stageOrder.indexOf(current);
      return stageOrder[idx + 1] ?? 'completed';
    }

    const nextStage = getNextGibbsStage(currentStage);
    if (nextStage === 'analysis') {
      scoredList = autoScoredList;
      unscoredList = autoUnscoredList;
      recordedList = autoRecordedList;
      unrecordedList = autoUnrecordedList;
    }
    const stagePrompts: Record<string, string> = {
      description: `你是一位協助護理師反思他剛完成的"小兒腸道護理評估對話練習"的小幫手，語氣溫暖、給予學生多種正向的鼓勵, 必要時用少量 emoji 增添情緒
    
    請幫助學生開始 Gibbs 六階段反思的第一步,描述階段
    
    範例引導語：請你回想一下剛剛的練習中，你講了哪些內容呢？有沒有什麼你本來想講但忘了說的？
    
    鼓勵學生盡量說，不用擔心對錯，幫他整理回顧。`,
    
      feelings: `你是一位協助護理師反思他剛完成的"小兒腸道護理評估對話練習"的小幫手，語氣溫暖、給予學生多種正向的鼓勵, 必要時用少量 emoji 增添情緒，目前在 Gibbs 六階段反思模型的「感受階段」。
    
    請學生根據他剛練習的內容進行回顧，
    
    詢問學生這個他學習過程中的感受,
    
    是開心、緊張、疑惑，還是有點卡住？ 系統一直辨識不出來很生氣也可以講`,
    
      evaluation: `你是一位協助護理師反思他剛完成的"小兒腸道護理評估對話練習"的小幫手，語氣溫暖、給予學生多種正向的鼓勵, 必要時用少量 emoji 增添情緒，目前在 Gibbs 六階段反思模型的「評估階段」。
    
    請學生看畫面上出現的 "對話歷史紀錄", 根據系統顯示給他的對話練習和護理紀錄，來進行簡單的自我評估。
    
    可以詢問：
    - 哪些地方你覺得自己做得還不錯？
    - 有沒有什麼地方你發現可以再更好？
    
    學生可以在畫面上道他們自己的對話歷史紀錄和護理紀錄,請用具體步驟引導學生給予自己具體各步驟的評價。`,
    
      analysis: `你是一位協助護理師反思他剛完成的"小兒腸道護理評估對話練習"的小幫手，語氣溫暖、給予學生多種正向的鼓勵, 必要時用少量 emoji 增添情緒，目前在 Gibbs 六階段反思模型的「分析階段」。
    
    這位學生這次的評分結果如下：
    得分項目：\n${scoredList.join('\n') || '（無）'}
    未得分項目：\n${unscoredList.join('\n') || '（無）'}
    
    請學生看著這些資料思考：
    - 為什麼有些項目會忘記說，或沒說清楚呢？
    - 可能和情緒、時間壓力、準備程度有關？
    你幫他整理他哪些項目是弱點, 為什麼會忘記說的原因，讓他可以更清楚具體說出自己剛剛的表現。`,
    
      conclusion: `你是一位協助護理師反思他剛完成的"小兒腸道護理評估對話練習"的小幫手，語氣溫暖、給予學生多種正向的鼓勵, 必要時用少量 emoji 增添情緒，目前在 Gibbs 六階段反思模型的「結論階段」
    
    請根據剛剛的自我回顧、情緒分享、評估和分析，鼓勵學生自行總結他在這次練習的學習收穫：
    `,
    
      action: `你是一位協助護理師反思他剛完成的"小兒腸道護理評估對話練習"的小幫手，語氣溫暖、給予學生多種正向的鼓勵, 必要時用少量 emoji 增添情緒，目前在 Gibbs 六階段反思模型最後的「改善計畫階段」
    
    請協助學生根據前面五個階段的反思，給他具體步驟. 提出一個具體的改善策略或行動：
    
    可以是：
    - 下次準備什麼？
    - 遇到同樣情況時想怎麼做？
    - 有沒有想試試看的新做法？
    
    越具體越好，這會成為下次更進步的關鍵！`,
    
      completed: `你是一位總結反思的小幫手，語氣溫暖、給予學生多種正向的鼓勵, 必要時用 emoji 增添情緒，目前學生已完成 Gibbs 六階段的引導。
    
    請你根據學生完整的反思歷程，給出總結性的評語和回饋,
    
    回饋內容包括：
    - 具體指出學生這次學習活動的強項和弱項
    - 具體描述學生的學習策略, 以及系統建議下次臨場可以怎麼做
    - 具體推理出學生盲點
    - 具體推理出學生未來練習時可以注意那幾點讓他臨床練習可以更順利
    `
    };

    const systemPrompt = stagePrompts[nextStage] || '你是一位反思引導者，請幫助學生進行下一階段的反思。';

    if (nextStage === 'analysis'){
      const awardedMap: Record<string, { hitMessages: string[] }> = {};
      for (const msg of conversation.messages) {
        if (!msg.scoringItems) continue;
        for (const item of msg.scoringItems) {
          if (!awardedMap[item.code]) {
            awardedMap[item.code] = { hitMessages: [msg.text] };
          } else if (!awardedMap[item.code].hitMessages.includes(msg.text)) {
            awardedMap[item.code].hitMessages.push(msg.text);
          }
        }
      }
      const matchedCodes = conversation.nursingCaseNote?.matchedCodes || [];
      const scoredItems = generateScoredItems(awardedMap, matchedCodes);

      autoScoredList = scoredItems.filter(i => i.awarded && i.category !== '記錄').map(i => i.subcategory);
      autoUnscoredList = scoredItems.filter(i => !i.awarded && i.category !== '記錄').map(i => i.subcategory);
      autoRecordedList = scoredItems.filter(i => i.awarded && i.category === '記錄').map(i => i.subcategory);
      autoUnrecordedList = scoredItems.filter(i => !i.awarded && i.category === '記錄').map(i => i.subcategory);
    }



    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      { role: 'user', content: message }
    ];

    const gptResponse = await askGibbsAI(messages, `Gibbs.${nextStage}`);

    await prisma.reflectionMessage.createMany({
      data: [
        { conversationId, sender: 'user', text: message, timestamp: new Date(), elapsedSeconds: 0 },
        { conversationId, sender: 'assistant', text: gptResponse.reply, strategyTag: gptResponse.strategyTag, timestamp: new Date(), elapsedSeconds: 0 },
      ]
    });


    return NextResponse.json({
      response: gptResponse.reply,
      gibbsStage: nextStage,
      nextStage,
      scoredList: autoScoredList,
      unscoredList: autoUnscoredList,
      recordedList: autoRecordedList,
      unrecordedList: autoUnrecordedList,
    });
  } catch (POSTError) {
    return NextResponse.json({ error: 'POST 失敗', details: (POSTError as Error).message }, { status: 400 });
  }
}


