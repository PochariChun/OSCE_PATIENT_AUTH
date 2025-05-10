import { NextResponse, NextRequest } from 'next/server';
import fetch from 'node-fetch';
import { normalizeNames, preprocessText } from '@/lib/textUtils';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 調用嵌入式查詢API服務
async function queryEmbeddingService(query: string, clientPreviousTag: string | null = null): Promise<any[]> {
  try {

    const apiUrl = process.env.EMBEDDING_API_URL || 'http://localhost:5000/query';
    // console.log('clientPreviousTag:',clientPreviousTag);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        query, 
        top_k: 5,
        previous_tag: clientPreviousTag, // 使用前端傳來的或從歷史記錄中提取的 previousTag
      }),
    });
    
    if (!response.ok) {
      console.error(`API 請求失敗: ${response.status} ${response.statusText}`);
      return []; // 返回空数组，而不是抛出错误
    }
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('查詢嵌入服務時出錯:', error);
    // 返回空數組而不是拋出錯誤，讓調用者可以處理失敗情況
    return [];
  }
}


// 根據代碼查找音頻URL
function findAudioUrlByCode(code: string): string | null {
  // 實現查找邏輯，例如從映射表中查找
  // 如果找不到，返回null
  return null;
}

// 修改 POST 處理函數，接收前端傳來的 previousTag
export async function POST(request: NextRequest) {
  try {
    const { message, scenarioId, previousTag } = await request.json();

    if (!message || !scenarioId) {
      return NextResponse.json({ error: '缺少 message 或 scenarioId' }, { status: 400 });
    }

    const scenario = await prisma.scenario.findUnique({ where: { id: Number(scenarioId) } });
    if (!scenario) {
      return NextResponse.json({ error: '找不到指定的場景' }, { status: 404 });
    }

    const processed = normalizeNames(preprocessText(message));
    const results = await queryEmbeddingService(processed, previousTag);

    const fallbackReplies = [
      {
        answer: '抱歉，我沒有聽清楚您說的話，能再說一次嗎？',
        audioUrl: '/audio/fallback_1.mp3'
      },
      {
        answer: '不好意思，能請您再重複一次嗎？',
        audioUrl: '/audio/fallback_2.mp3'
      },
      {
        answer: '對不起，我剛才沒聽清楚，請再說一次好嗎？',
        audioUrl: '/audio/fallback_3.mp3'
      }
    ];

    if (results.length > 0) {
      const best = results[0];
      if (best.score >= 0.5) {
        return NextResponse.json({
          response: best.answer,
          tag: best.tags,
          audioUrl: best.audioUrl || findAudioUrlByCode(best.code),
          code: best.code,
          answerType: best.answerType || null,
        });
      }
    }

    // fallback reply if no result or score too low
    const fallback = fallbackReplies[Math.floor(Math.random() * fallbackReplies.length)];
    return NextResponse.json({
      response: fallback.answer,
      tag: '',
      audioUrl: fallback.audioUrl,
      code: undefined,
      answerType: null,
    });

  } catch (err) {
    console.error('處理 AI 回覆時出錯:', err);
    return NextResponse.json({ error: '伺服器錯誤', details: (err as Error).message }, { status: 500 });
  }
}
