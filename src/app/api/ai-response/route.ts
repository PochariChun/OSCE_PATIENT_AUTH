import { NextResponse, NextRequest } from 'next/server';
import fetch from 'node-fetch';
import { normalizeNames, preprocessText } from '@/lib/textUtils';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 調用嵌入式查詢API服務
async function queryEmbeddingService(query: string, history: any[] = [], clientPreviousTag: string | null = null): Promise<any> {
  try {
    // 使用環境變量獲取API地址，預設為本地地址
    const apiUrl = process.env.EMBEDDING_API_URL || 'http://localhost:5000/query';
    
    // 使用前端傳來的 previousTag，如果沒有則從歷史記錄中提取
    let previousTag = clientPreviousTag;
    if (!previousTag && history.length > 0) {
      const lastMessage = history[history.length - 1];
      if (lastMessage && lastMessage.tag) {
        const codeMatch = lastMessage.tag.match(/^([A-F]\d+)/);
        if (codeMatch) {
          previousTag = codeMatch[1].charAt(0); // 提取第一个字符作为标签
        }
      }
    }
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        query, 
        top_k: 3,
        previous_tag: previousTag, // 使用前端傳來的或從歷史記錄中提取的 previousTag
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

// 添加 getAIResponse 函数，使用温和的错误处理
async function getAIResponse(message: string, history: any[], scenario: any, results: any[]): Promise<{ response: string, tag?: string, audioUrl?: string }> {
  try {
    // 標準化名稱
    const normalizedMessage = normalizeNames(message);
    
    // 檢查是否是重複的問題
    const isRepeatedQuestion = history && history.length >= 4 && 
      history[history.length - 3].content.toLowerCase() === normalizedMessage.toLowerCase();
    
    if (isRepeatedQuestion) {
      // 如果是重複的問題，表示媽媽可能已經聽清楚了
      return { 
        response: '我現在聽清楚了。讓我想想...', 
        tag: undefined, 
        audioUrl: undefined 
      };
    }
    
    // 調用嵌入式查詢服務
    const results = await queryEmbeddingService(normalizedMessage, history);
    
    // 檢查是否有匹配結果
    if (results && results.length > 0) {
      const bestMatch = results[0];
      // 在返回結果前添加日誌
      console.log("bestMatch:", bestMatch);
      // 返回回复和标签
      return { 
        response: bestMatch.answer,
        tag: bestMatch.tag,
        audioUrl: bestMatch.audioUrl || findAudioUrlByCode(bestMatch.code)
      };
    }
    
    // 如果沒有找到匹配，返回預設回覆
    const defaultResponses = [
      '抱歉，我沒有聽清楚您說的話，能再說一次嗎？',
      '對不起，我剛才在照顧小威，您能再重複一次嗎？',
      '不好意思，我沒聽懂您的意思，能請您再說一次嗎？',
      '抱歉，我有點分心，您能再說一次嗎？',
      '對不起，我剛才沒聽清楚，請您再說一次好嗎？'
    ];
    
    return { 
      response: defaultResponses[Math.floor(Math.random() * defaultResponses.length)], 
      tag: undefined, 
      audioUrl: undefined 
    };
  } catch (error) {
    console.error('生成 AI 回覆時出錯:', error);
    return { 
      response: '抱歉，我現在無法回答您的問題。請稍後再試。', 
      tag: undefined, 
      audioUrl: undefined 
    };
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
    const { message, history, scenarioId, previousTag: clientPreviousTag } = await request.json();
    
    if (!message) {
      return NextResponse.json(
        { error: '缺少訊息內容' },
        { status: 400 }
      );
    }
    
    // 獲取場景信息
    const scenario = await prisma.scenario.findUnique({
      where: { id: Number(scenarioId) },
    });
    
    if (!scenario) {
      return NextResponse.json(
        { error: '找不到指定的場景' },
        { status: 404 }
      );
    }
    
    // 使用 preprocessText 处理用户消息
    const processedMessage = preprocessText(message);
    
    // 修改 queryEmbeddingService 調用，使用前端傳來的 previousTag
    const results = await queryEmbeddingService(processedMessage, history, clientPreviousTag);
    
    // 調用 AI 服務獲取回覆
    const { response: aiResponse, tag, audioUrl } = await getAIResponse(processedMessage, history, scenario, results);
    
    // 返回回复、标签和音频URL
    return NextResponse.json({ response: aiResponse, tag: tag, audioUrl: audioUrl });
  } catch (error) {
    console.error('AI 回覆服務錯誤:', error);
    return NextResponse.json(
      { error: '獲取 AI 回覆失敗', details: (error as Error).message },
      { status: 500 }
    );
  }
} 